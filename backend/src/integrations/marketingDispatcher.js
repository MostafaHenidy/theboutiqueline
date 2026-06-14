const { sendMetaConversionEvent } = require('./meta/metaService');
const { sendSnapchatConversionEvent } = require('./snapchat/snapchatService');
const { sendGa4MpEvent } = require('./google/ga4Service');
const { Op } = require('sequelize');
const {
  MarketingIntegration,
  MarketingEventLog,
  MarketingFailedEvent,
  MarketingRetryQueue,
} = require('../models');
const { resolveStorefrontBaseUrl } = require('../utils/storefrontUrl');

const BACKOFF_SECONDS = [30, 60, 120, 300, 600, 1200];

function safeSerializablePayload(normalized) {
  return JSON.parse(JSON.stringify(normalized || {}));
}

async function markIntegrationSync(row, hadError = false, errMsg = null) {
  if (!row?.id) return;
  await row.update({
    last_sync_at: new Date(),
    last_error: hadError ? errMsg?.slice?.(0, 1000) : null,
  });
}

async function enqueueRetry(provider, normalized, integrationId, failedEventId, lastErrorMsg) {
  const existing = await MarketingRetryQueue.findOne({
    where: {
      provider,
      event_id: normalized.event_id,
      marketing_integration_id: integrationId,
      status: { [Op.in]: ['pending', 'processing'] },
    },
  });
  if (existing) {
    await existing.update({ last_error: lastErrorMsg?.slice?.(0, 500) || lastErrorMsg });
    return existing;
  }

  await MarketingRetryQueue.create({
    provider,
    marketing_integration_id: integrationId || null,
    marketing_failed_event_id: failedEventId || null,
    event_name: normalized.event_name,
    event_id: normalized.event_id,
    payload: safeSerializablePayload(normalized),
    attempts: 0,
    next_attempt_at: new Date(Date.now() + BACKOFF_SECONDS[0] * 1000),
    status: 'pending',
    last_error: lastErrorMsg?.slice?.(0, 500),
  });
}

async function createFailedArtifacts({ provider, rowId, normalized, msg, logRecord, enqueueRetry: doRetry }) {
  const defaults = {
    event_name: normalized.event_name,
    payload: safeSerializablePayload(normalized),
    error_message: msg.slice(0, 2000),
    last_log_id: logRecord?.id || null,
    resolved: false,
    retries_count: 0,
  };

  let failed = await MarketingFailedEvent.findOne({
    where: { provider, marketing_integration_id: rowId, event_id: normalized.event_id, resolved: false },
  });

  if (failed) {
    await failed.update({
      error_message: msg.slice(0, 2000),
      last_log_id: logRecord?.id || null,
      retries_count: (failed.retries_count || 0) + 1,
    });
  } else {
    failed = await MarketingFailedEvent.create({
      provider,
      marketing_integration_id: rowId,
      event_name: normalized.event_name,
      event_id: normalized.event_id,
      ...defaults,
    });
  }

  const shouldRetry =
    doRetry !== false && !/^Missing or unreadable/.test(msg || '');

  if (shouldRetry) await enqueueRetry(provider, normalized, rowId, failed?.id || null, msg.slice(0, 900));

  const q = await MarketingRetryQueue.findOne({
    where: { provider, event_id: normalized.event_id, marketing_integration_id: rowId },
    order: [['id', 'DESC']],
  });
  if (q && failed?.id && !q.marketing_failed_event_id) await q.update({ marketing_failed_event_id: failed.id });
  if (q && failed?.id) await failed.update({ retries_count: q.attempts || 0 });
}

/**
 * Sends a normalized ecommerce event through a single marketing provider.
 */
exports.dispatchMarketingEventForProvider = async (provider, normalized, options = {}) => {
  const {
    enqueueRetry = true,
    skipPersistence = false,
    suppressFailureArtifacts = false,
  } = options;
  const row = await MarketingIntegration.findOne({ where: { provider } });
  if (!row?.enabled) {
    return { skipped: true, reason: 'disabled_or_missing' };
  }

  let creds = null;
  try {
    if (row.encrypted_credentials && row.iv && row.auth_tag) {
      const { decryptJson } = require('./cryptoSecret');
      creds = decryptJson(row.encrypted_credentials, row.iv, row.auth_tag);
    }
  } catch {
    creds = null;
  }

  const logRecord = skipPersistence ? null : await MarketingEventLog.create({
    marketing_integration_id: row.id,
    provider,
    event_name: normalized.event_name,
    event_id: normalized.event_id,
    status: 'pending',
    request_payload: safeSerializablePayload(normalized),
  });

  const failWith = async (msg) => {
    if (!skipPersistence && logRecord) {
      await logRecord.update({ status: 'failed', http_status: null, error_message: msg });
      if (enqueueRetry && !suppressFailureArtifacts) await createFailedArtifacts({
        provider, rowId: row.id, normalized, msg, logRecord, enqueueRetry,
      });
    }
    await markIntegrationSync(row, true, msg);
    return { ok: false, error: msg };
  };

  if (!creds) {
    return failWith('Missing or unreadable encrypted credentials — verify MARKETING_ENCRYPTION_KEY and saved secrets');
  }

  let result;
  try {
    if (provider === 'meta') {
      result = await sendMetaConversionEvent({
        pixelId: creds.pixelId,
        accessToken: creds.accessToken,
        testEventCode: creds.testEventCode,
        testMode: !!row.test_mode,
        normalized,
      });
    } else if (provider === 'snapchat') {
      result = await sendSnapchatConversionEvent({
        pixelId: creds.pixelId,
        accessToken: creds.accessToken,
        normalized,
      });
    } else if (provider === 'google') {
      result = await sendGa4MpEvent({
        measurementId: creds.measurementId || creds.ga4MeasurementId,
        apiSecret: creds.apiSecret,
        normalized,
        testMode: !!row.test_mode,
      });
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (apiErr) {
    const msg = apiErr.message || String(apiErr);
    if (!skipPersistence && logRecord) {
      await logRecord.update({ status: 'failed', error_message: msg });
      if (enqueueRetry && !suppressFailureArtifacts) {
        await createFailedArtifacts({
          provider, rowId: row.id, normalized, msg, logRecord, enqueueRetry,
        });
      }
    }
    await markIntegrationSync(row, true, msg);
    return { ok: false, error: msg };
  }

  if (!result?.ok) {
    const respStr = typeof result?.parsed !== 'undefined' ? JSON.stringify(result.parsed ?? {}) : String(result?.raw ?? '');
    const errMsg = result?.error || `HTTP ${result?.status} ${respStr.slice(0, 900)}`;

    if (!skipPersistence && logRecord) {
      await logRecord.update({
        status: 'failed',
        http_status: result.status,
        response_body: respStr.slice(0, 4000),
        error_message: errMsg,
      });
      if (enqueueRetry && !suppressFailureArtifacts) {
        await createFailedArtifacts({
          provider, rowId: row.id, normalized, msg: errMsg, logRecord, enqueueRetry,
        });
      }
    }
    await markIntegrationSync(row, true, errMsg);

    /** Soft rate-limit handling */
    if (result.status === 429 || /rate limit/i.test(errMsg || '')) {
      const lastRetry = await MarketingRetryQueue.findOne({
        where: { provider, event_id: normalized.event_id, marketing_integration_id: row.id },
        order: [['id', 'DESC']],
      });
      if (lastRetry) {
        await lastRetry.update({
          next_attempt_at: new Date(Date.now() + 15 * 60 * 1000),
          last_error: errMsg.slice(0, 500),
        });
      }
    }

    return { ok: false, error: errMsg };
  }

  if (!skipPersistence && logRecord) {
    await logRecord.update({
      status: 'success',
      http_status: result.status,
      response_body:
        typeof result.parsed !== 'undefined'
          ? JSON.stringify(result.parsed).slice(0, 4000)
          : String(result.raw || ''),
    });
  }

  /** Mark retries completed for matching dedupe id */
  await MarketingRetryQueue.update(
    { status: 'completed' },
    {
      where: {
        provider,
        event_id: normalized.event_id,
        marketing_integration_id: row.id,
        status: { [Op.in]: ['pending', 'processing'] },
      },
    },
  );

  await MarketingFailedEvent.update(
    { resolved: true },
    { where: { provider, event_id: normalized.event_id, marketing_integration_id: row.id } },
  );

  await row.update({
    connection_status: 'connected',
    last_sync_at: new Date(),
    last_error: null,
  });

  return { ok: true };
};

exports.dispatchToConnectedProviders = async (normalized, options = {}) => Promise.all([
  exports.dispatchMarketingEventForProvider('meta', normalized, options),
  exports.dispatchMarketingEventForProvider('snapchat', normalized, options),
  exports.dispatchMarketingEventForProvider('google', normalized, options),
]);

exports.probeIntegration = async (provider) => {
  const { normalizeEventInput } = require('./normalizeEvent');

  /** Synthetic PageView validates tokens without touching customer PII */
  const normalized = normalizeEventInput({
    event_name: 'PageView',
    currency: process.env.APP_CURRENCY_DEFAULT || 'EGP',
    user: {},
    browser: {},
    event_source_url: resolveStorefrontBaseUrl() || '',
    value: 0,
  });

  const res = await exports.dispatchMarketingEventForProvider(provider, normalized, {
    enqueueRetry: false,
    suppressFailureArtifacts: true,
  });

  /** Keep log as audit trail; mark skipped ok */
  if (res.skipped) return res;

  if (!res.ok) {
    const row = await MarketingIntegration.findOne({ where: { provider } });
    if (row) await row.update({ connection_status: 'error', last_test_at: new Date(), last_error: res.error?.slice?.(800) });
    return res;
  }

  const row = await MarketingIntegration.findOne({ where: { provider } });
  if (row) await row.update({ connection_status: 'connected', last_test_at: new Date(), last_error: null });
  return { ok: true };
};
