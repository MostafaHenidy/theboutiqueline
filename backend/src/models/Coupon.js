const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  type: { type: DataTypes.ENUM('percentage','fixed'), allowNull: false },
  value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  min_order_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  max_discount_amount: { type: DataTypes.DECIMAL(10, 2) },
  usage_limit: { type: DataTypes.INTEGER },
  used_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  user_limit: { type: DataTypes.INTEGER, defaultValue: 1 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  starts_at: { type: DataTypes.DATE },
  expires_at: { type: DataTypes.DATE },
  description_ar: { type: DataTypes.STRING(300) },
  description_en: { type: DataTypes.STRING(300) },
}, { tableName: 'coupons' });

module.exports = Coupon;
