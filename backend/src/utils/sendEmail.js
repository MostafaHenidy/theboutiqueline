const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { Setting } = require('../models');
const {
  DEFAULT_BRAND_EN,
  normalizeBrandEn,
  buildOtpEmailHtml,
  otpEmailSubject,
  buildOrderReceivedEmailHtml,
  orderReceivedSubject,
} = require('./emailTemplate');

const SMTP_SETTING_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'email_from_address', 'email_from_name', 'site_name', 'site_name_ar'];

function pickConfig(map, key, envFallback) {
  const v = map[key];
  if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  return envFallback;
}

async function resolveSmtpSettingsMap() {
  const rows = await Setting.findAll({ where: { key: { [Op.in]: SMTP_SETTING_KEYS } } });
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

/**
 * Merges DB settings (when present) with env fallbacks for SMTP.
 */
async function resolveSmtpConfig() {
  const map = await resolveSmtpSettingsMap();
  const host = pickConfig(map, 'smtp_host', process.env.SMTP_HOST);
  const portRaw = pickConfig(map, 'smtp_port', process.env.SMTP_PORT || '587');
  const port = parseInt(String(portRaw), 10) || 587;
  const user = pickConfig(map, 'smtp_user', process.env.SMTP_USER);
  const passDb = map.smtp_pass && String(map.smtp_pass).trim() !== '' ? String(map.smtp_pass).trim() : '';
  const pass = passDb || (process.env.SMTP_PASS ? String(process.env.SMTP_PASS).trim() : '');

  let secure = pickConfig(map, 'smtp_secure', process.env.SMTP_SECURE);
  if (secure !== 'true' && secure !== '1' && secure !== 'false' && secure !== '0') {
    secure = port === 465 ? 'true' : 'false';
  }
  const secureBool = secure === 'true' || secure === '1';

  const fromAddress = pickConfig(map, 'email_from_address', process.env.EMAIL_FROM);
  const brand = normalizeBrandEn(
    pickConfig(map, 'email_from_name', '')
    || pickConfig(map, 'site_name', '')
    || DEFAULT_BRAND_EN,
  );

  return {
    host,
    port,
    secure: secureBool,
    auth: { user, pass },
    fromAddress,
    fromName: brand,
    settingsMap: map,
  };
}

function createTransportFromConfig(cfg) {
  if (!cfg?.host || !cfg?.auth?.user) return null;
  const useTlsUpgrade = !cfg.secure && (cfg.port === 587 || cfg.port === 25);
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    ...(useTlsUpgrade ? { requireTLS: true } : {}),
    ...(cfg.secure ? { tls: { minVersion: 'TLSv1.2' } } : {}),
    auth: cfg.auth.user ? { user: cfg.auth.user, pass: cfg.auth.pass || '' } : undefined,
  });
}

exports.resolveSmtpConfig = resolveSmtpConfig;

exports.sendEmail = async ({ to, subject, html }) => {
  const cfg = await resolveSmtpConfig();
  const transport = createTransportFromConfig(cfg);
  if (!transport || !cfg.fromAddress) {
    const missing = [];
    if (!cfg.host) missing.push('host');
    if (!cfg.auth?.user) missing.push('username');
    if (!cfg.fromAddress) missing.push('from address');
    throw new Error(
      `SMTP is not configured (${missing.join(', ')} missing). Save your SMTP settings in Admin → Settings first.`,
    );
  }
  await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
    to,
    subject,
    html,
  });
};

exports.sendEmailSafe = async (opts) => {
  try {
    await exports.sendEmail(opts);
    return { ok: true };
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn('[email] send failed:', msg);
    return { ok: false, message: msg };
  }
};

exports.sendOTPEmail = async (email, otp, locale = 'en') => {
  const cfg = await resolveSmtpConfig();
  const brand = cfg.fromName || DEFAULT_BRAND_EN;
  await exports.sendEmail({
    to: email,
    subject: otpEmailSubject(brand, locale),
    html: buildOtpEmailHtml(otp, brand, locale),
  });
};

exports.sendOTPEmailSafe = async (email, otp, locale = 'en') => {
  try {
    await exports.sendOTPEmail(email, otp, locale);
    return { ok: true };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('[email] OTP send failed:', msg);
    return { ok: false, message: msg };
  }
};

exports.sendOrderConfirmationEmail = async (email, order) => {
  const cfg = await resolveSmtpConfig();
  const brand = cfg.fromName || DEFAULT_BRAND_EN;
  await exports.sendEmail({
    to: email,
    subject: orderReceivedSubject(brand, order),
    html: buildOrderReceivedEmailHtml(order, brand, cfg.settingsMap),
  });
};
