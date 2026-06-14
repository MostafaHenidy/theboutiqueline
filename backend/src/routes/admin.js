const router = require('express').Router();
const { getDashboardStats, getSettings, updateSettings, verifyCustomDomain, sendTestEmail, getUsers, toggleUserStatus, getBanners, createBanner, updateBanner, deleteBanner, getCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/adminController');
const { getAdminNavLinks, createNavLink, updateNavLink, toggleNavLink, deleteNavLink } = require('../controllers/navLinkController');
const whatsappIntegrationController = require('../controllers/whatsappIntegrationController');
const { getAdminProducts, getAdminProductIds, bulkDeleteProducts, lookupProductsByIds, getAdminProductById } = require('../controllers/productController');
const { getAnalytics, getLiveAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');
const { bannerUpload } = require('../config/cloudinary');

/** Multer .any() yields an array; controllers expect req.files[field] = [file] */
function normalizeBannerMultipartFiles(req, res, next) {
  const arr = Array.isArray(req.files) ? req.files : [];
  const grouped = {};
  for (const f of arr) {
    if (f.fieldname !== 'image' && f.fieldname !== 'mobile_image') continue;
    if (!grouped[f.fieldname]) grouped[f.fieldname] = [];
    grouped[f.fieldname].push(f);
  }
  for (const key of Object.keys(grouped)) {
    if (grouped[key].length > 1) {
      return res.status(400).json({ success: false, message: `Too many files for field ${key}` });
    }
  }
  req.files = grouped;
  next();
}

router.use(protect, authorize('admin'));

router.get('/products/ids', getAdminProductIds);
router.post('/products/lookup', lookupProductsByIds);
router.get('/products', getAdminProducts);
router.get('/products/:id', getAdminProductById);
router.post('/products/bulk-delete', bulkDeleteProducts);
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/analytics/live', getLiveAnalytics);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/send-test-email', sendTestEmail);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.get('/banners', getBanners);
router.post('/banners', bannerUpload, normalizeBannerMultipartFiles, createBanner);
router.put('/banners/:id', bannerUpload, normalizeBannerMultipartFiles, updateBanner);
router.delete('/banners/:id', deleteBanner);
router.get('/nav-links', getAdminNavLinks);
router.post('/nav-links', createNavLink);
router.put('/nav-links/:id', updateNavLink);
router.patch('/nav-links/:id/toggle', toggleNavLink);
router.delete('/nav-links/:id', deleteNavLink);
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);
router.use('/marketing', require('./adminMarketing'));
router.get('/whatsapp/integration', whatsappIntegrationController.getIntegration);
router.put('/whatsapp/integration', whatsappIntegrationController.putIntegration);
router.post('/whatsapp/test-connection', whatsappIntegrationController.postTestConnection);
router.get('/whatsapp/message-templates', whatsappIntegrationController.listApprovedTemplates);

module.exports = router;
