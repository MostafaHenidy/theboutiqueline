const router = require('express').Router();
const { body } = require('express-validator');
const marketing = require('../controllers/marketingIntegrationsController');
const validate = require('../middleware/validate');
const {
  providerParam,
  integrationUpdateRules,
  paginationRules,
  singleEventRules,
} = require('../validators/marketingValidators');

router.get('/integrations', marketing.getIntegrations);
router.put(
  '/integrations/:provider',
  providerParam,
  integrationUpdateRules,
  validate,
  marketing.putIntegration,
);

router.post(
  '/integrations/:provider/test-connection',
  providerParam,
  validate,
  marketing.testIntegration,
);

router.post(
  '/integrations/:provider/dispatch-sample',
  providerParam,
  singleEventRules,
  validate,
  marketing.dispatchSingleTestEvent,
);

router.post('/send-full-events', marketing.sendFullEvents);
router.get('/jobs/:id', marketing.getBulkJob);
router.get('/logs', paginationRules, validate, marketing.getLogs);
router.get('/retry-queue', marketing.getQueue);
router.post('/retry-queue/drain', marketing.drainRetryQueueManual);
router.post('/retry-failed', marketing.retryFailedManual);
router.get('/stats', marketing.getStats);
router.get('/diagnostics', marketing.getDiagnostics);
router.get('/pixel-health', marketing.pixelHealthPing);
router.post(
  '/abandoned-cart-scan',
  body('limit').optional().isInt({ min: 1, max: 200 }),
  validate,
  marketing.abandonedCartScan,
);

module.exports = router;
