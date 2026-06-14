const { STANDARD_EVENTS } = require('./constants');
const { normalizeEventInput } = require('./normalizeEvent');
const { MarketingBulkJob } = require('../models');
const { dispatchMarketingEventForProvider } = require('./marketingDispatcher');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Validates credentials broadly and fans out STANDARD_EVENTS × enabled integrations.
 *
 * Detail array stores each send attempt for dashboards.
 *
 * @param {{ concurrencyDelayMs?: number }} opts
 */
exports.runSendFullMarketingEventsJob = async (jobRowId, opts = {}) => {
  const job = await MarketingBulkJob.findByPk(jobRowId);
  if (!job) return null;

  const delay = opts.concurrencyDelayMs ?? 80;

  /** Each standard event fires for each provider */
  const providers = ['meta', 'snapchat', 'google'];
  const combos = STANDARD_EVENTS.flatMap((eventName) => providers.map((provider) => ({ eventName, provider })));

  const detail = [];

  await job.update({
    status: 'running',
    total: combos.length,
    processed: 0,
    success_count: 0,
    fail_count: 0,
    detail: [],
    started_at: new Date(),
    error: null,
  });

  let ok = 0;
  let fail = 0;
  let step = 0;

  /** eslint-disable no-await-in-loop */
  for (const { eventName, provider } of combos) {
    const normalized = normalizeEventInput({
      event_name: eventName,
      currency: process.env.APP_CURRENCY_DEFAULT || 'EGP',
      value: Number((Math.random() * 149 + 1).toFixed(2)),
      user: {},
      contents: [{
        product_id: 1001,
        quantity: 1,
        price: 99,
        title: 'MISK_FULL_SYNC_DEMO_SKU',
      }],
      /** Shared dedupe ids per funnel step intentionally unique per combo */
      event_id: `${eventName}-${provider}-${jobRowId}-${Date.now()}-${step}`,
    });

    /** eslint-disable-next-line no-await-in-loop */
    const res = await dispatchMarketingEventForProvider(provider, normalized, { enqueueRetry: false });

    step += 1;
    const pushed = {
      idx: step,
      eventName,
      provider,
      ok: !!res.ok,
      skipped: !!res.skipped,
      message: res.error || null,
    };
    detail.push(pushed);

    if (res.ok) ok += 1;
    else if (!res.skipped) fail += 1;

    if (step % 5 === 0) {
      await job.update({
        processed: step,
        success_count: ok,
        fail_count: fail,
        detail,
      });
    }

    /** eslint-disable-next-line no-await-in-loop */
    await sleep(delay);
  }

  /** eslint-enable no-await-in-loop */

  await job.update({
    status: fail === combos.length ? 'failed' : 'completed',
    processed: combos.length,
    success_count: ok,
    fail_count: fail,
    detail,
    finished_at: new Date(),
    error: fail === combos.length ? 'All sends failed — verify integrations' : null,
  });

  return job;
};
