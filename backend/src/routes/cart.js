const router = require('express').Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart, applyCoupon } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Coupon validation is anonymous (code + subtotal only)
router.post('/coupon', applyCoupon);

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.put('/items/:id', protect, updateCartItem);
router.delete('/items/:id', protect, removeFromCart);
router.delete('/clear', protect, clearCart);

module.exports = router;
