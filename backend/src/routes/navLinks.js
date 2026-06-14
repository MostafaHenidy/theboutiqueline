const router = require('express').Router();
const { getPublicNavLinks } = require('../controllers/navLinkController');

router.get('/', getPublicNavLinks);

module.exports = router;
