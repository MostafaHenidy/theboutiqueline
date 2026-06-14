const { WhatsAppIntegration } = require('../../models');
const { decryptJson } = require('../cryptoSecret');
const { ORDER_STATUSES, mergeTemplateConfig } = require('./templateDefaults');
const {
  sendWhatsAppTemplate,
  fetchApprovedTemplateComponents,
  maxBodyNumericPlaceholderDepth,
  maxHeaderNumericPlaceholderDepth,
} = require('./metaClient');

const STATUS_LABEL_AR = {
  pending: 'قيد الانتظار',
  confirmed: 'تم التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  refunded: 'مُسترد',
};

const STATUS_LABEL_EN = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Sequelize/MySQL/SQLite may return JSON blobs as plain objects or stringified TEXT */
function jsonFieldObject(order, field) {
  const raw = order?.[field];
  if (raw == null) return {};
  if (typeof raw === 'object' && raw && !Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      let o = JSON.parse(raw);
      if (typeof o === 'string') {
        try {
          o = JSON.parse(o);
        } catch {
          return {};
        }
      }
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(raw)) {
    try {
      let o = JSON.parse(raw.toString('utf8'));
      if (typeof o === 'string') {
        try {
          o = JSON.parse(o);
        } catch {
          return {};
        }
      }
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

function shippingAddressObject(order) {
  return jsonFieldObject(order, 'shipping_address');
}

function billingAddressObject(order) {
  return jsonFieldObject(order, 'billing_address');
}

function logSkipped(order, status, reason, extra = {}) {
  const id = order?.order_number || order?.id || '?';
  console.warn('[whatsapp] skip send order #%s status=%s reason=%s', id, status, reason, extra);
}

/**
 * Hindi / Eastern Arabic digits → ASCII 0-9 so \d extraction works on checkout forms.
 */
function toWesternDigits(input) {
  if (input == null) return '';
  let out = '';
  for (const ch of String(input)) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0660 && cp <= 0x0669) {
      out += String(cp - 0x0660);
    } else if (cp >= 0x06f0 && cp <= 0x06f9) {
      out += String(cp - 0x06f0);
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalize customer phone into full international digits (no +) for WhatsApp Cloud API `to`.
 * @param {string|null|undefined} raw
 * @param {string} [countryCodeDigits] calling code digits only e.g. 966, 971 (no leading +); from admin WhatsApp integration
 */
function normalizeWaDigits(raw, countryCodeDigits = '966') {
  let cc = String(countryCodeDigits ?? '966').replace(/\D/g, '').slice(0, 15);
  if (!cc.length) cc = '966';

  if (raw == null || raw === '') return null;
  const westernized = toWesternDigits(String(raw).trim());
  /** Drop extension tail; phone body may contain spaces (+20 11 …). */
  const dialPart = westernized.replace(/\u200f|\u200e/g, '').split(/\s+(?:ext\.?|x|تحويل)\s+/i)[0];

  let d = dialPart.replace(/\D/g, '');
  while (d.length >= 13 && d.startsWith('00')) {
    d = d.slice(2);
  }

  if (!d.length) return null;

  const maxTotal = 15;
  const minNationalDigits = 6;

  /** Egyptian mobile (+20 …): avoids mis-routing eg. 011… as 966+11… under default GCC CC */
  const isEgMobileNationalWithTrunk = /^0(10|11|12|15)\d{8}$/.test(d);
  const isEgMobileNationalNoTrunk = /^(10|11|12|15)\d{8}$/.test(d);
  const isEgMobileIntl =
    /^20(10|11|12|15)\d{8}$/.test(d) && d.length >= 11 && d.length <= maxTotal;

  if (isEgMobileIntl) {
    return d.length <= maxTotal ? d : null;
  }
  if (isEgMobileNationalWithTrunk || isEgMobileNationalNoTrunk) {
    const intl = isEgMobileNationalWithTrunk ? `20${d.slice(1)}` : `20${d}`;
    return intl.length <= maxTotal ? intl : null;
  }

  // Already begins with configured country code
  if (d.startsWith(cc)) {
    return d.length >= cc.length + minNationalDigits && d.length <= maxTotal ? d : null;
  }

  // National number with trunk 0 (common in GCC + others)
  if (d.startsWith('0')) {
    d = cc + d.slice(1);
    return d.length >= cc.length + minNationalDigits && d.length <= maxTotal ? d : null;
  }

  // Plain national subscriber number — prepend CC
  if (d.length >= minNationalDigits && d.length <= 12) {
    d = cc + d;
    return d.length <= maxTotal ? d : null;
  }

  return null;
}

function customerDisplayName(order) {
  const sa = shippingAddressObject(order);
  return (
    String(sa.full_name || sa.name || '').trim()
    || String(order.guest_name || '').trim()
    || 'Customer'
  );
}

function resolveVariable(order, status, key) {
  const sa = shippingAddressObject(order);
  const cur = status || order.status;
  const arabicLabel = STATUS_LABEL_AR[cur] || cur;
  const englishLabel = STATUS_LABEL_EN[cur] || cur;
  switch (String(key)) {
    case 'order_number':
      return String(order.order_number || order.id || '');
    case 'customer_name':
      return customerDisplayName(order);
    case 'total':
      return Number(order.total || 0).toFixed(2);
    case 'currency':
      return String(order.currency || 'EGP');
    case 'status_label':
      return arabicLabel;
    case 'status_label_en':
      return englishLabel;
    case 'tracking_number':
      return String(order.tracking_number || '—');
    default:
      return String(sa[key] != null ? sa[key] : '');
  }
}

const REASON_HINTS = {
  bad_status: {
    ar: 'حالة الطلب لا تندرج ضمن قائمة الإشعارات.',
    en: 'Order status cannot trigger WhatsApp for this workflow.',
  },
  db: {
    ar: 'تعذّر قراءة إعداد الواتساب من قاعدة البيانات.',
    en: 'Could not load WhatsApp integration.',
  },
  disabled: {
    ar: 'إرسال الواتساب معطّل أو لم يُحفظ «Phone number ID» في صفحة الواتساب بالأدمن.',
    en: 'WhatsApp sending is off or Phone number ID missing in Admin.',
  },
  decrypt_failed: {
    ar: 'فك تشفير التوكن فشل — تحقّق من MARKETING_ENCRYPTION_KEY.',
    en: 'Could not decrypt token — check MARKETING_ENCRYPTION_KEY.',
  },
  no_token: {
    ar: 'لم يُحفظ Access token لتطبيق الواتساب.',
    en: 'No access token saved.',
  },
  template_off: {
    ar:
      'لم يُفعَّل قالب لهذه الحالة أو اسم القالب فارغ — فعّل «استخدام لهذه الحالة» وأدخل اسم القالب المعتمد في Meta ثم احفظ.',
    en:
      'No template for THIS exact status — enable “Use for this status”, approved template name, Save.',
  },
  no_phone: {
    ar:
      'رقم الهاتف غير صالح أو مفقود — تأكّد من الهاتف في عنوان الشحن/الفاتورة، ومفتاح الدولة في إعدادات الواتساب.',
    en:
      'No valid phone — check shipping/billing phone and WhatsApp country code.',
  },
  api_error: {
    ar: 'رفض Meta الإرسال — راجع رسالة الخطأ في أسفل إعداد الواتساب.',
    en: 'Meta API rejected — see WhatsApp integration last error.',
  },
  template_translation_mismatch: {
    ar:
      '(#132001) الأفضل: احفظ «معرّف حساب WhatsApp للأعمال (WABA)» أعلاه، واضغط «استيراد القوالب المعتمدة» ثم اختر الاسم واللغة من القائمة لتطابق Meta حرفياً. أو انسخ من WhatsApp Manager العمودين معاً.',
    en:
      '(#132001) Best: save WABA ID → Fetch approved templates → pick name+locale. Or copy Locale + template name exactly from Meta.',
  },
  param_count_mismatch: {
    ar:
      '(#132000) عدد متغيرات نص القالب في Meta لا يطابق الإعداد في الأدمن. إن لم يكن للقالب أي {{1}},{{2}}… أزل متغيرات الجسم؛ وإلا أضِف/احذِف متغيرات حتى يصبح العدد مطابقاً لقالبك المعتمد.',
    en:
      '(#132000) Body parameter count must match Meta placeholders {{1}}, {{2}}, …. For static body templates remove body variables in Admin; otherwise align variable count with the approved template.',
  },
  template_header_params_not_supported: {
    ar:
      'القالب المعتمد يستخدم متغيرات في عنوان (Header) نصّي؛ الإرسال الحالي يدعم متغيرات النص (Body) فقط. عدِّل القالب أو استخدم قالبًا بلا عنوان نصّي له {{1}}….',
    en:
      'Approved template has TEXT HEADER placeholders; only BODY parameters are sent today. Edit the template in Meta or use a template without numbered HEADER vars.',
  },
  exception: {
    ar: 'حدث خطأ تقني أثناء محاولة إرسال الواتساب.',
    en: 'Technical error during WhatsApp send.',
  },
};

function hintPair(reasonKey) {
  const h = REASON_HINTS[reasonKey] || REASON_HINTS.bad_status;
  return { hint_ar: h.ar, hint_en: h.en };
}

/** @returns {Promise<object>} diagnostic includes hint_ar/hint_en on failure */
async function notifyOrderWhatsApp(order, explicitStatus = null) {
  const status = explicitStatus || order.status;
  if (!order || !ORDER_STATUSES.includes(status)) {
    logSkipped(order, status, 'bad_status');
    return { sent: false, reason: 'bad_status', ...hintPair('bad_status') };
  }

  let integration;
  try {
    integration = await WhatsAppIntegration.findOne({ order: [['id', 'ASC']] });
  } catch (err) {
    console.warn('[whatsapp] load integration:', err.message);
    return { sent: false, reason: 'db', ...hintPair('db') };
  }

  if (!integration?.enabled || !integration.phone_number_id?.trim()) {
    logSkipped(order, status, 'disabled', { enabled: integration?.enabled, hasPhoneId: !!integration?.phone_number_id?.trim() });
    return { sent: false, reason: 'disabled', ...hintPair('disabled') };
  }

  let credentials;
  try {
    credentials = decryptJson(
      integration.encrypted_credentials,
      integration.iv,
      integration.auth_tag,
    );
  } catch {
    logSkipped(order, status, 'decrypt_failed');
    return { sent: false, reason: 'decrypt_failed', ...hintPair('decrypt_failed') };
  }
  const accessToken = credentials?.accessToken && String(credentials.accessToken).trim();
  if (!accessToken) {
    logSkipped(order, status, 'no_token');
    return { sent: false, reason: 'no_token', ...hintPair('no_token') };
  }

  const templateMap = mergeTemplateConfig(integration.template_config || {});
  const cfg = templateMap[status];
  if (!cfg?.enabled || !cfg.templateName) {
    logSkipped(order, status, 'template_off', { enabled: cfg?.enabled, hasName: !!cfg?.templateName });
    return { sent: false, reason: 'template_off', ...hintPair('template_off') };
  }

  const phoneRaw = saPhone(order);
  const ccDigits =
    String(integration.phone_country_code || process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '966')
      .replace(/\D/g, '')
      .slice(0, 15) || '966';
  const to = normalizeWaDigits(phoneRaw, ccDigits);
  if (!to) {
    logSkipped(order, status, 'no_phone', {
      ccDigits,
      phoneRawSnippet: typeof phoneRaw === 'string' ? phoneRaw.slice(0, 20) : phoneRaw,
    });
    return { sent: false, reason: 'no_phone', ...hintPair('no_phone') };
  }

  const version = String(integration.graph_api_version || 'v21.0').replace(/^\/*/, '');
  const lang = normalizeTemplateLanguage(cfg.language?.trim()) || 'ar';

  let bodyTexts = (cfg.bodyVariables || []).map((v) =>
    resolveVariable(order, status, String(v)));

  const wabaId = integration.whatsapp_business_account_id?.trim();
  if (wabaId) {
    try {
      const comps = await fetchApprovedTemplateComponents(
        version,
        wabaId,
        accessToken,
        cfg.templateName.trim(),
        lang,
      );
      if (comps) {
        const headerN = maxHeaderNumericPlaceholderDepth(comps);
        if (headerN > 0) {
          console.warn('[whatsapp] template has HEADER {{n}} vars (unsupported): headerPlaceholders=%s', headerN);
          integration.connection_status = 'error';
          integration.last_error = 'template HEADER placeholders not supported yet';
          try {
            await integration.save();
          } catch (_) { /* noop */ }
          return {
            sent: false,
            reason: 'template_header_params_not_supported',
            expected_header_placeholders: headerN,
            ...hintPair('template_header_params_not_supported'),
          };
        }
        const bodyN = maxBodyNumericPlaceholderDepth(comps);
        if (bodyN === 0 && bodyTexts.length > 0) {
          console.warn(
            '[whatsapp] template BODY has no {{n}}; clearing %s admin body params to avoid #132000',
            bodyTexts.length,
          );
          bodyTexts = [];
        } else if (bodyTexts.length !== bodyN) {
          console.warn(
            '[whatsapp] body param mismatch expected=%s actual=%s (template %s)',
            bodyN,
            bodyTexts.length,
            cfg.templateName.trim(),
          );
          integration.connection_status = 'error';
          integration.last_error = `#132000 mismatch: Meta expects ${bodyN} BODY params, got ${bodyTexts.length}`;
          try {
            await integration.save();
          } catch (_) { /* noop */ }
          return {
            sent: false,
            reason: 'param_count_mismatch',
            expected_body_params: bodyN,
            actual_body_params: bodyTexts.length,
            facebook_code: 132000,
            ...hintPair('param_count_mismatch'),
          };
        }
      }
    } catch (specErr) {
      console.warn('[whatsapp] template spec prefetch failed (send may still proceed): %s', specErr.message || specErr);
    }
  }

  console.info('[whatsapp] template send try name=%s language=%s', cfg.templateName.trim(), lang);

  try {
    const sendResult = await sendWhatsAppTemplate({
      version,
      phoneNumberId: integration.phone_number_id.trim(),
      accessToken,
      to,
      templateName: cfg.templateName.trim(),
      languageCode: lang,
      bodyTexts,
    });
    const messageId =
      typeof sendResult?.messages?.[0]?.id === 'string' ? sendResult.messages[0].id : null;
    const recipientWaId =
      typeof sendResult?.contacts?.[0]?.wa_id === 'string' ? sendResult.contacts[0].wa_id : null;
    if (!messageId) {
      console.warn(
        '[whatsapp] Meta POST ok but no messages[].id — body=%s',
        JSON.stringify(sendResult || {}).slice(0, 500),
      );
    }
    integration.connection_status = 'connected';
    integration.last_error = null;
    integration.last_sent_at = new Date();
    await integration.save();
    console.info(
      '[whatsapp] template accepted %s → order #%s digits=%s wamid=%s wa_id=%s',
      cfg.templateName.trim(),
      order.order_number || order.id,
      `${to.slice(0, Math.min(to.length - 4, 6))}****`,
      messageId || '?',
      recipientWaId || '?',
    );
    return {
      sent: true,
      to_masked: `${to.slice(0, Math.min(to.length - 4, 6))}****`,
      message_id: messageId,
      recipient_wa_id: recipientWaId,
      recipient_digits_hint: digitsHintForUi(to),
    };
  } catch (err) {
    const msg = err.message || String(err);
    integration.connection_status = 'error';
    integration.last_error = msg.slice(0, 4000);
    try {
      await integration.save();
    } catch (_) { /* noop */ }
    console.warn('[whatsapp] send failed:', msg);

    const fbCode = Number(err.fbError?.code ?? err.meta?.error?.code);
    const mismatch132001 =
      fbCode === 132001 ||
      /\b132001\b/i.test(msg) ||
      /does not exist in the translation/i.test(msg);

    if (mismatch132001) {
      return {
        sent: false,
        reason: 'template_translation_mismatch',
        facebook_code: fbCode || 132001,
        api_error: msg.slice(0, 800),
        template_name_sent: cfg.templateName.trim(),
        language_code_sent: lang,
        ...hintPair('template_translation_mismatch'),
      };
    }

    const mismatch132000 =
      fbCode === 132000 ||
      /\b132000\b/i.test(msg) ||
      /number of parameters does not match the expected/i.test(msg) ||
      /expected number of params/i.test(msg);

    if (mismatch132000) {
      return {
        sent: false,
        reason: 'param_count_mismatch',
        facebook_code: fbCode || 132000,
        api_error: msg.slice(0, 800),
        template_name_sent: cfg.templateName.trim(),
        language_code_sent: lang,
        actual_body_params: bodyTexts.length,
        ...hintPair('param_count_mismatch'),
      };
    }

    return { sent: false, reason: 'api_error', api_error: msg.slice(0, 800), ...hintPair('api_error') };
  }
}

/** Match Meta-approved locale literally: trim + optional hyphen→underscore only (avoid #132001). */
function normalizeTemplateLanguage(code) {
  const raw = String(code ?? '').trim();
  if (!raw) return 'ar';
  return raw.replace(/-/g, '_');
}

const ADDRESS_PHONE_KEYS = [
  'phone',
  'mobile',
  'phone_number',
  'tel',
  'telephone',
  'whatsapp',
  'whatsapp_number',
];

/** Phone string from flattened address payload (shipping / billing JSON). */
function firstPhoneFromAddress(sa) {
  if (!sa || typeof sa !== 'object') return '';
  for (const k of ADDRESS_PHONE_KEYS) {
    const v = sa[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  if (sa.contact && typeof sa.contact === 'object') {
    const n = firstPhoneFromAddress(sa.contact);
    if (n) return n;
  }
  if (sa.billing_details && typeof sa.billing_details === 'object') {
    const n = firstPhoneFromAddress(sa.billing_details);
    if (n) return n;
  }
  return '';
}

function saPhone(order) {
  let raw = firstPhoneFromAddress(shippingAddressObject(order));
  if (!raw) raw = firstPhoneFromAddress(billingAddressObject(order));
  // guest_phone kept for forward-compatible DB migrations / API extensions
  if (!raw && order?.guest_phone != null && String(order.guest_phone).trim()) {
    raw = String(order.guest_phone).trim();
  }
  const western = toWesternDigits(raw).trim();
  const dialPart = western.replace(/\u200f|\u200e/g, '').split(/\s+(?:ext\.?|x|تحويل)\s+/i)[0];
  return dialPart.trim();
}

function digitsHintForUi(intlDigits) {
  const d = String(intlDigits || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.length <= 12) return `${d.slice(0, 4)}…${d.slice(-3)}`;
  return `${d.slice(0, 4)}…${d.slice(-4)}`;
}


module.exports = {
  notifyOrderWhatsApp,
  normalizeWaDigits,
  ORDER_STATUSES,
};
