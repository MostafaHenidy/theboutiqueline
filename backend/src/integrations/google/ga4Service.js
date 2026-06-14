const { postHttps } = require('../httpClient');
const { toGa4EventName } = require('../constants');
const crypto = require('crypto');
const { sha256Hex, normalizePhoneDigits } = require('../piiHash');

function stableClientId(seed) {
  const h = crypto.createHash('sha256').update(String(seed || 'anon')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function buildGaParams(normalized, testMode) {
  const name = toGa4EventName(normalized.event_name);
  const params = {};

  params.currency = normalized.currency || undefined;
  if (normalized.value != null) params.value = Number(normalized.value);
  if (normalized.transaction_id || normalized.order_id) params.transaction_id = normalized.transaction_id || normalized.order_id;
  if (normalized.search_query) params.search_term = normalized.search_query;

  if (normalized.contents?.length) {
    params.items = normalized.contents.map((c, idx) => ({
      item_id: String(c.product_id ?? c.id ?? c.sku ?? idx),
      item_name: c.title,
      price: c.price != null ? Number(c.price) : undefined,
      quantity: c.quantity != null ? Number(c.quantity) : 1,
    }));
  } else if (normalized.product_ids?.length) {
    params.items = normalized.product_ids.map((id, idx) => ({ item_id: String(id), quantity: 1, index: idx }));
  }

  if (testMode) params.debug_mode = 1;

  Object.keys(params).forEach((k) => { if (params[k] == null) delete params[k]; });

  return { name, params };
}

/** Sends a single ecommerce event via GA4 Measurement Protocol (server-side). */
exports.sendGa4MpEvent = async ({ measurementId, apiSecret, normalized, testMode }) => {
  if (!measurementId || !apiSecret) throw new Error('GA4 measurementId and apiSecret required');

  const client_id =
    normalized.ga_client_id
    || (normalized.user?.external_id ? stableClientId(normalized.user.external_id) : stableClientId(normalized.event_id));

  const { name, params } = buildGaParams(normalized, testMode);

  const body = {
    client_id,
    timestamp_micros: String(BigInt(normalized.event_time_unix) * 1000000n),
    non_personalized_ads: false,
    events: [{ name, params }],
  };

  if (normalized.user?.email || normalized.user?.phone) {
    body.user_data = {};
    if (normalized.user.email) body.user_data.sha256_email_address = [sha256Hex(normalized.user.email)];
    if (normalized.user.phone) body.user_data.sha256_phone_number = [sha256Hex(normalizePhoneDigits(normalized.user.phone))];
  }

  const qp = new URLSearchParams({ measurement_id: measurementId, api_secret: apiSecret });
  if (testMode) qp.append('debug_mode', '1');

  const url = `https://www.google-analytics.com/mp/collect?${qp.toString()}`;

  const res = await postHttps({ url, bodyObj: body, timeoutMs: 25000 });
  let parsed = {};
  try { parsed = res.body ? JSON.parse(res.body) : {}; } catch { parsed = { raw: res.body }; }

  if (parsed?.validationMessages?.length || res.status >= 400) {
    return {
      ok: false,
      status: res.status,
      parsed,
      error: parsed?.validationMessages?.map((m) => m.description || m.fieldPath).join('; ') || String(res.body || '').slice(0, 500),
    };
  }

  const ok = res.status === 204 || res.status === 200 || (!res.body && res.status >= 200 && res.status < 300);
  return { ok, status: res.status, parsed, raw: res.body };
};
