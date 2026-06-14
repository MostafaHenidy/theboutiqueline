const router = require('express').Router();
const ctrl = require('../controllers/landingPageController');
const { protect, authorize } = require('../middleware/auth');
const { landingImageUpload } = require('../config/cloudinary');
const { pickSingleUploadedFile } = require('../middleware/multerMultipartNormalize');

// Public (no auth)
router.get('/public/:slug', ctrl.getPublicLandingPage);
router.post('/track-view/:id', ctrl.trackView);
router.post('/track-conversion/:id', ctrl.trackConversion);

// Admin (protected)
router.use(protect, authorize('admin'));
router.get('/', ctrl.getLandingPages);
router.post('/', ctrl.createLandingPage);
router.post('/upload', landingImageUpload, pickSingleUploadedFile('image'), ctrl.uploadImage);
router.get('/:id/analytics', ctrl.getAnalytics);
router.post('/:id/sections/reorder', ctrl.reorderSections);
router.post('/:id/sections', ctrl.addSection);
router.put('/sections/:sectionId', ctrl.updateSection);
router.delete('/sections/:sectionId', ctrl.deleteSection);
router.get('/:id', ctrl.getLandingPage);
router.put('/:id', ctrl.updateLandingPage);
router.delete('/:id', ctrl.deleteLandingPage);

module.exports = router;
