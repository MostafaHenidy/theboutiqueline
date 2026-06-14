const { postHttps } = require('../httpClient');
const { META_GRAPH_VERSION, toMetaEventName, defaultEventSourceUrl } = require('../constants');
const { hashMetaSnapUserData } = require('../piiHash');

/** Build Meta-compliant user_data (hashed identifiers + plaintext IP / UA where allowed). */
function buildMetaUserData(normalized) {
  const base = normalized.user ? hashMetaSnapUserData(normalized.user) : {};

  /** Meta prefers arrays for em/ph */
  if (base.em && !Array.isArray(base.em)) base.em = [base.em.replace(/\s+/g, '')];
  if (base.ph && !Array.isArray(base.ph)) base.ph = [base.ph.replace(/\s+/g, '')];

  base.client_ip_address = normalized.browser?.client_ip_address;
  base.client_user_agent = normalized.browser?.client_user_agent;

  return base;
}

function buildContents(custom) {
  if (custom.contents?.length) {
    return custom.contents.map((c) => ({
      id: String(c.product_id ?? c.id ?? c.sku),
      quantity: c.quantity ?? 1,
      item_price: c.price != null ? Number(c.price) : undefined,
      title: c.title,
    }));
  }
  if (!custom.product_ids?.length) return undefined;
  return custom.product_ids.map((id) => ({ id: String(id), quantity: 1 }));
}

exports.sendMetaConversionEvent = async ({ pixelId, accessToken, testEventCode, testMode, normalized }) => {
  const metaName = toMetaEventName(normalized.event_name);
  const unix = normalized.event_time_unix;

  const custom_data = {};
  if (normalized.currency) custom_data.currency = normalized.currency;
  if (normalized.value != null) custom_data.value = Number(normalized.value);
  if (normalized.order_id) custom_data.order_id = normalized.order_id;
  if (normalized.search_query) custom_data.search_string = normalized.search_query;
  const contents = buildContents(normalized);
  if (contents) custom_data.contents = contents;

  const body = {
    data: [{
      event_name: metaName,
      event_time: unix,
      event_id: normalized.event_id,
      action_source: 'website',
      event_source_url: normalized.event_source_url || defaultEventSourceUrl(),
      user_data: buildMetaUserData(normalized),
      custom_data,
    }],
  };

  /** Test instrumentation */
  const code = testEventCode || normalized.test_event_code;
  if (testMode && code) body.test_event_code = code;

  const graphUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`);
  graphUrl.searchParams.set('access_token', accessToken);
  const url = graphUrl.toString();

  /** access_token goes in POST body already - Graph also accepts query param — body is canonical */
  const res = await postHttps({ url, bodyObj: body, timeoutMs: 25000 });

  let parsed = res.body;
  try { parsed = JSON.parse(res.body); } catch { /* keep raw string */ }

  const ok = res.status >= 200 && res.status < 300 && (!parsed.events_received || parsed.events_received >= 0);
  /** Graph returns errors in body with 400 */
  if (parsed?.error) {
    return {
      ok: false,
      status: res.status,
      parsed,
      error: parsed.error.message || 'Meta API error',
    };
  }

  return { ok, status: res.status, parsed, raw: res.body };
};
