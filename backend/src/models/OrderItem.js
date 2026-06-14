const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER },
  name_ar: { type: DataTypes.STRING(200) },
  name_en: { type: DataTypes.STRING(200) },
  sku: { type: DataTypes.STRING(100) },
  size: { type: DataTypes.STRING(20) },
  color: { type: DataTypes.STRING(50) },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  image: { type: DataTypes.STRING(500) },
}, { tableName: 'order_items' });

module.exports = OrderItem;
