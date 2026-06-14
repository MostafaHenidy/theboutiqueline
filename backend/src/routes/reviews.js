const router = require('express').Router();
const { getProductReviews, createReview, approveReview, deleteReview, getAllReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getProductReviews);
router.post('/', protect, createReview);
router.get('/admin', protect, authorize('admin'), getAllReviews);
router.put('/:id/approve', protect, authorize('admin'), approveReview);
router.delete('/:id', protect, authorize('admin'), deleteReview);

module.exports = router;
