const router = require('express').Router();
const { getPublicBanners } = require('../controllers/adminController');

router.get('/', getPublicBanners);

module.exports = router;
