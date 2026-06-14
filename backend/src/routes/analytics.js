const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { optionalAuth } = require('../middleware/auth');
const { collect } = require('../controllers/storeAnalyticsController');

const collectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 120,
  message: { success: false, message: 'Too many analytics events' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/collect', collectLimiter, optionalAuth, collect);

module.exports = router;
