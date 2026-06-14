const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(50), unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  guest_name: { type: DataTypes.STRING(100) },
  guest_email: { type: DataTypes.STRING(150) },
  coupon_id: { type: DataTypes.INTEGER },
  status: {
    type: DataTypes.ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded'),
    defaultValue: 'pending'
  },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  shipping_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(5), defaultValue: 'EGP' },
  payment_method: { type: DataTypes.ENUM('stripe','cod','bank_transfer','paymob'), allowNull: false },
  payment_status: { type: DataTypes.ENUM('pending','paid','failed','refunded'), defaultValue: 'pending' },
  shipping_address: { type: DataTypes.JSON },
  billing_address: { type: DataTypes.JSON },
  notes: { type: DataTypes.TEXT },
  tracking_number: { type: DataTypes.STRING(100) },
  shipped_at: { type: DataTypes.DATE },
  delivered_at: { type: DataTypes.DATE },
  cancelled_at: { type: DataTypes.DATE },
  cancellation_reason: { type: DataTypes.TEXT },
  attribution: { type: DataTypes.JSON, allowNull: true },
  locale: { type: DataTypes.STRING(5), defaultValue: 'en' },
}, { tableName: 'orders' });

module.exports = Order;
