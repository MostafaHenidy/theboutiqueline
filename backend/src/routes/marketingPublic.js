const router = require('express').Router();
const marketing = require('../controllers/marketingIntegrationsController');

/** Public-safe pixel bootstrap (never returns tokens) */
router.get('/public-config', marketing.publicPixelBootstrap);

/** Optional partner ingress — protect with MARKETING_WEBHOOK_SECRET */
router.post('/webhooks/:provider', marketing.webhookIngress);

module.exports = router;
