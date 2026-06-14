const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductVariant = sequelize.define('ProductVariant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  sku: { type: DataTypes.STRING(100) },
  size: { type: DataTypes.STRING(20) },
  color: { type: DataTypes.STRING(50) },
  color_hex: { type: DataTypes.STRING(10) },
  price_adjustment: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  image: { type: DataTypes.STRING(500) },
}, { tableName: 'product_variants' });

module.exports = ProductVariant;
