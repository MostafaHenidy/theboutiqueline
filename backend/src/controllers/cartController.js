const { Cart, CartItem, Product, ProductVariant, Coupon } = require('../models');
const { resolveAvailableStock, resolveLineVariant } = require('../utils/productVariants');
const { nestedStorefrontProductInclude } = require('../utils/productIncludes');
const { productAttributesOption } = require('../utils/adaptProductSchema');
const { Op } = require('sequelize');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) cart = await Cart.create({ user_id: userId });
  return cart;
};

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: CartItem, as: 'items',
        include: [nestedStorefrontProductInclude(1)],
      }],
    });
    res.json({ success: true, data: cart || { items: [] } });
  } catch (err) { next(err); }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1, size, color, variant_id } = req.body;
    const product = await Product.findByPk(product_id, {
      ...(productAttributesOption(Product) ? { attributes: productAttributesOption(Product) } : {}),
      include: [{ model: ProductVariant, as: 'variants' }],
    });
    if (!product || !product.is_active) return res.status(404).json({ success: false, message: 'Product not found' });

    const line = resolveLineVariant(product, size, color, variant_id);
    const qty = parseInt(quantity, 10) || 1;
    const available = await resolveAvailableStock(product, line.size, line.color, line.variant_id);
    if (available < qty) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    const cart = await getOrCreateCart(req.user.id);
    const existingItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id,
        size: line.size || null,
        color: line.color || null,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (available < newQty) return res.status(400).json({ success: false, message: 'Insufficient stock' });
      existingItem.quantity = newQty;
      if (line.variant_id) existingItem.variant_id = line.variant_id;
      await existingItem.save();
    } else {
      await CartItem.create({
        cart_id: cart.id,
        product_id,
        quantity: qty,
        size: line.size,
        color: line.color,
        variant_id: line.variant_id,
      });
    }
    res.json({ success: true, message: 'Added to cart' });
  } catch (err) { next(err); }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const cart = await Cart.findOne({ where: { user_id: req.user.id } });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = await CartItem.findOne({ where: { id, cart_id: cart.id } });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (quantity <= 0) {
      await item.destroy();
      return res.json({ success: true, message: 'Item removed' });
    }
    item.quantity = quantity;
    await item.save();
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) { next(err); }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cart = await Cart.findOne({ where: { user_id: req.user.id } });
    const item = await CartItem.findOne({ where: { id, cart_id: cart?.id } });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    await item.destroy();
    res.json({ success: true, message: 'Item removed' });
  } catch (err) { next(err); }
};

exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ where: { user_id: req.user.id } });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.id } });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) { next(err); }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const now = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        is_active: true,
        [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }],
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gte]: now } }],
      },
    });
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }
    if (subtotal < coupon.min_order_amount) {
      return res.status(400).json({ success: false, message: `Minimum order amount is ${coupon.min_order_amount} EGP` });
    }
    let discount = coupon.type === 'percentage' ? (subtotal * coupon.value / 100) : coupon.value;
    if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
    res.json({ success: true, data: { coupon_id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount: parseFloat(discount.toFixed(2)) } });
  } catch (err) { next(err); }
};
