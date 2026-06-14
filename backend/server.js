const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./src/models');
const { resolveFrontendOrigins } = require('./src/utils/storefrontUrl');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);

// Security & Performance
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
} else {
  app.use(cors({
    origin: (reqOrigin, cb) => {
      const allowed = new Set(resolveFrontendOrigins());
      if (!reqOrigin || allowed.has(reqOrigin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
}

// Rate limiting — 200/15min was too low for SPA page views + analytics + catalog reads
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : Number(process.env.API_RATE_LIMIT_MAX || 2500),
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    if (req.method === 'GET' && (url.startsWith('/api/health') || url.startsWith('/api/uploads'))) return true;
    if (req.method === 'POST' && url.startsWith('/api/analytics/collect')) return true;
    return false;
  },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 80),
  message: { success: false, message: 'Too many auth attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Stripe webhook (raw body needed before JSON parser)
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Serve uploaded images (local storage fallback)
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));
// Production nginx proxies /api → backend; /uploads alone hits the SPA shell.
app.use('/api/uploads', express.static(uploadsDir));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/banners', require('./src/routes/banners'));
app.use('/api/nav-links', require('./src/routes/navLinks'));
app.use('/api/shop', require('./src/routes/shop'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/wishlist', require('./src/routes/wishlist'));
app.use('/api/addresses', require('./src/routes/addresses'));
app.use('/api/notifications', require('./src/routes/notifications'));

// Routes (WhatsApp duplicated below so requests still work if `/api/admin` router omits whatsapp handlers.)
const adminRouter = require('./src/routes/admin');
const { protect, authorize } = require('./src/middleware/auth');
const whatsappIntegrationController = require('./src/controllers/whatsappIntegrationController');

const whatsAppStandalone = express.Router();
whatsAppStandalone.use(protect, authorize('admin'));
whatsAppStandalone.get('/integration', whatsappIntegrationController.getIntegration);
whatsAppStandalone.put('/integration', whatsappIntegrationController.putIntegration);
whatsAppStandalone.post('/test-connection', whatsappIntegrationController.postTestConnection);
whatsAppStandalone.get('/message-templates', whatsappIntegrationController.listApprovedTemplates);

app.use('/api/admin/whatsapp', whatsAppStandalone);
app.use('/api/admin', adminRouter);

app.use('/api/marketing', require('./src/routes/marketingPublic'));
app.use('/api/landing-pages', require('./src/routes/landingPages'));
app.use('/api/analytics', require('./src/routes/analytics'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({
  success: false,
  message: 'Route not found',
  path: req.originalUrl,
  method: req.method,
}));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
/** 0.0.0.0 = قبول طلبات من أجهزة أخرى على نفس شبكة الويفاي (محليًا). ضع BIND_HOST=127.0.0.1 لتقييد جهاز واحد فقط. */
const BIND_HOST = (process.env.BIND_HOST ?? '0.0.0.0').trim() || '0.0.0.0';

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const { Product, Order } = require('./src/models');
    const { adaptProductSchema, adaptOrderSchema } = require('./src/utils/adaptProductSchema');
    const { migrateHeroTickerImageMapToColumn } = require('./src/utils/heroTickerImageStore');
    const hasHeroTickerImageId = await adaptProductSchema(sequelize, Product);
    if (!hasHeroTickerImageId) {
      console.log('ℹ️  products.hero_ticker_image_id not in DB — slider image picks stored in settings until migration');
    } else {
      const migrated = await migrateHeroTickerImageMapToColumn(Product);
      if (migrated > 0) {
        console.log(`ℹ️  Migrated ${migrated} homepage slider image pick(s) from settings into products.hero_ticker_image_id`);
      }
    }
    const hasOrderLocale = await adaptOrderSchema(sequelize, Order);
    if (!hasOrderLocale) {
      console.log('ℹ️  orders.locale not in DB — order locale stored in email only until migration');
    }

    const isSQLite = (process.env.DB_DIALECT || 'mysql') === 'sqlite';
    // Schema changes belong in migrations/. `alter: true` on MySQL can hit ER_TOO_MANY_KEYS on large tables.
    const useAlterSync =
      process.env.DB_SYNC_ALTER === 'true'
      && process.env.NODE_ENV === 'development'
      && !isSQLite;
    await sequelize.sync({ alter: useAlterSync });
    console.log('✅ Database synced');

    app.listen(PORT, BIND_HOST, () => {
      const hint = BIND_HOST === '0.0.0.0' ? 'جميع الواجهات — من الهاتف: http://<عنوان-الآيبي المحلي>:' + PORT : BIND_HOST;
      console.log(`🚀 MiskWear API  http://localhost:${PORT}   (${hint})`);
    });

    seedInitialData().catch((err) => {
      console.error('Seed error (non-critical):', err.message);
    });

    try {
      const { startMarketingRetryWorker } = require('./src/integrations/queueWorker');
      if (process.env.MARKETING_QUEUE_WORKER_DISABLED !== 'true') {
        startMarketingRetryWorker(Number(process.env.MARKETING_QUEUE_INTERVAL_MS || 45000));
      }
    } catch (e) {
      console.warn('[marketing-queue] Worker not started:', e.message);
    }
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

async function seedInitialData() {
  try {
    const { Role, User, Setting, Category } = require('./src/models');
    const bcrypt = require('bcryptjs');

    // Seed roles
    await Role.findOrCreate({ where: { name: 'admin' }, defaults: { name: 'admin', permissions: { all: true } } });
    await Role.findOrCreate({ where: { name: 'customer' }, defaults: { name: 'customer', permissions: {} } });

    // Seed admin user
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const adminExists = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
    if (!adminExists && process.env.ADMIN_EMAIL) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL,
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12),
        role_id: adminRole.id,
        is_active: true,
        email_verified: true,
      });
      console.log('✅ Admin user created');
    }

    // Seed settings
    const defaultSettings = [
      { key: 'site_name', value: 'The Boutique Line', group: 'general' },
      { key: 'site_name_ar', value: 'ذا بوتيك لاين', group: 'general' },
      { key: 'default_language', value: 'ar', group: 'general' },
      { key: 'currency', value: 'EGP', group: 'general' },
      { key: 'tax_rate', value: '15', group: 'tax' },
      { key: 'shipping_cost', value: '50', group: 'shipping' },
      { key: 'free_shipping_threshold', value: '5000', group: 'shipping' },
      { key: 'delivery_countries', value: JSON.stringify(['EG']), group: 'shipping' },
      { key: 'payment_stripe', value: 'true', group: 'payment' },
      { key: 'payment_cod', value: 'true', group: 'payment' },
      { key: 'payment_bank_transfer', value: 'true', group: 'payment' },
      { key: 'payment_paymob', value: 'false', group: 'payment' },
      { key: 'paymob_api_key', value: '', group: 'payment' },
      { key: 'paymob_secret_key', value: '', group: 'payment' },
      { key: 'paymob_public_key', value: '', group: 'payment' },
      { key: 'paymob_integration_id', value: '', group: 'payment' },
      { key: 'paymob_iframe_id', value: '', group: 'payment' },
      { key: 'paymob_hmac_secret', value: '', group: 'payment' },
      { key: 'paymob_api_base', value: 'https://accept.paymob.com/api', group: 'payment' },
      { key: 'bank_name', value: 'Al Rajhi Bank', group: 'payment' },
      { key: 'bank_account', value: 'SA12 3456 7890 1234 5678 90', group: 'payment' },
      { key: 'whatsapp', value: '+966500000000', group: 'contact' },
      { key: 'email_contact', value: 'info@miskwear.com', group: 'contact' },
    ];
    for (const s of defaultSettings) {
      await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
    }

    // One-time rebrand: replace legacy MiskWear site names in existing DB rows
    const legacyNameRows = await Setting.findAll({
      where: { key: ['site_name', 'site_name_ar'] },
    });
    for (const row of legacyNameRows) {
      const v = String(row.value || '').trim();
      if (row.key === 'site_name' && /^misk\s*wear$/i.test(v)) {
        await row.update({ value: 'The Boutique Line' });
      }
      if (row.key === 'site_name_ar' && (v === 'مسك وير' || v === 'مسك ویر')) {
        await row.update({ value: 'ذا بوتيك لاين' });
      }
    }

    const { seedCategories } = require('./src/seed/categories');
    await seedCategories();

    const { seedNavLinks } = require('./src/seed/navLinks');
    await seedNavLinks();

    console.log('✅ Initial data seeded');

    const { seedDemoProducts } = require('./src/seed/demoProducts');
    await seedDemoProducts();
  } catch (err) {
    console.error('Seed error (non-critical):', err.message);
  }
}

start();
