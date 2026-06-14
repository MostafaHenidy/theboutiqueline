const router = require('express').Router();
const { getPublicShopSettings } = require('../controllers/shopController');

router.get('/settings', getPublicShopSettings);

module.exports = router;
