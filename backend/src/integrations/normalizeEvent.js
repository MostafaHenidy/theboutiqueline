const { v4: uuidv4 } = require('uuid');
const { defaultEventSourceUrl } = require('./constants');

/**
 * @typedef {object} NormalizedMarketingEvent
 * @property {string} event_name
 * @property {string} event_id dedupe handle shared with frontend pixels where possible
 * @property {number} event_time_unix
 * @property {string} [currency]
 * @property {number} [value]
 * @property {string[]} [product_ids]
 * @property {object[]} [contents] {product_id,id,sku,quantity,price,title,category}
 * @property {string} [order_id]
 * @property {string} [transaction_id]
 * @property {string} [search_query]
 * @property {object} [user] PII plaintext from our DB — hashed by platform adapters
 * @property {{client_ip_address?:string,client_user_agent?:string}} [browser]
 * @property {string} [event_source_url]
 * @property {string} [ga_client_id]
 * @property {string} [snap_advertiser_id]
 */

/**
 * Canonical shape consumed by adapters + logging.
 */
exports.normalizeEventInput = ({
  event_name,
  currency = 'EGP',
  value,
  product_ids,
  contents,
  order_id,
  transaction_id,
  search_query,
  user,
  browser,
  event_source_url,
  event_id,
  ga_client_id,
}) => ({
  event_name,
  event_id: event_id || uuidv4(),
  event_time_unix: Math.floor(Date.now() / 1000),
  currency,
  value: value != null ? Number(value) : undefined,
  product_ids,
  contents,
  order_id,
  transaction_id,
  search_query,
  user: user || undefined,
  browser: browser || undefined,
  event_source_url: event_source_url || defaultEventSourceUrl(),
  ga_client_id,
});

/** Express helper: extracts IP + UA for server-side match quality */
exports.browserFromExpressReq = (req) => ({
  client_ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim()
    || req.ip
    || req.socket?.remoteAddress
    || undefined,
  client_user_agent: req.headers['user-agent'] || undefined,
});
