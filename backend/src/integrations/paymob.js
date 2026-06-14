const crypto = require('crypto');
const { Op } = require('sequelize');
const { Setting } = require('../models');

const PAYMOB_SETTING_KEYS = [
  'payment_paymob',
  'paymob_api_key',
  'paymob_secret_key',
  'paymob_public_key',
  'paymob_integration_id',
  'paymob_iframe_id',
  'paymob_hmac_secret',
  'paymob_api_base',
];

const DEFAULT_API_BASE = 'https://accept.paymob.com/api';

function paymobOrigin(apiBase) {
  const raw = String(apiBase || DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  return raw.replace(/\/api$/, '') || 'https://accept.paymob.com';
}

async function loadPaymobConfig() {
  const rows = await Setting.findAll({ where: { key: { [Op.in]: PAYMOB_SETTING_KEYS } } });
  const map = {};
  for (const r of rows) map[r.key] = r.value;

  const enabled = map.payment_paymob !== 'false' && map.payment_paymob !== '0';
  const apiKey = String(map.paymob_api_key || process.env.PAYMOB_API_KEY || '').trim();
  const secretKey = String(map.paymob_secret_key || process.env.PAYMOB_SECRET_KEY || '').trim();
  const publicKey = String(map.paymob_public_key || process.env.PAYMOB_PUBLIC_KEY || '').trim();
  const integrationId = String(map.paymob_integration_id || process.env.PAYMOB_INTEGRATION_ID || '').trim();
  const iframeId = String(map.paymob_iframe_id || process.env.PAYMOB_IFRAME_ID || '').trim();
  const hmacSecret = String(map.paymob_hmac_secret || process.env.PAYMOB_HMAC_SECRET || '').trim();
  const apiBase = String(map.paymob_api_base || process.env.PAYMOB_API_BASE || DEFAULT_API_BASE).trim().replace(/\/+$/, '');

  const mode = secretKey && publicKey ? 'intention' : 'legacy';
  const configured = mode === 'intention'
    ? !!(secretKey && publicKey && integrationId)
    : !!(apiKey && integrationId && iframeId);

  return {
    enabled,
    mode,
    apiKey,
    secretKey,
    publicKey,
    integrationId,
    iframeId,
    hmacSecret,
    apiBase,
    origin: paymobOrigin(apiBase),
    configured,
  };
}

async function paymobFetch(path, body) {
  const cfg = await loadPaymobConfig();
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || res.statusText;
    throw new Error(typeof msg === 'string' ? msg : 'Paymob request failed');
  }
  return data;
}

function splitName(fullName) {
  const parts = String(fullName || 'Customer').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || 'Customer',
    last_name: parts.length > 1 ? parts.slice(1).join(' ') : 'User',
  };
}

function buildBillingData({ shipping, email, phone }) {
  const addr = shipping && typeof shipping === 'object' ? shipping : {};
  const { first_name, last_name } = splitName(addr.full_name);
  return {
    apartment: 'NA',
    email: String(email || addr.email || 'customer@example.com').trim(),
    floor: 'NA',
    first_name,
    street: String(addr.street || 'NA').trim() || 'NA',
    building: 'NA',
    phone_number: String(phone || addr.phone || '01000000000').trim(),
    shipping_method: 'PKG',
    postal_code: String(addr.postal_code || 'NA').trim() || 'NA',
    city: String(addr.city || 'Cairo').trim() || 'Cairo',
    country: String(addr.country || 'EG').trim() || 'EG',
    last_name,
    state: String(addr.district || addr.city || 'Cairo').trim() || 'Cairo',
  };
}

function buildIntentionItems(order, amountCents) {
  const lineItems = Array.isArray(order.items) ? order.items : [];
  if (lineItems.length) {
    const mapped = lineItems.map((item, idx) => {
      const lineTotal = Math.round(Number(item.total_price ?? (item.unit_price * item.quantity) ?? 0) * 100);
      const name = String(item.name_en || item.name_ar || `Item ${idx + 1}`).slice(0, 50);
      return {
        name,
        amount: lineTotal > 0 ? lineTotal : 1,
        description: name,
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      };
    });
    const sum = mapped.reduce((total, item) => total + Number(item.amount), 0);
    if (sum === amountCents) return mapped;
  }

  return [{
    name: `Order ${order.order_number}`,
    amount: amountCents,
    description: 'Store order',
    quantity: 1,
  }];
}

async function createIntentionCheckoutSession({ order, billingEmail, redirectUrl, notificationUrl }) {
  const cfg = await loadPaymobConfig();
  const amountCents = Math.round(Number(order.total) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Invalid order amount');

  const currency = String(order.currency || 'EGP').toUpperCase();
  const ship = order.shipping_address || order.billing_address || {};
  const billing = buildBillingData({
    shipping: ship,
    email: billingEmail || order.guest_email || ship.email,
    phone: ship.phone,
  });

  if (!cfg.integrationId) {
    throw new Error(
      'Paymob Integration ID is required. In Paymob dashboard go to Developers → Payment Integrations and copy the Card integration ID.',
    );
  }
  const paymentMethods = [Number(cfg.integrationId)];

  const body = {
    amount: amountCents,
    currency,
    payment_methods: paymentMethods,
    special_reference: String(order.order_number),
    billing_data: billing,
    items: buildIntentionItems(order, amountCents),
    ...(redirectUrl ? { redirection_url: redirectUrl } : {}),
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
  };

  const res = await fetch(`${cfg.origin}/v1/intention/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${cfg.secretKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || res.statusText;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(data) || 'Paymob intention failed');
  }

  const clientSecret = data.client_secret;
  if (!clientSecret) throw new Error('Paymob intention did not return a client secret');

  const iframeUrl = `${cfg.origin}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;

  return {
    iframe_url: iframeUrl,
    payment_token: clientSecret,
    paymob_order_id: data.id || data.intention_order_id || null,
  };
}

/**
 * Legacy Accept API: auth → order → payment key → iframe URL
 */
async function createLegacyCheckoutSession({ order, billingEmail, redirectUrl }) {
  const cfg = await loadPaymobConfig();
  const amountCents = Math.round(Number(order.total) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Invalid order amount');

  const currency = String(order.currency || 'EGP').toUpperCase();
  const auth = await paymobFetch('/auth/tokens', { api_key: cfg.apiKey });
  const authToken = auth.token;
  if (!authToken) throw new Error('Paymob authentication failed');

  const paymobOrder = await paymobFetch('/ecommerce/orders', {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency,
    merchant_order_id: String(order.order_number),
    items: [],
  });
  const paymobOrderId = paymobOrder.id;
  if (!paymobOrderId) throw new Error('Paymob order creation failed');

  const ship = order.shipping_address || order.billing_address || {};
  const billing = buildBillingData({
    shipping: ship,
    email: billingEmail || order.guest_email || ship.email,
    phone: ship.phone,
  });

  const paymentKey = await paymobFetch('/acceptance/payment_keys', {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: billing,
    currency,
    integration_id: Number(cfg.integrationId),
    lock_order_when_paid: false,
    ...(redirectUrl ? { redirection_url: redirectUrl } : {}),
  });

  const token = paymentKey.token;
  if (!token) throw new Error('Paymob payment key failed');

  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframeId}?payment_token=${encodeURIComponent(token)}`;

  return {
    iframe_url: iframeUrl,
    payment_token: token,
    paymob_order_id: paymobOrderId,
  };
}

async function createPaymobCheckoutSession({ order, billingEmail, redirectUrl, notificationUrl }) {
  const cfg = await loadPaymobConfig();
  if (!cfg.enabled) throw new Error('Paymob payments are disabled');
  if (!cfg.configured) {
    throw new Error(
      'Paymob is not configured. Modern flow: public key + secret key + integration ID. Legacy flow: API key + integration ID + iframe ID.',
    );
  }

  if (cfg.mode === 'intention') {
    return createIntentionCheckoutSession({ order, billingEmail, redirectUrl, notificationUrl });
  }
  return createLegacyCheckoutSession({ order, billingEmail, redirectUrl });
}

function verifyTransactionHmac(payload, hmacSecret) {
  if (!hmacSecret || !payload?.hmac) return false;
  const orderId = payload.order?.id ?? payload.order ?? '';
  const source = payload.source_data || {};
  const lex = [
    payload.amount_cents,
    payload.created_at,
    payload.currency,
    payload.error_occured,
    payload.has_parent_transaction,
    payload.id,
    payload.integration_id,
    payload.is_3d_secure,
    payload.is_auth,
    payload.is_capture,
    payload.is_refunded,
    payload.is_standalone_payment,
    payload.is_voided,
    orderId,
    payload.owner,
    payload.pending,
    source.pan,
    source.sub_type,
    source.type,
    payload.success,
  ].join('');

  const computed = crypto.createHmac('sha512', hmacSecret).update(lex).digest('hex');
  return computed === String(payload.hmac);
}

module.exports = {
  loadPaymobConfig,
  createPaymobCheckoutSession,
  verifyTransactionHmac,
  PAYMOB_SETTING_KEYS,
};
