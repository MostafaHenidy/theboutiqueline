/**
 * Lightweight helpers for emitting normalized ecommerce payloads from controllers.
 */

const marketingDispatcher = require('./marketingDispatcher');

const { normalizeEventInput, browserFromExpressReq } = require('./normalizeEvent');

exports.fireServerPurchase = async ({
  req,
  order,
  items,
  user,
  currency,
}) => {
  const normalized = normalizeEventInput({
    event_name: 'Purchase',
    currency: currency || order.currency || 'EGP',
    value: Number(order.total),
    order_id: order.order_number || String(order.id),
    transaction_id: order.order_number || String(order.id),
    contents: (items || []).map((li) => ({
      product_id: li.product_id,
      sku: li.sku,
      quantity: li.quantity,
      price: li.unit_price,
      title: li.name_en || li.name_ar,
    })),
    product_ids: (items || []).map((li) => li.product_id || li.id).filter(Boolean),
    user: {
      external_id: user?.id ?? order.user_id ?? `guest:${order.id}`,
      email: user?.email || order.guest_email,
      phone: user?.phone || order.shipping_address?.phone || order.guest_phone,
      first_name: user?.name || order.guest_name,
    },
    browser: browserFromExpressReq(req || {}),
  });

  marketingDispatcher.dispatchToConnectedProviders(normalized, { enqueueRetry: true }).catch((err) => {
    console.error('[marketing-tracking] Purchase dispatch:', err.message);
  });
};

exports.fireServerCheckoutStart = ({
  req,
  user,
  value,
  contents,
}) => {
  const normalized = normalizeEventInput({
    event_name: 'InitiateCheckout',
    currency: 'EGP',
    value,
    contents,
    user: user
      ? { external_id: user.id, email: user.email, phone: user.phone, first_name: user.name }
      : undefined,
    browser: browserFromExpressReq(req || {}),
  });

  marketingDispatcher.dispatchToConnectedProviders(normalized, { enqueueRetry: false }).catch((err) => {
    console.error('[marketing-tracking] Checkout dispatch:', err.message);
  });
};
