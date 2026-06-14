const router = require('express').Router();
const { createOrder, createGuestOrder, createStripePaymentIntent, stripeWebhook, getUserOrders, getOrder, getGuestOrderSummary, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const { initPaymobPayment, paymobWebhook, paymobReturn } = require('../controllers/paymobController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const express = require('express');

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
router.post('/paymob/webhook', paymobWebhook);
router.get('/paymob/return', paymobReturn);
router.post('/paymob/return', paymobReturn);
router.post('/paymob/init', optionalAuth, initPaymobPayment);
router.get('/guest/summary/:orderNumber', getGuestOrderSummary);
router.post('/guest', createGuestOrder);
router.post('/', protect, createOrder);
router.post('/payment-intent', protect, createStripePaymentIntent);
router.get('/', protect, getUserOrders);
router.get('/admin', protect, authorize('admin', 'orders_admin'), getAllOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, authorize('admin', 'orders_admin'), updateOrderStatus);

module.exports = router;
