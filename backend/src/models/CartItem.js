const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CartItem = sequelize.define('CartItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cart_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  size: { type: DataTypes.STRING(20) },
  color: { type: DataTypes.STRING(50) },
}, { tableName: 'cart_items' });

module.exports = CartItem;
