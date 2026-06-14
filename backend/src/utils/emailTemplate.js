/** The Boutique Line — shared transactional email layout & builders */

const { resolveStorefrontBaseUrl } = require('./storefrontUrl');

const DEFAULT_BRAND_EN = 'The Boutique Line';
const DEFAULT_BRAND_AR = 'ذا بوتيك لاين';

/** Legacy rebrand — never surface old store name in customer emails */
const LEGACY_BRAND_EN = new Set(['miskwear', 'misk wear']);
const LEGACY_BRAND_AR = new Set(['مسك وير', 'مسك ویر']);

function isLegacyBrand(val) {
  const s = String(val || '').trim().toLowerCase();
  return !s || LEGACY_BRAND_EN.has(s);
}

function isLegacyBrandAr(val) {
  const s = String(val || '').trim();
  return !s || LEGACY_BRAND_AR.has(s) || LEGACY_BRAND_EN.has(s.toLowerCase());
}

function normalizeBrandEn(val) {
  return isLegacyBrand(val) ? DEFAULT_BRAND_EN : String(val).trim();
}

function normalizeBrandAr(val) {
  return isLegacyBrandAr(val) ? DEFAULT_BRAND_AR : String(val).trim();
}

function normalizeEmailLocale(locale) {
  const s = String(locale || '').trim().toLowerCase();
  return s === 'ar' || s.startsWith('ar') ? 'ar' : 'en';
}

function resolveOrderLocale(order) {
  return normalizeEmailLocale(order?.locale);
}

const C = {
  ink: '#0a0a0a',
  accent: '#eb301e',
  text: '#18181b',
  muted: '#71717a',
  bg: '#f4f4f5',
  card: '#ffffff',
  border: '#e4e4e7',
  soft: '#fafafa',
};

const COPY = {
  ar: {
    trackOrder: 'تتبع طلبك',
    footer: (brand) => `رسالة تلقائية من ${brand}. للمساعدة رد على هذا البريد أو تواصل معنا.`,
    orderLabel: 'رقم الطلب',
    totalLabel: 'الإجمالي',
    statusLabel: 'الحالة',
    trackingLabel: 'رقم التتبع',
    itemsLabel: 'المنتجات',
  },
  en: {
    trackOrder: 'Track your order',
    footer: (brand) => `Automated message from ${brand}. Reply or contact support for help.`,
    orderLabel: 'Order',
    totalLabel: 'Total',
    statusLabel: 'Status',
    trackingLabel: 'Tracking',
    itemsLabel: 'Items',
  },
};

const OTP_COPY = {
  ar: {
    headline: 'رمز التحقق',
    title: 'رمز التحقق الخاص بك',
    intro: 'استخدم الرمز التالي للتحقق من بريدك الإلكتروني:',
    expires: 'ينتهي خلال 10 دقائق',
    preview: (code) => `رمز التحقق — ${code}`,
    subject: (brand) => `${brand} — رمز التحقق`,
  },
  en: {
    headline: 'Verification code',
    title: 'Your verification code',
    intro: 'Use the code below to verify your email:',
    expires: 'Expires in 10 minutes',
    preview: (code) => `Verification code — ${code}`,
    subject: (brand) => `${brand} — Verification code`,
  },
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Prefer admin “from name”, then site name, then defaults (never legacy MiskWear) */
function resolveBrandLabels(opts = {}) {
  const { map = {}, fromName } = opts;
  const rawEn = fromName || map.email_from_name || map.site_name || DEFAULT_BRAND_EN;
  const rawAr = map.site_name_ar || rawEn || DEFAULT_BRAND_AR;
  const en = normalizeBrandEn(rawEn);
  const ar = normalizeBrandAr(rawAr);
  return { en, ar, display: ar || en };
}

function storefrontUrl(settingsMap) {
  return resolveStorefrontBaseUrl({ settingsMap }).replace(/\/+$/, '');
}

/** Customer order page on the storefront. */
function orderTrackingUrl(order, baseOverride) {
  const base = (baseOverride || storefrontUrl()).replace(/\/+$/, '');
  const id = order?.id;
  if (id != null && String(id).trim() !== '') {
    return `${base}/orders/${id}`;
  }
  return base;
}

/**
 * Email shell — dark header, crimson accent, mobile-friendly tables.
 * When `locale` is set, renders a single-language email aligned with the storefront.
 */
function wrapEmailLayout({
  brandEn,
  brandAr,
  headlineAr,
  headlineEn,
  bodyHtml,
  previewText,
  ctaUrl,
  ctaLabelAr = 'زيارة المتجر',
  ctaLabelEn = 'Visit store',
  locale,
}) {
  const bn = escapeHtml(brandEn);
  const bnAr = escapeHtml(brandAr || brandEn);
  const shop = escapeHtml(ctaUrl || '');
  const year = new Date().getFullYear();
  const singleLocale = locale === 'ar' || locale === 'en';
  const isAr = singleLocale ? locale === 'ar' : true;
  const lang = isAr ? 'ar' : 'en';
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';
  const ltrStyle = isAr ? '' : 'direction:ltr;';
  const copy = COPY[lang];

  const headline = singleLocale
    ? escapeHtml(isAr ? headlineAr : headlineEn)
    : '';
  const headlineBlock = singleLocale
    ? `<p style="margin:18px 0 0;font-size:15px;font-weight:600;color:#ffffff;line-height:1.4;${ltrStyle}">${headline}</p>`
    : `${headlineAr || headlineEn ? `
            <p style="margin:18px 0 0;font-size:15px;font-weight:600;color:#ffffff;line-height:1.4;">${escapeHtml(headlineAr || '')}</p>
            ${headlineEn ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);direction:ltr;">${escapeHtml(headlineEn)}</p>` : ''}` : ''}`;

  const ctaLabel = singleLocale
    ? escapeHtml(isAr ? ctaLabelAr : ctaLabelEn)
    : `${escapeHtml(ctaLabelAr)} · ${escapeHtml(ctaLabelEn)}`;

  const footerHtml = singleLocale
    ? `<p style="margin:28px 0 0;font-size:11px;color:${C.muted};line-height:1.55;text-align:center;border-top:1px solid ${C.border};padding-top:20px;${ltrStyle}">${escapeHtml(copy.footer(bnAr || bn))}</p>`
    : `<p style="margin:28px 0 0;font-size:11px;color:${C.muted};line-height:1.55;text-align:center;border-top:1px solid ${C.border};padding-top:20px;">
              رسالة تلقائية من ${bnAr}. للمساعدة رد على هذا البريد أو تواصل معنا.
              <span style="display:block;margin-top:6px;direction:ltr;">Automated message from ${bn}. Reply or contact support for help.</span>
            </p>`;

  const titleHeadline = singleLocale
    ? (isAr ? headlineAr : headlineEn)
    : (headlineAr || headlineEn);

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(titleHeadline)} — ${bn}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(previewText)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:${C.card};border-radius:4px;overflow:hidden;border:1px solid ${C.border};">
        <tr>
          <td style="background:${C.ink};padding:28px 32px;text-align:center;border-bottom:3px solid ${C.accent};">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.accent};">THE BOUTIQUE LINE</p>
            <p style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.02em;">${bnAr}</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55);direction:ltr;">${bn}</p>
            ${headlineBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 24px;color:${C.text};font-size:15px;line-height:1.6;text-align:${textAlign};${ltrStyle}">
            ${bodyHtml}
            ${shop ? `
            <p style="margin:28px 0 0;text-align:center;">
              <a href="${shop}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:14px 28px;border-radius:2px;">${ctaLabel}</a>
            </p>` : ''}
            ${footerHtml}
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:10px;color:#a1a1aa;text-align:center;letter-spacing:0.06em;">© ${year} ${bn}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOtpEmailHtml(otp, brand, locale = 'en') {
  const lang = normalizeEmailLocale(locale);
  const copy = OTP_COPY[lang];
  const { en, ar } = resolveBrandLabels({ fromName: brand });
  const body = `
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:${C.text};">${escapeHtml(copy.title)}</p>
    <p style="margin:0 0 24px;font-size:14px;color:${C.muted};">${escapeHtml(copy.intro)}</p>
    <div style="background:${C.ink};border-radius:4px;padding:24px;text-align:center;border-bottom:3px solid ${C.accent};">
      <span style="font-size:32px;font-weight:800;letter-spacing:0.35em;color:#ffffff;font-family:ui-monospace,monospace;direction:ltr;display:inline-block;">${escapeHtml(otp)}</span>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};text-align:center;">${escapeHtml(copy.expires)}</p>`;
  return wrapEmailLayout({
    brandEn: en,
    brandAr: ar,
    headlineAr: copy.headline,
    headlineEn: copy.headline,
    bodyHtml: body,
    previewText: copy.preview(otp),
    ctaUrl: null,
    locale: lang,
  });
}

function otpEmailSubject(brand, locale = 'en') {
  const lang = normalizeEmailLocale(locale);
  const { en } = resolveBrandLabels({ fromName: brand });
  return OTP_COPY[lang].subject(en);
}

function buildOrderReceivedEmailHtml(order, brandName, settingsMap) {
  const { en, ar } = resolveBrandLabels({ fromName: brandName });
  const locale = resolveOrderLocale(order);
  const copy = COPY[locale];
  const total = Number(order.total || 0).toFixed(2);
  const currency = escapeHtml(order.currency || 'EGP');
  const trackUrl = orderTrackingUrl(order, storefrontUrl(settingsMap));

  const body = locale === 'ar'
    ? `
    <p style="margin:0 0 22px;font-size:16px;font-weight:600;color:${C.text};">شكراً لطلبك — تم استلام طلبك بنجاح. سنرسل لك تحديثات عند تغيير الحالة.</p>
    <div style="background:${C.soft};border-radius:4px;padding:18px;border:1px solid ${C.border};">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.orderLabel}</td>
          <td style="font-size:15px;font-weight:700;color:${C.text};direction:ltr;text-align:end;padding:6px 0;">#${escapeHtml(order.order_number)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.totalLabel}</td>
          <td style="font-size:15px;font-weight:800;color:${C.accent};direction:ltr;text-align:end;padding:6px 0;">${escapeHtml(total)} ${currency}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.statusLabel}</td>
          <td style="font-size:14px;font-weight:600;color:${C.text};direction:ltr;text-align:end;padding:6px 0;text-transform:capitalize;">${escapeHtml(order.status)}</td>
        </tr>
      </table>
    </div>`
    : `
    <p style="margin:0 0 22px;font-size:16px;font-weight:600;color:${C.text};">Thank you for your order. We have received it successfully and will email you when the status changes.</p>
    <div style="background:${C.soft};border-radius:4px;padding:18px;border:1px solid ${C.border};">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.orderLabel}</td>
          <td style="font-size:15px;font-weight:700;color:${C.text};direction:ltr;text-align:end;padding:6px 0;">#${escapeHtml(order.order_number)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.totalLabel}</td>
          <td style="font-size:15px;font-weight:800;color:${C.accent};direction:ltr;text-align:end;padding:6px 0;">${escapeHtml(total)} ${currency}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:${C.muted};padding:6px 0;text-transform:uppercase;letter-spacing:0.06em;">${copy.statusLabel}</td>
          <td style="font-size:14px;font-weight:600;color:${C.text};direction:ltr;text-align:end;padding:6px 0;text-transform:capitalize;">${escapeHtml(order.status)}</td>
        </tr>
      </table>
    </div>`;

  return wrapEmailLayout({
    brandEn: en,
    brandAr: ar,
    headlineAr: 'تم استلام طلبك',
    headlineEn: 'Order received',
    bodyHtml: body,
    previewText: locale === 'ar'
      ? `تم استلام الطلب #${order.order_number}`
      : `Order #${order.order_number} received`,
    ctaUrl: trackUrl,
    ctaLabelAr: COPY.ar.trackOrder,
    ctaLabelEn: COPY.en.trackOrder,
    locale,
  });
}

function buildSmtpTestEmailHtml(brandOrMap) {
  const opts = brandOrMap && typeof brandOrMap === 'object' && !Array.isArray(brandOrMap)
    ? { map: brandOrMap }
    : { fromName: brandOrMap };
  const { en, ar } = resolveBrandLabels(opts);
  const body = `
    <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:${C.text};text-align:right;">إعدادات البريد تعمل بشكل صحيح.</p>
    <p style="margin:0;font-size:14px;color:${C.muted};direction:ltr;text-align:left;">If you received this message, your SMTP settings are working correctly.</p>`;
  return wrapEmailLayout({
    brandEn: en,
    brandAr: ar,
    headlineAr: 'اختبار البريد',
    headlineEn: 'SMTP test',
    bodyHtml: body,
    previewText: 'SMTP test — The Boutique Line',
    ctaUrl: null,
  });
}

function buildOrderStatusEmailHtml(opts) {
  const { brandMap, brandName, order, status, copy, trackingUrl, settingsMap } = opts;
  const { en, ar } = resolveBrandLabels({
    map: brandMap || { site_name: brandName, site_name_ar: brandName, email_from_name: brandName },
  });
  const locale = resolveOrderLocale(order);
  const labels = COPY[locale];
  const ord = escapeHtml(order.order_number);
  const total = escapeHtml(`${Number(order.total || 0).toFixed(2)} ${order.currency || 'EGP'}`);
  const tracking = order.tracking_number ? escapeHtml(order.tracking_number) : '';
  const trackUrl = escapeHtml(trackingUrl || orderTrackingUrl(order, storefrontUrl(settingsMap || brandMap)));

  const itemRows =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items
          .map((it) => {
            const qty = escapeHtml(it.quantity);
            const name = locale === 'ar'
              ? escapeHtml(it.name_ar || it.name_en || `#${it.product_id}`)
              : escapeHtml(it.name_en || it.name_ar || `#${it.product_id}`);
            return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text}">${name}</td><td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.muted};text-align:center;width:48px">×${qty}</td></tr>`;
          })
          .join('')
      : '';

  const lead = locale === 'ar' ? copy.lead_ar : copy.lead_en;

  const body = `
    <p style="margin:0 0 8px;text-align:center;">
      <span style="display:inline-block;background:${C.accent};color:#fff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;padding:6px 14px;border-radius:2px;">${escapeHtml(status)}</span>
    </p>
    <p style="margin:16px 0 22px;font-size:16px;font-weight:600;color:${C.text};">${escapeHtml(lead)}</p>
    <div style="background:${C.soft};border-radius:4px;padding:18px;margin-bottom:20px;border:1px solid ${C.border};">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr><td style="font-size:12px;color:${C.muted};padding:4px 0;">${labels.orderLabel}</td>
            <td style="font-size:14px;color:${C.text};font-weight:700;direction:ltr;text-align:end;">#${ord}</td></tr>
        <tr><td style="font-size:12px;color:${C.muted};padding:8px 0 4px;">${labels.totalLabel}</td>
            <td style="font-size:14px;color:${C.accent};font-weight:800;direction:ltr;text-align:end;">${total}</td></tr>
        ${tracking
          ? `<tr><td style="font-size:12px;color:${C.muted};padding:8px 0 4px;">${labels.trackingLabel}</td>
                 <td style="font-size:14px;color:${C.text};font-weight:700;direction:ltr;text-align:end;">${tracking}</td></tr>`
          : ''}
      </table>
    </div>
    ${itemRows
      ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${C.text};text-transform:uppercase;letter-spacing:0.08em;">${labels.itemsLabel}</p>
         <table role="presentation" width="100%" style="margin-bottom:8px">${itemRows}</table>`
      : ''}`;

  return wrapEmailLayout({
    brandEn: en,
    brandAr: ar,
    headlineAr: copy.subject_ar,
    headlineEn: copy.subject_en,
    bodyHtml: body,
    previewText: locale === 'ar' ? `${copy.subject_ar} · ${ar || en}` : `${copy.subject_en} · ${en}`,
    ctaUrl: trackUrl,
    ctaLabelAr: COPY.ar.trackOrder,
    ctaLabelEn: COPY.en.trackOrder,
    locale,
  });
}

function orderEmailSubject(brandName, copy, order, locale) {
  const brand = brandName || DEFAULT_BRAND_EN;
  const num = order?.order_number || '';
  if (locale === 'ar') return `${brand} — ${copy.subject_ar} · #${num}`;
  return `${brand} — ${copy.subject_en} · #${num}`;
}

function orderReceivedSubject(brandName, order) {
  const brand = brandName || DEFAULT_BRAND_EN;
  const locale = resolveOrderLocale(order);
  const num = order?.order_number || '';
  if (locale === 'ar') return `${brand} — تم استلام طلبك · #${num}`;
  return `${brand} — Order received · #${num}`;
}

module.exports = {
  DEFAULT_BRAND_EN,
  DEFAULT_BRAND_AR,
  normalizeBrandEn,
  normalizeBrandAr,
  normalizeEmailLocale,
  resolveOrderLocale,
  escapeHtml,
  resolveBrandLabels,
  storefrontUrl,
  orderTrackingUrl,
  orderEmailSubject,
  orderReceivedSubject,
  buildOtpEmailHtml,
  otpEmailSubject,
  buildOrderReceivedEmailHtml,
  buildSmtpTestEmailHtml,
  buildOrderStatusEmailHtml,
};
