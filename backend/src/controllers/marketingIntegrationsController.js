const { Op } = require('sequelize');
const {
  MarketingIntegration,
  MarketingEventLog,
  MarketingFailedEvent,
  MarketingRetryQueue,
  MarketingBulkJob,
  Cart,
  CartItem,
  Product,
} = require('../models');
const { encryptJson, decryptJson } = require('../integrations/cryptoSecret');
const {
  probeIntegration,
  dispatchMarketingEventForProvider,
} = require('../integrations/marketingDispatcher');
const { normalizeEventInput, browserFromExpressReq } = require('../integrations/normalizeEvent');
const { resolveStorefrontBaseUrl } = require('../utils/storefrontUrl');
const { drainMarketingRetryQueueOnce } = require('../integrations/queueWorker');
const { runSendFullMarketingEventsJob } = require('../integrations/sendFullMarketingEventsJob');

async function seedIntegrationsIfMissing() {
  const providers = ['meta', 'snapchat', 'google'];
  await Promise.all(
    providers.map((provider) =>
      MarketingIntegration.findOrCreate({
        where: { provider },
        defaults: {
          provider,
          enabled: false,
          test_mode: false,
          connection_status: 'disconnected',
        },
      })),
  );
}

function tryDecryptCredentials(row) {
  if (!row?.encrypted_credentials || !row.iv || !row.auth_tag) return null;
  try {
    return decryptJson(row.encrypted_credentials, row.iv, row.auth_tag);
  } catch {
    return null;
  }
}

function mergeCredentials(provider, existing, incoming) {
  const out = { ...(existing || {}) };

  const set = (key) => {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) return;
    const v = incoming[key];
    if (v === undefined) return;
    if (typeof v === 'string' && v.trim() === '') delete out[key];
    else out[key] = typeof v === 'string' ? v.trim() : v;
  };

  if (provider === 'meta') {
    set('pixelId');
    set('accessToken');
    set('testEventCode');
  } else if (provider === 'snapchat') {
    set('pixelId');
    set('accessToken');
  } else if (provider === 'google') {
    set('measurementId');
    set('ga4MeasurementId');
    set('apiSecret');
    set('adsConversionId');
    set('adsConversionLabel');
    out.measurementId = out.measurementId || out.ga4MeasurementId;
  }

  return out;
}

function publicDisplay(provider, creds) {
  if (!creds) {
    return provider === 'meta'
      ? { pixelId: null, hasAccessToken: false, hasTestCode: false }
      : provider === 'snapchat'
        ? { pixelId: null, hasAccessToken: false }
        : {
            measurementId: null,
            hasApiSecret: false,
            adsConversionId: null,
            hasAdsLabel: false,
          };
  }
  if (provider === 'meta') {
    return {
      pixelId: creds.pixelId || null,
      hasAccessToken: !!creds.accessToken,
      hasTestCode: !!(creds.testEventCode && String(creds.testEventCode).trim()),
    };
  }
  if (provider === 'snapchat') {
    return {
      pixelId: creds.pixelId || null,
      hasAccessToken: !!creds.accessToken,
    };
  }
  const mid = creds.measurementId || creds.ga4MeasurementId || null;
  return {
    measurementId: mid,
    hasApiSecret: !!creds.apiSecret,
    adsConversionId: creds.adsConversionId || null,
    hasAdsLabel: !!(creds.adsConversionLabel && String(creds.adsConversionLabel).trim()),
  };
}

exports.getIntegrations = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const rows = await MarketingIntegration.findAll();

    const data = rows.map((row) => {
      const creds = tryDecryptCredentials(row);
      return {
        id: row.id,
        provider: row.provider,
        enabled: row.enabled,
        test_mode: row.test_mode,
        connection_status: row.connection_status,
        last_sync_at: row.last_sync_at,
        last_test_at: row.last_test_at,
        last_error: row.last_error,
        credentials: publicDisplay(row.provider, creds),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.putIntegration = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const { provider } = req.params;
    const { enabled, test_mode, credentials = {} } = req.body || {};

    const row = await MarketingIntegration.findOne({ where: { provider } });
    if (!row) return res.status(404).json({ success: false, message: 'Integration not found' });

    const existingPlain = tryDecryptCredentials(row);
    const nextPlain = mergeCredentials(provider, existingPlain || {}, credentials);

    if (provider === 'google') {
      nextPlain.measurementId = nextPlain.measurementId || nextPlain.ga4MeasurementId;
    }

    if (enabled === true) {
      if (provider === 'meta' && (!nextPlain.pixelId || !nextPlain.accessToken)) {
        return res.status(400).json({ success: false, message: 'Meta requires pixelId + accessToken before enabling.' });
      }
      if (provider === 'snapchat' && (!nextPlain.pixelId || !nextPlain.accessToken)) {
        return res.status(400).json({ success: false, message: 'Snapchat requires pixelId + accessToken before enabling.' });
      }
      if (provider === 'google' && (!(nextPlain.measurementId || nextPlain.ga4MeasurementId) || !nextPlain.apiSecret)) {
        return res.status(400).json({ success: false, message: 'Google requires Measurement ID + API secret before enabling.' });
      }
    }

    const touchedCred = credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0;
    const hasAnyValue = Object.values(nextPlain).some((v) => v != null && String(v).length > 0);

    const encPatch = {};
    if (touchedCred || hasAnyValue) {
      if (!process.env.MARKETING_ENCRYPTION_KEY) {
        return res.status(503).json({
          success: false,
          message: 'MARKETING_ENCRYPTION_KEY missing on server — generate with `openssl rand -hex 32`',
        });
      }
      const cipher = encryptJson(nextPlain);
      encPatch.encrypted_credentials = cipher.ciphertext;
      encPatch.iv = cipher.iv;
      encPatch.auth_tag = cipher.auth_tag;
    }

    const updates = {
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(typeof test_mode === 'boolean' ? { test_mode } : {}),
      ...encPatch,
    };

    if (updates.enabled === true) updates.connection_status = 'connected';

    await row.update(updates);
    await row.reload();

    res.json({
      success: true,
      message: 'Marketing integration saved',
      data: { provider: row.provider, enabled: row.enabled },
    });
  } catch (err) {
    if (String(err.message || '').includes('MARKETING_ENCRYPTION_KEY')) {
      return res.status(503).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.testIntegration = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const { provider } = req.params;
    const probe = await probeIntegration(provider);
    const row = await MarketingIntegration.findOne({ where: { provider } });

    if (probe?.skipped) {
      return res.json({ success: false, skipped: true, message: 'Integration disabled or missing', last_test_at: row?.last_test_at });
    }
    if (!probe.ok) {
      return res.status(422).json({
        success: false,
        message: probe.error || 'Test failed',
        last_test_at: row?.last_test_at,
      });
    }
    res.json({ success: true, message: 'Connection test OK', last_test_at: row?.last_test_at });
  } catch (err) {
    next(err);
  }
};

exports.dispatchSingleTestEvent = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const { provider } = req.params;
    const { event_name, currency, value, product_ids } = req.body;

    const normalized = normalizeEventInput({
      event_name,
      currency: currency || process.env.APP_CURRENCY_DEFAULT || 'EGP',
      value,
      product_ids,
      contents: [{
        product_id: 9001,
        quantity: 1,
        title: 'Test SKU',
        price: value ?? 59,
      }],
      browser: browserFromExpressReq(req),
      user: { external_id: `admin_tester_${req.user.id}` },
      event_source_url: resolveStorefrontBaseUrl() || '',
    });

    const outcome = await dispatchMarketingEventForProvider(provider, normalized, { enqueueRetry: false });

    if (outcome.skipped) {
      return res.status(409).json({ success: false, message: `Integration ${provider} not enabled.` });
    }
    if (!outcome.ok) {
      return res.status(422).json({
        success: false,
        message: outcome.error || 'Delivery failed',
        data: { event_id: normalized.event_id },
      });
    }

    res.json({ success: true, message: `Event dispatched to ${provider}`, data: { event_id: normalized.event_id } });
  } catch (err) {
    next(err);
  }
};

exports.sendFullEvents = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const exists = await MarketingIntegration.findOne({ where: { enabled: true } });
    if (!exists) return res.status(400).json({ success: false, message: 'Enable at least one integration first.' });

    if (!process.env.MARKETING_ENCRYPTION_KEY) {
      return res.status(503).json({ success: false, message: 'MARKETING_ENCRYPTION_KEY missing on server' });
    }

    const job = await MarketingBulkJob.create({ type: 'send_full_events', status: 'queued' });

    setImmediate(() => {
      runSendFullMarketingEventsJob(job.id).catch((err) => {
        MarketingBulkJob.update({
          status: 'failed',
          error: String(err.message),
          finished_at: new Date(),
        }, { where: { id: job.id } }).catch(console.error);
      });
    });

    res.status(202).json({
      success: true,
      message: 'Full marketing funnel job queued',
      data: { jobId: job.id },
    });
  } catch (err) {
    next(err);
  }
};

exports.getBulkJob = async (req, res, next) => {
  try {
    const row = await MarketingBulkJob.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Job missing' });
    const pct = row.total ? Math.round((100 * row.processed) / row.total) : 0;
    res.json({ success: true, data: row, progress: pct });
  } catch (err) {
    next(err);
  }
};

exports.getLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 40, 5), 200);
    const where = {};
    if (req.query.provider && req.query.provider !== 'all') {
      where.provider = req.query.provider;
    }

    const { count, rows } = await MarketingEventLog.findAndCountAll({
      where,
      attributes: ['id', 'marketing_integration_id', 'provider', 'event_name', 'event_id', 'status', 'http_status', 'error_message', 'created_at', 'response_body', 'request_payload'],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page, pages: Math.ceil(count / limit) || 1 },
    });
  } catch (err) {
    next(err);
  }
};

exports.getQueue = async (req, res, next) => {
  try {
    const rows = await MarketingRetryQueue.findAll({
      order: [['next_attempt_at', 'ASC']],
      limit: Number(req.query.limit) || 100,
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.drainRetryQueueManual = async (req, res, next) => {
  try {
    const out = await drainMarketingRetryQueueOnce(50);
    res.json({ success: true, message: 'Drain batch invoked', data: out });
  } catch (err) {
    next(err);
  }
};

exports.retryFailedManual = async (req, res, next) => {
  try {
    const failed = await MarketingFailedEvent.findAll({
      where: { resolved: false },
      limit: 50,
      order: [['updated_at', 'DESC']],
    });

    let spawned = 0;
    /** eslint-disable no-await-in-loop */
    for (const f of failed) {
      if (!f.payload) continue;
      let q = await MarketingRetryQueue.findOne({
        where: {
          provider: f.provider,
          event_id: f.event_id,
          marketing_integration_id: f.marketing_integration_id || null,
          status: { [Op.in]: ['pending', 'processing'] },
        },
      });
      if (!q) {
        q = await MarketingRetryQueue.create({
          provider: f.provider,
          marketing_integration_id: f.marketing_integration_id,
          marketing_failed_event_id: f.id,
          event_name: f.event_name,
          event_id: f.event_id,
          payload: f.payload,
          attempts: 0,
          max_attempts: 8,
          next_attempt_at: new Date(),
          status: 'pending',
        });
        spawned += 1;
      }
    }
    /** eslint-enable no-await-in-loop */

    res.json({ success: true, message: `Requeued up to ${spawned} failed events` });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const successEvents = await MarketingEventLog.count({ where: { status: 'success' } });
    const pendingEvents = await MarketingEventLog.count({ where: { status: 'pending' } });
    const failedEvents = await MarketingEventLog.count({ where: { status: 'failed' } });
    const queuePending = await MarketingRetryQueue.count({ where: { status: 'pending' } });
    const failedUnresolved = await MarketingFailedEvent.count({ where: { resolved: false } });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24Sent = await MarketingEventLog.count({
      where: { status: 'success', created_at: { [Op.gte]: dayAgo } },
    });

    const recent = await MarketingEventLog.findAll({
      where: { created_at: { [Op.gte]: dayAgo }, status: 'success' },
      attributes: ['event_name'],
      limit: 5000,
    });
    const map = {};
    recent.forEach((r) => { map[r.event_name] = (map[r.event_name] || 0) + 1; });
    const topEvents = Object.entries(map)
      .map(([event_name, count]) => ({ event_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    res.json({
      success: true,
      data: {
        logs: {
          success: successEvents,
          pending: pendingEvents,
          failed: failedEvents,
          sent_last_24h: last24Sent,
        },
        failed_unresolved: failedUnresolved,
        queue_pending: queuePending,
        analytics_24h: topEvents,
        roas_dashboard: {
          note: 'Connect Ads spend ingestion (Ads API/export) for ROAS. Server events send conversions only.',
          ad_spend: null,
          revenue_attributed_est: null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getDiagnostics = async (req, res, next) => {
  try {
    await seedIntegrationsIfMissing();
    const rows = await MarketingIntegration.findAll();

    const decryptionTests = {};
    rows.forEach((row) => {
      const creds = tryDecryptCredentials(row);
      decryptionTests[row.provider] = {
        ciphertext_present: !!(row.encrypted_credentials && row.iv && row.auth_tag),
        decryption_ok: !!creds || !row.encrypted_credentials,
      };
    });

    res.json({
      success: true,
      data: {
        encryption_env_configured: !!(process.env.MARKETING_ENCRYPTION_KEY && process.env.MARKETING_ENCRYPTION_KEY.replace(/\s+/g, '').length === 64),
        graph_version: process.env.META_GRAPH_VERSION || 'v21.0',
        frontend_url_configured: !!process.env.FRONTEND_URL,
        decryptionTests,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.pixelHealthPing = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        browser_server_dedup: 'Use matching event_id on pixel + CAPI for Meta/Snap; GA4 uses client_id + event params.',
        note: 'No outbound probe executed — avoids false negatives from sandbox egress policies.',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.webhookIngress = async (req, res, next) => {
  try {
    const secret = process.env.MARKETING_WEBHOOK_SECRET;
    if (secret && req.headers['x-marketing-hook-secret'] !== secret) {
      return res.status(401).json({ success: false, message: 'Invalid hook secret header' });
    }

    await MarketingEventLog.create({
      marketing_integration_id: null,
      provider: req.params.provider || 'webhook',
      event_name: 'WebhookIngress',
      event_id: `wh_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      status: 'success',
      request_payload: req.body,
    });

    res.json({ received: true, success: true });
  } catch (err) {
    next(err);
  }
};

exports.abandonedCartScan = async (req, res, next) => {
  try {
    const threshold = new Date(Date.now() - 120 * 60 * 1000);
    const limit = Number(req.body?.limit ?? 35);

    const carts = await Cart.findAll({
      limit,
      where: { updated_at: { [Op.lt]: threshold } },
      include: [
        {
          model: CartItem,
          as: 'items',
          required: true,
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'sale_price', 'price', 'name_ar', 'name_en'],
            required: false,
          }],
        },
      ],
    });

    let dispatched = 0;

    /** eslint-disable no-await-in-loop */
    for (const cart of carts) {
      if (!cart.items?.length) continue;

      const value = cart.items.reduce((total, ci) => {
        const raw = ci.product ? parseFloat(ci.product.sale_price || ci.product.price) : 0;
        return total + raw * ci.quantity;
      }, 0);

      const normalized = normalizeEventInput({
        event_name: 'InitiateCheckout',
        currency: process.env.APP_CURRENCY_DEFAULT || 'EGP',
        value,
        contents: cart.items.map((ci) => ({
          product_id: ci.product_id,
          quantity: ci.quantity,
          price: ci.product ? parseFloat(ci.product.sale_price || ci.product.price || 0) : 0,
          title: ci.product?.name_en || ci.product?.name_ar,
        })),
        user: cart.user_id ? { external_id: String(cart.user_id) } : undefined,
        browser: {},
      });

      await Promise.all([
        dispatchMarketingEventForProvider('meta', normalized, { enqueueRetry: true }),
        dispatchMarketingEventForProvider('snapchat', normalized, { enqueueRetry: true }),
        dispatchMarketingEventForProvider('google', normalized, { enqueueRetry: true }),
      ]);

      dispatched += 1;
      await Cart.update({ updated_at: new Date() }, { where: { id: cart.id } });
    }
    /** eslint-enable no-await-in-loop */

    res.json({
      success: true,
      data: { cartsEvaluated: carts.length, eventsDispatched: dispatched },
    });
  } catch (err) {
    next(err);
  }
};

function isMarketingSchemaMissing(err) {
  const code = err?.original?.code || err?.parent?.code;
  const msg = String(err?.message || err?.original?.sqlMessage || '');
  return code === 'ER_NO_SUCH_TABLE' || /marketing_integrations/i.test(msg);
}

exports.publicPixelBootstrap = async (req, res, next) => {
  const emptyBootstrap = { meta: null, snapchat: null, google: null };

  try {
    await seedIntegrationsIfMissing();
    const rows = await MarketingIntegration.findAll({ where: { enabled: true } });

    const bootstrap = { ...emptyBootstrap };

    rows.forEach((row) => {
      const creds = tryDecryptCredentials(row);
      if (!creds) return;
      if (row.provider === 'meta') {
        bootstrap.meta = { pixelId: creds.pixelId || null, testMode: !!row.test_mode };
      } else if (row.provider === 'snapchat') {
        bootstrap.snapchat = { pixelId: creds.pixelId || null };
      } else if (row.provider === 'google') {
        const mid = creds.measurementId || creds.ga4MeasurementId || null;
        bootstrap.google = {
          measurementId: mid,
          adsConversionSendTo:
            creds.adsConversionId && creds.adsConversionLabel
              ? `${creds.adsConversionId}/${creds.adsConversionLabel}`
              : null,
        };
      }
    });

    res.set('Cache-Control', 'public, max-age=120');
    res.json({ success: true, data: bootstrap });
  } catch (err) {
    if (isMarketingSchemaMissing(err)) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.json({ success: true, data: emptyBootstrap });
    }
    next(err);
  }
};
