const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order, OrderItem, Payment, Cart, CartItem, Product, ProductVariant, Coupon, Setting, User } = require('../models');
const { generateOrderNumber } = require('../utils/generateToken');
const { sendOrderConfirmationEmail } = require('../utils/sendEmail');
const { resolveCustomerEmail, normalizeInvoiceEmailCandidate } = require('../utils/orderCustomerEmail');
const { buildAttributionFromSession, recordPurchaseEvent } = require('../services/storeAnalyticsService');
const { resolveAvailableStock, decrementStock, findMatchingVariant, resolveLineVariant } = require('../utils/productVariants');
const { nestedStorefrontProductInclude } = require('../utils/productIncludes');
const { supportsOrderLocale } = require('../utils/adaptProductSchema');
const { normalizeEmailLocale } = require('../utils/emailTemplate');

function readOrderLocale(body) {
  return normalizeEmailLocale(body?.locale || body?.language);
}

function orderPayloadWithLocale(orderLike, body) {
  const locale = readOrderLocale(body);
  if (!locale) return orderLike;
  if (orderLike && typeof orderLike.get === 'function') {
    return { ...orderLike.get({ plain: true }), locale };
  }
  return { ...orderLike, locale };
}

function buildOrderRecord(base, body) {
  const record = { ...base };
  if (supportsOrderLocale(Order)) {
    record.locale = readOrderLocale(body);
  }
  return record;
}

async function attachAnalyticsToOrder(body) {
  const sessionId = body?.analytics_session_id || body?.session_id;
  if (!sessionId) {
    return { channel: 'direct', channel_label: 'Direct', label: 'Direct' };
  }
  const attr = await buildAttributionFromSession(sessionId);
  return attr || { channel: 'direct', channel_label: 'Direct', label: 'Direct' };
}

function readTaxRatePercent(value, fallback = 15) {
  if (value == null || value === '') return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

/** Persist customer invoice email inside shipping/billing JSON for notifications + history */
function attachInvoiceFallbackEmail(addrLike, fallbackEmail) {
  const out = addrLike && typeof addrLike === 'object' ? { ...addrLike } : {};
  const fb = fallbackEmail !== undefined && fallbackEmail !== null ? String(fallbackEmail).trim() : '';
  if (!fb.includes('@')) return out;
  if (!normalizeInvoiceEmailCandidate(out.email) && !normalizeInvoiceEmailCandidate(out.contact_email)) out.email = fb;
  return out;
}

exports.createOrder = async (req, res, next) => {
  try {
    const { shipping_address, billing_address, payment_method, coupon_id, notes } = req.body;
    const shipping = attachInvoiceFallbackEmail(shipping_address, req.user?.email);
    const billing = attachInvoiceFallbackEmail(billing_address || shipping_address, req.user?.email);
    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [{ model: CartItem, as: 'items', include: [nestedStorefrontProductInclude()] }],
    });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    let subtotal = 0;
    const items = cart.items.map(item => {
      const price = item.product.sale_price || item.product.price;
      const total = price * item.quantity;
      subtotal += total;
      return {
        product_id: item.product_id,
        name_ar: item.product.name_ar,
        name_en: item.product.name_en,
        sku: item.product.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: price,
        total_price: total,
        image: item.product.thumbnail,
        variant_id: item.variant_id || null,
      };
    });

    const shippingCostSetting = await Setting.findOne({ where: { key: 'shipping_cost' } });
    const freeShippingThresholdSetting = await Setting.findOne({ where: { key: 'free_shipping_threshold' } });
    const taxRateSetting = await Setting.findOne({ where: { key: 'tax_rate' } });
    const threshold = parseFloat(freeShippingThresholdSetting?.value || 5000);
    const baseShipping = parseFloat(shippingCostSetting?.value ?? 50);
    const shippingCost = subtotal >= threshold ? 0 : baseShipping;
    const taxRate = readTaxRatePercent(taxRateSetting?.value) / 100;

    let discountAmount = 0;
    if (coupon_id) {
      const coupon = await Coupon.findByPk(coupon_id);
      if (coupon) {
        discountAmount = coupon.type === 'percentage' ? subtotal * coupon.value / 100 : coupon.value;
        if (coupon.max_discount_amount) discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
        coupon.used_count += 1;
        await coupon.save();
      }
    }

    const taxableAmount = subtotal - discountAmount + shippingCost;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    const attribution = await attachAnalyticsToOrder(req.body);

    const order = await Order.create(buildOrderRecord({
      order_number: generateOrderNumber(),
      user_id: req.user.id,
      coupon_id: coupon_id || null,
      status: 'pending',
      subtotal, discount_amount: discountAmount, shipping_cost: shippingCost, tax_amount: taxAmount, total,
      payment_method, shipping_address: shipping, billing_address: billing, notes,
      attribution,
    }, req.body));

    await OrderItem.bulkCreate(items.map(i => ({ ...i, order_id: order.id })));
    await Payment.create({ order_id: order.id, method: payment_method, amount: total, status: 'pending' });
    await CartItem.destroy({ where: { cart_id: cart.id } });

    for (const item of cart.items) {
      await decrementStock(item.product_id, item.quantity, {
        size: item.size,
        color: item.color,
        variant_id: item.variant_id,
      });
      await Product.increment('sales_count', { by: item.quantity, where: { id: item.product_id } });
    }

    try {
      const recipient = resolveCustomerEmail(order, { requestUser: req.user });
      if (recipient) await sendOrderConfirmationEmail(recipient, orderPayloadWithLocale(order, req.body));
    } catch {}

    try {
      const { fireServerPurchase } = require('../integrations/trackEcommerceEvent');
      fireServerPurchase({
        req,
        order,
        items,
        user: req.user,
        currency: order.currency,
      });
    } catch (trackErr) {
      console.warn('[marketing-tracking] Purchase hook:', trackErr.message);
    }

    try {
      const { notifyOrderWhatsApp } = require('../integrations/whatsapp/notify');
      await notifyOrderWhatsApp(order, 'pending');
    } catch (_) { /* noop */ }

    try {
      const sid = req.body?.analytics_session_id || req.body?.session_id;
      if (sid) await recordPurchaseEvent(sid, order.id, total);
    } catch (_) { /* noop */ }

    res.status(201).json({ success: true, message: 'Order placed successfully', data: { order_id: order.id, order_number: order.order_number, total, payment_method } });
  } catch (err) { next(err); }
};

exports.createGuestOrder = async (req, res, next) => {
  try {
    const { shipping_address, billing_address, payment_method, notes, items: cartItems, guest_name, guest_email } = req.body;
    if (!cartItems?.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!guest_name || !guest_email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    const shippingCostSetting = await Setting.findOne({ where: { key: 'shipping_cost' } });
    const taxRateSetting = await Setting.findOne({ where: { key: 'tax_rate' } });
    const freeShippingThreshold = await Setting.findOne({ where: { key: 'free_shipping_threshold' } });
    const shippingThreshold = parseFloat(freeShippingThreshold?.value || 5000);
    const taxRate = readTaxRatePercent(taxRateSetting?.value) / 100;

    let subtotal = 0;
    const items = [];
    for (const ci of cartItems) {
      const product = await Product.findByPk(ci.product_id, {
        include: [{ model: ProductVariant, as: 'variants' }],
      });
      if (!product) continue;
      const line = resolveLineVariant(product, ci.size, ci.color, ci.variant_id);
      const available = await resolveAvailableStock(product, line.size, line.color, line.variant_id);
      if (available < ci.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name_en || product.name_ar}` });
      }
      const price = parseFloat(product.sale_price || product.price);
      const total = price * ci.quantity;
      subtotal += total;
      items.push({
        product_id: product.id,
        name_ar: product.name_ar,
        name_en: product.name_en,
        sku: product.sku,
        size: line.size,
        color: line.color,
        quantity: ci.quantity,
        unit_price: price,
        total_price: total,
        image: product.thumbnail,
        variant_id: line.variant_id,
      });
    }
    if (!items.length) return res.status(400).json({ success: false, message: 'No valid products' });

    const shippingCost = subtotal >= shippingThreshold ? 0 : parseFloat(shippingCostSetting?.value ?? 50);
    const taxableAmount = subtotal + shippingCost;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;

    const shipping = attachInvoiceFallbackEmail(shipping_address, guest_email);
    const billing = attachInvoiceFallbackEmail(billing_address || shipping_address, guest_email);

    const attribution = await attachAnalyticsToOrder(req.body);

    const order = await Order.create(buildOrderRecord({
      order_number: generateOrderNumber(),
      user_id: null, guest_name, guest_email,
      status: 'pending',
      subtotal, discount_amount: 0, shipping_cost: shippingCost, tax_amount: taxAmount, total,
      payment_method, shipping_address: shipping, billing_address: billing, notes,
      attribution,
    }, req.body));

    await OrderItem.bulkCreate(items.map(i => ({ ...i, order_id: order.id })));
    await Payment.create({ order_id: order.id, method: payment_method, amount: total, status: 'pending' });

    for (const item of items) {
      await decrementStock(item.product_id, item.quantity, {
        size: item.size,
        color: item.color,
        variant_id: item.variant_id,
      });
      await Product.increment('sales_count', { by: item.quantity, where: { id: item.product_id } });
    }

    try {
      const { fireServerPurchase } = require('../integrations/trackEcommerceEvent');
      fireServerPurchase({
        req,
        order,
        items,
        user: null,
        currency: order.currency,
      });
    } catch (trackErr) {
      console.warn('[marketing-tracking] Purchase hook:', trackErr.message);
    }

    try {
      const recipient = resolveCustomerEmail(order);
      if (recipient) await sendOrderConfirmationEmail(recipient, orderPayloadWithLocale(order, req.body));
    } catch (_) { /* noop */ }

    try {
      const { notifyOrderWhatsApp } = require('../integrations/whatsapp/notify');
      await notifyOrderWhatsApp(order, 'pending');
    } catch (_) { /* noop */ }

    try {
      const sid = req.body?.analytics_session_id || req.body?.session_id;
      if (sid) await recordPurchaseEvent(sid, order.id, total);
    } catch (_) { /* noop */ }

    res.status(201).json({ success: true, message: 'Order placed successfully', data: { order_id: order.id, order_number: order.order_number, total, payment_method } });
  } catch (err) { next(err); }
};

exports.createStripePaymentIntent = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    const order = await Order.findOne({ where: { id: order_id, user_id: req.user.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const currencyRow = await Setting.findOne({ where: { key: 'currency' } });
    let stripeCurrency = String(currencyRow?.value || process.env.APP_CURRENCY_STRIPE || 'egp').toLowerCase();
    if (!/^[a-z]{3}$/.test(stripeCurrency)) stripeCurrency = 'egp';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: stripeCurrency,
      metadata: { order_id: order.id, order_number: order.order_number },
    });

    await Payment.update({ stripe_payment_intent_id: paymentIntent.id }, { where: { order_id } });
    res.json({ success: true, client_secret: paymentIntent.client_secret });
  } catch (err) { next(err); }
};

exports.stripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const order = await Order.findByPk(pi.metadata.order_id, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false },
        ],
      });
      if (order) {
        const previousStatus = order.status;
        order.payment_status = 'paid';
        order.status = 'confirmed';
        await order.save();
        await Payment.update({ status: 'completed', paid_at: new Date(), transaction_id: pi.id }, { where: { order_id: order.id } });
        await order.reload({
          include: [
            { model: OrderItem, as: 'items' },
            { model: Payment, as: 'payment', required: false },
            { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false },
          ],
        });
        try {
          const { notifyOrderWhatsApp } = require('../integrations/whatsapp/notify');
          await notifyOrderWhatsApp(order, 'confirmed');
        } catch (_) { /* noop */ }
        try {
          const { notifyOrderStatusEmail } = require('../utils/orderCustomerEmail');
          await notifyOrderStatusEmail(order, { previousStatus });
        } catch (_) { /* noop */ }
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { count, rows } = await Order.findAndCountAll({
      where: { user_id: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      where: { id, user_id: req.user.id },
      include: [{ model: OrderItem, as: 'items' }, { model: Payment, as: 'payment' }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

/** Public: guest order confirmation — requires matching guest email (query). */
exports.getGuestOrderSummary = async (req, res, next) => {
  try {
    const orderNumber = decodeURIComponent(String(req.params.orderNumber || '').trim());
    const emailNorm = String(req.query.email || '').trim().toLowerCase();
    if (!orderNumber) return res.status(400).json({ success: false, message: 'Order number required' });
    if (!emailNorm) return res.status(400).json({ success: false, message: 'Email is required' });

    const order = await Order.findOne({
      where: { order_number: orderNumber, user_id: null },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payment', required: false },
      ],
    });
    if (!order || String(order.guest_email || '').trim().toLowerCase() !== emailNorm) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, payment_method, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (payment_method) where.payment_method = payment_method;
    if (search) where.order_number = { [require('sequelize').Op.like]: `%${search}%` };
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payment', required: false },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const previousStatus = order.status;
    order.status = status;
    if (tracking_number) order.tracking_number = tracking_number;
    if (status === 'shipped') order.shipped_at = new Date();
    if (status === 'delivered') order.delivered_at = new Date();
    if (status === 'cancelled') order.cancelled_at = new Date();
    await order.save();
    await order.reload({
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payment', required: false },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false },
      ],
    });
    let orderEmailPayload;
    try {
      const { notifyOrderStatusEmail } = require('../utils/orderCustomerEmail');
      orderEmailPayload = await notifyOrderStatusEmail(order, { previousStatus });
    } catch (emailErr) {
      console.warn('[email] status notify:', emailErr.message || String(emailErr));
      orderEmailPayload = { sent: false, skipped: 'exception' };
    }
    let whatsappPayload;
    try {
      const { notifyOrderWhatsApp } = require('../integrations/whatsapp/notify');
      const wa = await notifyOrderWhatsApp(order, status);
      whatsappPayload = wa.sent
        ? {
            sent: true,
            to_masked: wa.to_masked,
            ...(wa.message_id ? { message_id: wa.message_id } : {}),
            ...(wa.recipient_wa_id ? { recipient_wa_id: wa.recipient_wa_id } : {}),
            ...(wa.recipient_digits_hint ? { recipient_digits_hint: wa.recipient_digits_hint } : {}),
          }
        : {
            sent: false,
            reason: wa.reason,
            hint_ar: wa.hint_ar,
            hint_en: wa.hint_en,
            ...(wa.api_error ? { api_error: wa.api_error } : {}),
            ...(wa.facebook_code != null ? { facebook_code: wa.facebook_code } : {}),
            ...(wa.template_name_sent ? { template_name_sent: wa.template_name_sent } : {}),
            ...(wa.language_code_sent ? { language_code_sent: wa.language_code_sent } : {}),
          };
    } catch (waErr) {
      const msg = waErr.message || String(waErr);
      console.warn('[whatsapp] notify exception:', msg);
      whatsappPayload = {
        sent: false,
        reason: 'exception',
        hint_ar: 'حدث خطأ تقني أثناء محاولة إرسال الواتساب.',
        hint_en: msg.slice(0, 500),
      };
    }
    res.json({ success: true, message: 'Order status updated', data: order, whatsapp: whatsappPayload, customer_email: orderEmailPayload });
  } catch (err) { next(err); }
};
