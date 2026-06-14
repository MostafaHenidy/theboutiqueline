const { Order, Payment, User, OrderItem } = require('../models');
const {
  createPaymobCheckoutSession,
  loadPaymobConfig,
  verifyTransactionHmac,
} = require('../integrations/paymob');

const { resolveStorefrontBaseUrl } = require('../utils/storefrontUrl');

function frontendBase() {
  return resolveStorefrontBaseUrl().replace(/\/+$/, '');
}

function backendPublicBase() {
  const explicit = process.env.BACKEND_URL || process.env.API_PUBLIC_URL;
  if (explicit) return String(explicit).replace(/\/+$/, '');

  const front = frontendBase();
  if (/localhost|127\.0\.0\.1/.test(front)) {
    return `http://127.0.0.1:${process.env.PORT || 5001}`;
  }
  return front;
}

async function findOrderForPaymob({ order_id, order_number, guest_email, user_id }) {
  const where = {};
  if (order_id) where.id = order_id;
  else if (order_number) where.order_number = order_number;
  else return null;

  const order = await Order.findOne({
    where,
    include: [
      { model: OrderItem, as: 'items', required: false },
      { model: Payment, as: 'payment', required: false },
      { model: User, as: 'user', attributes: ['id', 'email'], required: false },
    ],
  });
  if (!order) return null;
  if (order.payment_method !== 'paymob') return null;

  if (user_id) {
    if (order.user_id !== user_id) return null;
    return order;
  }

  const emailNorm = String(guest_email || '').trim().toLowerCase();
  if (!emailNorm || String(order.guest_email || '').trim().toLowerCase() !== emailNorm) return null;
  return order;
}

async function markOrderPaid(order, transactionId) {
  const previousStatus = order.status;
  order.payment_status = 'paid';
  if (order.status === 'pending') order.status = 'confirmed';
  await order.save();

  await Payment.update(
    {
      status: 'completed',
      paid_at: new Date(),
      transaction_id: transactionId ? String(transactionId) : undefined,
    },
    { where: { order_id: order.id } },
  );

  await order.reload({
    include: [
      { model: require('../models').OrderItem, as: 'items' },
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

  return order;
}

exports.initPaymobPayment = async (req, res, next) => {
  try {
    const order_id = req.body?.order_id;
    const order_number = req.body?.order_number;
    const guest_email = req.body?.guest_email;

    const order = await findOrderForPaymob({
      order_id,
      order_number,
      guest_email,
      user_id: req.user?.id,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    const billingEmail =
      order.guest_email
      || order.user?.email
      || order.shipping_address?.email
      || guest_email;

    const apiBase = backendPublicBase();
    const redirectUrl = `${apiBase}/api/orders/paymob/return?order_number=${encodeURIComponent(order.order_number)}`;
    const notificationUrl = `${apiBase}/api/orders/paymob/webhook`;

    const session = await createPaymobCheckoutSession({
      order,
      billingEmail,
      redirectUrl,
      notificationUrl,
    });

    await Payment.update(
      {
        method: 'paymob',
        status: 'pending',
        notes: JSON.stringify({ paymob_order_id: session.paymob_order_id }),
      },
      { where: { order_id: order.id } },
    );

    res.json({
      success: true,
      data: {
        iframe_url: session.iframe_url,
        order_number: order.order_number,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Paymob init failed' });
  }
};

/** Paymob processed callback (server-to-server) */
exports.paymobWebhook = async (req, res) => {
  try {
    const cfg = await loadPaymobConfig();
    const payload = { ...req.query, ...req.body };
    const obj = payload.obj && typeof payload.obj === 'string'
      ? JSON.parse(payload.obj)
      : (payload.obj || payload);
    const tx = { ...obj, hmac: payload.hmac || obj.hmac };

    if (cfg.hmacSecret && tx.hmac && !verifyTransactionHmac(tx, cfg.hmacSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid HMAC' });
    }

    const merchantOrderId = obj?.order?.merchant_order_id || obj?.merchant_order_id;
    if (!merchantOrderId) return res.status(400).json({ success: false, message: 'Missing order reference' });

    const order = await Order.findOne({ where: { order_number: String(merchantOrderId) } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const success = obj.success === true || obj.success === 'true';
    if (success) {
      await markOrderPaid(order, obj.id);
    } else {
      await Payment.update({ status: 'failed' }, { where: { order_id: order.id } });
      order.payment_status = 'failed';
      await order.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.warn('[paymob] webhook error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Browser return after payment (redirect callback) */
exports.paymobReturn = async (req, res) => {
  try {
    const cfg = await loadPaymobConfig();
    const payload = { ...req.query, ...req.body };
    const obj = payload.obj && typeof payload.obj === 'string'
      ? JSON.parse(payload.obj)
      : (payload.obj || payload);
    const tx = { ...obj, hmac: payload.hmac || obj.hmac };

    const merchantOrderId = obj?.order?.merchant_order_id || payload.merchant_order_id;
    const orderNumber = merchantOrderId || payload.order_number;
    const base = frontendBase();

    if (!orderNumber) {
      return res.redirect(`${base}/?paymob=missing_order`);
    }

    if (cfg.hmacSecret && tx.hmac && !verifyTransactionHmac(tx, cfg.hmacSecret)) {
      return res.redirect(`${base}/order-confirmed/${encodeURIComponent(orderNumber)}?paymob=invalid`);
    }

    const order = await Order.findOne({ where: { order_number: String(orderNumber) } });
    if (order && (obj.success === true || obj.success === 'true')) {
      await markOrderPaid(order, obj.id);
      return res.redirect(`${base}/order-confirmed/${encodeURIComponent(orderNumber)}?paymob=success`);
    }

    if (order) {
      await Payment.update({ status: 'failed' }, { where: { order_id: order.id } });
      order.payment_status = 'failed';
      await order.save();
    }

    return res.redirect(`${base}/order-confirmed/${encodeURIComponent(orderNumber)}?paymob=failed`);
  } catch (err) {
    console.warn('[paymob] return error:', err.message);
    return res.redirect(`${frontendBase()}/?paymob=error`);
  }
};
