const { postHttps } = require('../httpClient');
const { toSnapchatEventName, defaultEventSourceUrl } = require('../constants');
const { hashMetaSnapUserData } = require('../piiHash');

function buildSnapUserData(normalized) {
  const h = normalized.user ? hashMetaSnapUserData(normalized.user) : {};
  const user_data = {
    ...(h.em ? { hashed_email_sha256_array: typeof h.em === 'string' ? [h.em] : h.em } : {}),
    ...(h.ph ? { hashed_phone_number_sha256_array: typeof h.ph === 'string' ? [h.ph] : h.ph } : {}),
    ...(normalized.browser?.client_ip_address ? { client_ip_address: normalized.browser.client_ip_address } : {}),
    ...(normalized.browser?.client_user_agent ? { client_user_agent: normalized.browser.client_user_agent } : {}),
    ...(h.external_id?.length ? { external_id_sha256_array: Array.isArray(h.external_id) ? h.external_id : [h.external_id] } : {}),
  };

  /** sc_click_id equivalent from fbc parsed if present */
  if (normalized.user?.fbc) {
    /** optional: Snapchat may map click id from fbp/fbc schemas */
    user_data.click_id = normalized.user.fbc;
  }
  return user_data;
}

function snapCustom(normalized) {
  const cd = {};
  if (normalized.currency) cd.currency = normalized.currency;
  if (normalized.value != null) cd.value = String(Number(normalized.value).toFixed(2));
  if (normalized.order_id) cd.transaction_id = normalized.order_id;
  const ids = normalized.product_ids || normalized.contents?.map((c) => c.product_id || c.id).filter(Boolean);
  if (ids?.length) cd.item_ids = ids.map(String);

  /** Item-level detail */
  if (normalized.contents?.length) {
    cd.contents = normalized.contents.map((c) => ({
      id: String(c.product_id ?? c.id ?? c.sku ?? ''),
      quantity: c.quantity != null ? Number(c.quantity) : 1,
      item_price: c.price != null ? String(Number(c.price).toFixed(2)) : undefined,
      item_category: c.category,
      item_name: c.title,
    }));
  }
  return cd;
}

exports.sendSnapchatConversionEvent = async ({ pixelId, accessToken, normalized }) => {
  const event_name = toSnapchatEventName(normalized.event_name);
  /** Snapchat expects millis for some payloads; unix seconds documented too — official uses seconds for event_time key */
  const event_time_secs = normalized.event_time_unix;

  const event = {
    event_name,
    event_time: event_time_secs,
    event_id: normalized.event_id,
    action_source: 'WEB',
    event_source_url: normalized.event_source_url || defaultEventSourceUrl(),
    user_data: buildSnapUserData(normalized),
    custom_data: snapCustom(normalized),
    integration: 'CUSTOM',
    data_processing_options: [],
  };

  const url = `https://tr.snapchat.com/v3/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;

  const body = {
    pixel_id: pixelId,
    data: [event],
    /** Some Snap tenants require advertiser id — omitted unless provided in credentials */
    ...(normalized.snap_advertiser_id ? { advertiser_id: normalized.snap_advertiser_id } : {}),
  };

  const res = await postHttps({ url, bodyObj: body, timeoutMs: 25000 });

  let parsed = res.body;
  try { parsed = JSON.parse(res.body); } catch {}

  /** Snap returns status in JSON */
  if (parsed?.reason || parsed?.error || res.status >= 400) {
    const errMessage = parsed?.reason || parsed?.error || parsed?.message || `HTTP ${res.status}`;
    return { ok: false, status: res.status, parsed, error: typeof errMessage === 'string' ? errMessage : JSON.stringify(errMessage) };
  }

  const ok = res.status >= 200 && res.status < 300;

  return { ok, status: res.status, parsed, raw: res.body };
};
