const { Op } = require('sequelize');
const { MarketingRetryQueue } = require('../models');
const dispatcher = require('./marketingDispatcher');

/** Exponential backoff table shared with enqueue path */
const BACKOFF_SECONDS = [30, 60, 120, 300, 600, 1200];

let lock = false;

async function drainBatch(limit = 20) {
  if (lock) return { processed: 0 };
  lock = true;
  let processed = 0;

  try {
    const pending = await MarketingRetryQueue.findAll({
      where: {
        status: 'pending',
        next_attempt_at: { [Op.lte]: new Date() },
      },
      order: [['next_attempt_at', 'ASC']],
      limit,
    });

    for (const item of pending) {
      processed += 1;
      const attemptNo = (item.attempts || 0) + 1;
      await item.update({ status: 'processing', attempts: attemptNo });
      /** eslint-disable-next-line no-await-in-loop */
      const result = await dispatcher.dispatchMarketingEventForProvider(item.provider, item.payload, {
        enqueueRetry: false /** manual retry bookkeeping below */,
      });

      if (result.skipped) {
        /** Provider disabled meanwhile — reschedule without burning attempts */
        await item.update({
          status: 'pending',
          attempts: Math.max(0, attemptNo - 1),
          next_attempt_at: new Date(Date.now() + 5 * 60 * 1000),
        });
        continue;
      }

      if (!result.ok) {
        if (attemptNo >= item.max_attempts) {
          await item.update({
            status: 'dead',
            attempts: attemptNo,
            last_error: result.error?.slice?.(0, 900) || result.error || 'failure',
          });
        } else {
          const backoff = BACKOFF_SECONDS[Math.min(attemptNo - 1, BACKOFF_SECONDS.length - 1)] * 1000;
          await item.update({
            status: 'pending',
            attempts: attemptNo,
            next_attempt_at: new Date(Date.now() + backoff),
            last_error: result.error?.slice?.(0, 900) || result.error || 'failure',
          });
        }
      } else {
        await item.update({ status: 'completed', attempts: attemptNo });
      }
    }

    return { processed };
  } finally {
    lock = false;
  }
}

/**
 * Background worker loop invoked from {@link bootstrapMarketingWorker}.
 */
exports.startMarketingRetryWorker = (intervalMs = 45000) => {
  setInterval(() => {
    drainBatch(25).catch((err) => console.error('[marketing-queue]', err.message));
  }, intervalMs).unref?.();

  /** Kick once shortly after boot */
  setTimeout(() => {
    drainBatch(25).catch((err) => console.error('[marketing-queue]', err.message));
  }, 3500).unref?.();

  console.log('[marketing-queue] ✅ Retry worker armed');
};

exports.drainMarketingRetryQueueOnce = drainBatch;
