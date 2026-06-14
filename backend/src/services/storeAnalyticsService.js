const { Op } = require('sequelize');
const { StoreSession, StoreEvent } = require('../models');
const {
  parseDeviceType,
  classifyReferrerChannel,
  geoFromRequest,
  sanitizePath,
} = require('../utils/storeAnalyticsHelpers');

const ALLOWED_EVENTS = new Set(['page_view', 'add_to_cart', 'begin_checkout', 'purchase', 'search', 'product_click']);

function isValidSessionId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(id.trim());
}

async function upsertSession(req, payload) {
  const sessionId = payload.session_id.trim();
  const now = new Date();
  const geo = geoFromRequest(req);
  const device = parseDeviceType(req.headers['user-agent']);
  const userId = req.user?.id || null;

  let session = await StoreSession.findOne({ where: { session_id: sessionId } });
  if (!session) {
    session = await StoreSession.create({
      session_id: sessionId,
      user_id: userId,
      referrer: (payload.referrer || '').slice(0, 500) || null,
      utm_source: payload.utm_source?.slice(0, 100) || null,
      utm_medium: payload.utm_medium?.slice(0, 100) || null,
      utm_campaign: payload.utm_campaign?.slice(0, 100) || null,
      device_type: device,
      country: geo.country,
      city: payload.city?.slice(0, 80) || geo.city || null,
      landing_path: sanitizePath(payload.landing_path || payload.path),
      started_at: now,
      last_seen_at: now,
    });
    return session;
  }

  const updates = { last_seen_at: now };
  if (userId && !session.user_id) updates.user_id = userId;
  if (!session.country && geo.country) updates.country = geo.country;
  if (!session.referrer && payload.referrer) updates.referrer = payload.referrer.slice(0, 500);
  if (!session.utm_source && payload.utm_source) updates.utm_source = payload.utm_source.slice(0, 100);
  if (!session.utm_medium && payload.utm_medium) updates.utm_medium = payload.utm_medium.slice(0, 100);
  if (!session.utm_campaign && payload.utm_campaign) updates.utm_campaign = payload.utm_campaign.slice(0, 100);
  await session.update(updates);
  return session;
}

async function collectEvent(req, body) {
  const eventName = String(body.event || body.event_name || '').trim();
  if (!ALLOWED_EVENTS.has(eventName)) {
    const err = new Error('Invalid event');
    err.status = 400;
    throw err;
  }
  if (!isValidSessionId(body.session_id)) {
    const err = new Error('Invalid session_id');
    err.status = 400;
    throw err;
  }

  await upsertSession(req, body);

  await StoreEvent.create({
    session_id: body.session_id.trim(),
    event_name: eventName,
    path: sanitizePath(body.path),
    product_id: body.product_id ? parseInt(body.product_id, 10) || null : null,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
  });

  return { ok: true };
}

async function buildAttributionFromSession(sessionId) {
  if (!isValidSessionId(sessionId)) return null;
  const session = await StoreSession.findOne({ where: { session_id: sessionId.trim() } });
  if (!session) return null;
  const ch = classifyReferrerChannel(session);
  return {
    session_id: session.session_id,
    referrer: session.referrer,
    utm_source: session.utm_source,
    utm_medium: session.utm_medium,
    utm_campaign: session.utm_campaign,
    device_type: session.device_type,
    landing_path: session.landing_path,
    country: session.country,
    channel: ch.channel,
    channel_label: ch.label,
    social: ch.social || null,
  };
}

async function recordPurchaseEvent(sessionId, orderId, total) {
  if (!isValidSessionId(sessionId)) return;
  const exists = await StoreEvent.findOne({
    where: { session_id: sessionId.trim(), event_name: 'purchase' },
  });
  if (exists) return;
  await StoreEvent.create({
    session_id: sessionId.trim(),
    event_name: 'purchase',
    path: '/checkout',
    metadata: { order_id: orderId, total },
  });
}

module.exports = {
  collectEvent,
  buildAttributionFromSession,
  recordPurchaseEvent,
  isValidSessionId,
};
