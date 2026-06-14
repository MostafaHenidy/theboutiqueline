const { Op } = require('sequelize');
const { Setting } = require('../models');
const { sendEmailSafe } = require('./sendEmail');
const {
  DEFAULT_BRAND_EN,
  buildOrderStatusEmailHtml,
  orderEmailSubject,
  orderTrackingUrl,
  storefrontUrl,
  resolveOrderLocale,
} = require('./emailTemplate');

const STATUS_KEYS = {
  confirmed: 'email_notify_status_confirmed',
  processing: 'email_notify_status_processing',
  shipped: 'email_notify_status_shipped',
  delivered: 'email_notify_status_delivered',
  cancelled: 'email_notify_status_cancelled',
  refunded: 'email_notify_status_refunded',
};

const STATUS_COPY = {
  confirmed: {
    subject_ar: 'تم تأكيد طلبك',
    subject_en: 'Your order is confirmed',
    lead_ar: 'تم تأكيد طلبك وسنعالجه قريباً.',
    lead_en: 'Great news — your order is confirmed and we will process it shortly.',
  },
  processing: {
    subject_ar: 'طلبك قيد التجهيز',
    subject_en: 'Your order is being processed',
    lead_ar: 'فريقنا يجهّز منتجاتك للشحن.',
    lead_en: 'Our team is preparing your items for shipment.',
  },
  shipped: {
    subject_ar: 'تم شحن طلبك',
    subject_en: 'Your order has shipped',
    lead_ar: 'طرودك في الطريق إليك.',
    lead_en: 'Your package is on its way to you.',
  },
  delivered: {
    subject_ar: 'تم تسليم طلبك',
    subject_en: 'Your order was delivered',
    lead_ar: 'نأمل أن تستمتع بمشترياتك. شكراً لثقتك بنا!',
    lead_en: 'We hope you love your purchase. Thank you for shopping with us!',
  },
  cancelled: {
    subject_ar: 'تم إلغاء الطلب',
    subject_en: 'Your order has been cancelled',
    lead_ar: 'تم إلغاء هذا الطلب. إذا كان لديك استفسار، تواصل معنا.',
    lead_en: 'This order has been cancelled. Contact us if you have any questions.',
  },
  refunded: {
    subject_ar: 'تم استرداد المبلغ',
    subject_en: 'Your refund has been processed',
    lead_ar: 'تمت معالجة الاسترداد وفق آلية الدفع التي استخدمتها.',
    lead_en: 'Your refund has been processed according to your original payment method.',
  },
};

function buildMailSettingsMap(rows) {
  const map = {};
  for (const r of rows || []) map[r.key] = r.value;
  return map;
}

function isTruthy(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' && val !== 'false' && val !== '0';
}

/** @deprecated use buildOrderStatusEmailHtml from emailTemplate */
function buildProfessionalOrderEmailHtml(opts) {
  return buildOrderStatusEmailHtml(opts);
}

function parseAddressBlock(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Prefer email written on invoice / shipping payload; then guest/account. */
function normalizeInvoiceEmailCandidate(val) {
  const s = String(val ?? '').trim().toLowerCase();
  if (!s || !s.includes('@')) return '';
  return s;
}

function readAddrEmail(block) {
  if (!block || typeof block !== 'object') return '';
  return (
    normalizeInvoiceEmailCandidate(block.email) ||
    normalizeInvoiceEmailCandidate(block.contact_email) ||
    normalizeInvoiceEmailCandidate(block.customer_email)
  );
}

function resolveCustomerEmail(order, opts = {}) {
  if (!order) return '';

  const shippingObj = parseAddressBlock(order.shipping_address);
  const billingObj = parseAddressBlock(order.billing_address);

  const fromShipping = readAddrEmail(shippingObj);
  if (fromShipping) return fromShipping;

  const fromBilling = readAddrEmail(billingObj);
  if (fromBilling) return fromBilling;

  const guest = normalizeInvoiceEmailCandidate(order.guest_email);
  if (guest) return guest;

  const reqUserFallback = normalizeInvoiceEmailCandidate(opts.requestUser?.email);
  const profileEmail = normalizeInvoiceEmailCandidate(order.user?.email);
  const accountFallback = reqUserFallback || profileEmail;

  if (order.user_id && accountFallback) return accountFallback;

  return '';
}

async function loadNotificationPrefs() {
  const keys = [
    'email_notifications_enabled',
    'site_name',
    'site_name_ar',
    'email_from_name',
    ...Object.values(STATUS_KEYS),
  ];
  const rows = await Setting.findAll({ where: { key: { [Op.in]: keys } } });
  const map = buildMailSettingsMap(rows);

  let masterEnabled = true;
  const emRaw = map.email_notifications_enabled;
  if (emRaw !== undefined && emRaw !== null && String(emRaw).trim() !== '') {
    masterEnabled = isTruthy(emRaw);
  }

  return { map, masterEnabled };
}

function statusNotifyEnabled(status, map) {
  const settingKey = STATUS_KEYS[status];
  if (!settingKey) return false;
  const raw = map[settingKey];
  if (raw === undefined || raw === null || raw === '') {
    return status !== 'confirmed';
  }
  return isTruthy(raw);
}

/**
 * Sends professional bilingual status email if SMTP + toggles allow.
 * @returns {{ sent: boolean, skipped?: string }}
 */
async function notifyOrderStatusEmail(order, { previousStatus } = {}) {
  const newStatus = order?.status;
  if (!newStatus || newStatus === 'pending') {
    return { sent: false, skipped: 'pending_or_empty' };
  }
  if (previousStatus != null && String(previousStatus) === String(newStatus)) {
    return { sent: false, skipped: 'unchanged' };
  }

  const { map, masterEnabled } = await loadNotificationPrefs();
  if (!masterEnabled) {
    console.warn('[order-email] skipped master_off order=%s', order.order_number || order.id);
    return { sent: false, skipped: 'master_off' };
  }
  if (!statusNotifyEnabled(newStatus, map)) {
    console.warn('[order-email] skipped status_off status=%s order=%s', newStatus, order.order_number || order.id);
    return { sent: false, skipped: 'status_off' };
  }

  const to = resolveCustomerEmail(order);
  if (!to || !to.includes('@')) {
    console.warn(
      '[order-email] skipped no recipient for order #%s (no email on shipping/billing invoice, guest_email, or user profile)',
      order.order_number || order.id || '?',
    );
    return { sent: false, skipped: 'no_email' };
  }

  const copy = STATUS_COPY[newStatus];
  if (!copy) return { sent: false, skipped: 'unknown_status' };

  const brandName = map.email_from_name?.trim()
    || map.site_name?.trim()
    || DEFAULT_BRAND_EN;
  const locale = resolveOrderLocale(order);
  const trackingUrl = orderTrackingUrl(order, storefrontUrl(map));

  const html = buildOrderStatusEmailHtml({
    brandMap: map,
    order,
    status: newStatus,
    copy,
    trackingUrl,
    settingsMap: map,
  });

  const subject = orderEmailSubject(brandName, copy, order, locale);

  const { ok, message: smtpErr } = await sendEmailSafe({ to, subject, html });
  if (!ok) {
    return { sent: false, skipped: 'send_failed', ...(smtpErr ? { smtp_message: String(smtpErr).slice(0, 400) } : {}) };
  }
  return { sent: true };
}

module.exports = {
  notifyOrderStatusEmail,
  resolveCustomerEmail,
  normalizeInvoiceEmailCandidate,
  buildProfessionalOrderEmailHtml,
  STATUS_COPY,
};
