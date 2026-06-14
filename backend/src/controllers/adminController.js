const { Op } = require('sequelize');
const { User, Order, Product, ProductImage, Category, Review, Setting, Banner, Coupon } = require('../models');
const sequelize = require('../config/database');
const { normalizeDomain, buildDnsHints, verifyDomainDns, newVerificationToken } = require('../services/domainDns');
const { normalizeDeliveryCountries } = require('../utils/deliveryCountries');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers, newUsersMonth,
      totalOrders, ordersMonth,
      totalRevenue, revenueMonth, revenueLastMonth,
      totalProducts, lowStockProducts,
      pendingOrders, processingOrders,
      pendingReviews,
    ] = await Promise.all([
      User.count({ where: { role_id: 2 } }),
      User.count({ where: { role_id: 2, created_at: { [Op.gte]: startOfMonth } } }),
      Order.count(),
      Order.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
      Order.sum('total', { where: { payment_status: 'paid' } }),
      Order.sum('total', { where: { payment_status: 'paid', created_at: { [Op.gte]: startOfMonth } } }),
      Order.sum('total', { where: { payment_status: 'paid', created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] } } }),
      Product.count({ where: { is_active: true } }),
      Product.count({ where: { stock: { [Op.lte]: 5 }, is_active: true } }),
      Order.count({ where: { status: 'pending' } }),
      Order.count({ where: { status: 'processing' } }),
      Review.count({ where: { is_approved: false } }),
    ]);

    const revenueGrowth = revenueLastMonth ? ((revenueMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1) : 0;

    const recentOrders = await Order.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const topProductsRaw = await Product.findAll({
      order: [['sales_count', 'DESC']],
      limit: 5,
      attributes: ['id', 'name_ar', 'name_en', 'thumbnail', 'sales_count', 'price'],
      include: [{ model: ProductImage, as: 'images', limit: 1 }],
    });
    const topProducts = topProductsRaw.map((row) => {
      const j = row.toJSON();
      if (!j.thumbnail?.trim() && j.images?.[0]?.url) j.thumbnail = j.images[0].url;
      return j;
    });

    const salesByMonth = await Order.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('created_at')), 'month'],
        [sequelize.fn('YEAR', sequelize.col('created_at')), 'year'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
      ],
      where: { created_at: { [Op.gte]: new Date(now.getFullYear(), 0, 1) } },
      group: [sequelize.fn('MONTH', sequelize.col('created_at')), sequelize.fn('YEAR', sequelize.col('created_at'))],
      order: [[sequelize.fn('MONTH', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        stats: { totalUsers, newUsersMonth, totalOrders, ordersMonth, totalRevenue: totalRevenue || 0, revenueMonth: revenueMonth || 0, revenueGrowth, totalProducts, lowStockProducts, pendingOrders, processingOrders, pendingReviews },
        recentOrders,
        topProducts,
        salesByMonth,
      },
    });
  } catch (err) { next(err); }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    const passSet = !!(result.smtp_pass && String(result.smtp_pass).trim());
    delete result.smtp_pass;
    result.smtp_password_is_set = passSet;

    const paymobKeySet = !!(result.paymob_api_key && String(result.paymob_api_key).trim());
    delete result.paymob_api_key;
    result.paymob_api_key_is_set = paymobKeySet;

    const paymobSecretSet = !!(result.paymob_secret_key && String(result.paymob_secret_key).trim());
    delete result.paymob_secret_key;
    result.paymob_secret_key_is_set = paymobSecretSet;

    const paymobHmacSet = !!(result.paymob_hmac_secret && String(result.paymob_hmac_secret).trim());
    delete result.paymob_hmac_secret;
    result.paymob_hmac_secret_is_set = paymobHmacSet;

    res.json({ success: true, data: result, dnsHints: buildDnsHints() });
  } catch (err) { next(err); }
};

const DOMAIN_SERVER_KEYS = new Set(['domain_verification_token', 'domain_status', 'domain_last_checked_at', 'domain_last_error']);

/** Never persist from client (computed or secrets handling) */
const SETTINGS_INCOMING_BLOCKLIST = new Set([
  ...DOMAIN_SERVER_KEYS,
  'smtp_password_is_set',
  'paymob_api_key_is_set',
  'paymob_secret_key_is_set',
  'paymob_hmac_secret_is_set',
]);

exports.updateSettings = async (req, res, next) => {
  try {
    const incoming = { ...req.body };
    SETTINGS_INCOMING_BLOCKLIST.forEach((k) => { delete incoming[k]; });

    if (Object.prototype.hasOwnProperty.call(incoming, 'smtp_pass')) {
      const trimmed = incoming.smtp_pass !== undefined && incoming.smtp_pass !== null ? String(incoming.smtp_pass).trim() : '';
      if (!trimmed) delete incoming.smtp_pass;
    }

    for (const secretKey of ['paymob_api_key', 'paymob_secret_key', 'paymob_hmac_secret']) {
      if (Object.prototype.hasOwnProperty.call(incoming, secretKey)) {
        const trimmed = incoming[secretKey] !== undefined && incoming[secretKey] !== null ? String(incoming[secretKey]).trim() : '';
        if (!trimmed) delete incoming[secretKey];
      }
    }

    if (Object.prototype.hasOwnProperty.call(incoming, 'delivery_countries')) {
      let raw = incoming.delivery_countries;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = [];
        }
      }
      incoming.delivery_countries = JSON.stringify(normalizeDeliveryCountries(raw));
    }

    if (Object.prototype.hasOwnProperty.call(incoming, 'default_language')) {
      const v = String(incoming.default_language || '').toLowerCase();
      incoming.default_language = v === 'en' ? 'en' : 'ar';
    }

    if (Object.prototype.hasOwnProperty.call(incoming, 'custom_domain')) {
      const normalized = normalizeDomain(incoming.custom_domain);
      incoming.custom_domain = normalized;
      const prevRow = await Setting.findOne({ where: { key: 'custom_domain' } });
      const prevNorm = normalizeDomain(prevRow?.value || '');
      if (normalized !== prevNorm) {
        if (!normalized) {
          await Setting.upsert({ key: 'domain_verification_token', value: '' });
          await Setting.upsert({ key: 'domain_status', value: 'none' });
        } else {
          await Setting.upsert({ key: 'domain_verification_token', value: newVerificationToken() });
          await Setting.upsert({ key: 'domain_status', value: 'pending' });
        }
        await Setting.upsert({ key: 'domain_last_checked_at', value: '' });
        await Setting.upsert({ key: 'domain_last_error', value: '' });
      }
    }

    for (const [key, value] of Object.entries(incoming)) {
      await Setting.upsert({ key, value: String(value ?? '') });
    }
    res.json({ success: true, message: 'Settings updated', dnsHints: buildDnsHints() });
  } catch (err) { next(err); }
};

exports.sendTestEmail = async (req, res, next) => {
  try {
    const { sendEmail, resolveSmtpConfig } = require('../utils/sendEmail');
    const { buildSmtpTestEmailHtml, DEFAULT_BRAND_EN } = require('../utils/emailTemplate');
    const to = String(req.body?.email || '').trim() || req.user?.email;
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email is required' });
    const cfg = await resolveSmtpConfig();
    const brand = cfg.fromName || DEFAULT_BRAND_EN;
    await sendEmail({
      to,
      subject: `${brand} — اختبار البريد / SMTP test`,
      html: buildSmtpTestEmailHtml(cfg.settingsMap || { email_from_name: brand }),
    });
    res.json({ success: true, message: 'Test email sent' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to send test email' });
  }
};

exports.verifyCustomDomain = async (req, res, next) => {
  try {
    const domRow = await Setting.findOne({ where: { key: 'custom_domain' } });
    const tokRow = await Setting.findOne({ where: { key: 'domain_verification_token' } });
    const hostname = normalizeDomain(domRow?.value);
    const token = tokRow?.value || '';
    if (!hostname) {
      return res.status(400).json({ success: false, message: 'Set a custom domain first' });
    }
    if (!token) {
      return res.status(400).json({ success: false, message: 'No verification token — save the domain again' });
    }
    const hints = buildDnsHints();
    const outcome = await verifyDomainDns(hostname, token, hints);
    const checkedAt = new Date().toISOString();
    await Setting.upsert({ key: 'domain_status', value: outcome.status });
    await Setting.upsert({ key: 'domain_last_checked_at', value: checkedAt });
    await Setting.upsert({ key: 'domain_last_error', value: outcome.error || '' });
    res.json({
      success: true,
      status: outcome.status,
      checks: outcome.checks,
      checkedAt,
      error: outcome.error,
      dnsHints: hints,
    });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = {};
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'otp', 'otp_expires', 'reset_token', 'reset_token_expires'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.is_active = !user.is_active;
    await user.save();
    res.json({ success: true, message: `User ${user.is_active ? 'activated' : 'deactivated'}` });
  } catch (err) { next(err); }
};

exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.findAll({ order: [['position', 'ASC']] });
    res.json({ success: true, data: banners });
  } catch (err) { next(err); }
};

/** قائمة عامة بدون مصادقة (الهيرو في الصفحة الرئيسية) */
exports.getPublicBanners = async (req, res, next) => {
  try {
    const now = new Date();
    const rows = await Banner.findAll({
      where: { is_active: true },
      order: [['position', 'ASC']],
    });
    const data = rows.filter((b) => {
      if (b.starts_at && new Date(b.starts_at) > now) return false;
      if (b.ends_at && new Date(b.ends_at) < now) return false;
      return true;
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

function stringifyBannerMediaField(val) {
  if (val == null || val === '') return undefined;
  if (Array.isArray(val)) {
    for (const x of val) {
      const s = stringifyBannerMediaField(x);
      if (s) return s;
    }
    return undefined;
  }
  if (typeof val === 'object') {
    const p = val.path ?? val.secure_url ?? val.url;
    if (p != null && typeof p === 'string') return p.trim() || undefined;
    return undefined;
  }
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'null' || s === 'undefined') return undefined;
  return s;
}

/** Multer .fields() يعيد مصفوفة لكل حقل؛ بعض الإصدارات/الإعدادات قد ترجع كائنًا واحدًا */
function firstUploadedFile(files, fieldName) {
  const raw = files?.[fieldName];
  if (!raw) return null;
  const file = Array.isArray(raw) ? raw[0] : raw;
  if (!file || typeof file !== 'object') return null;
  const p = file.path ?? file.secure_url ?? file.url;
  if (p == null) return null;
  const s = String(p).trim();
  return s || null;
}

function normalizeBannerPayload(body) {
  const out = { ...body };
  if (out.position !== undefined && out.position !== '') {
    const n = parseInt(String(out.position), 10);
    out.position = Number.isNaN(n) ? 0 : n;
  }
  if (out.is_active !== undefined) {
    const v = out.is_active;
    out.is_active = v === true || v === 'true' || v === '1' || v === 1;
  }

  const imageStr = stringifyBannerMediaField(out.image);
  const mobileStr = stringifyBannerMediaField(out.mobile_image);
  delete out.image;
  delete out.mobile_image;
  if (imageStr) out.image = imageStr;
  if (mobileStr) out.mobile_image = mobileStr;

  return out;
}

const BANNER_ATTRS = [
  'title_ar', 'title_en', 'subtitle_ar', 'subtitle_en', 'link', 'type',
  'position', 'is_active', 'starts_at', 'ends_at', 'image', 'mobile_image',
];

/** يمرّ فقط أعمدة الموديل ويضمن أن image / mobile_image نص أو undefined */
function pickBannerPayload(normalized, files, singleFile) {
  const merged = { ...normalized };
  const ip = firstUploadedFile(files, 'image');
  const mp = firstUploadedFile(files, 'mobile_image');
  if (ip) merged.image = ip;
  if (mp) merged.mobile_image = mp;
  if (singleFile?.path) merged.image = String(singleFile.path).trim() || merged.image;

  const out = {};
  for (const key of BANNER_ATTRS) {
    if (merged[key] === undefined) continue;
    if (key === 'image' || key === 'mobile_image') {
      const s = stringifyBannerMediaField(merged[key]);
      if (s) out[key] = s;
      continue;
    }
    out[key] = merged[key];
  }
  return out;
}

exports.createBanner = async (req, res, next) => {
  try {
    const normalized = normalizeBannerPayload({ ...req.body });
    const payload = pickBannerPayload(normalized, req.files || {}, req.file);
    const banner = await Banner.create(payload);
    res.status(201).json({ success: true, data: banner });
  } catch (err) { next(err); }
};

exports.updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    const normalized = normalizeBannerPayload({ ...req.body });
    const payload = pickBannerPayload(normalized, req.files || {}, req.file);
    await banner.update(payload);
    res.json({ success: true, data: banner });
  } catch (err) { next(err); }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    await Banner.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) { next(err); }
};

exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.findAll({ order: [['created_at', 'DESC']] });
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await coupon.update(req.body);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    await Coupon.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) { next(err); }
};
