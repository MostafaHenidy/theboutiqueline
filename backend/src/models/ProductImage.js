const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductImage = sequelize.define('ProductImage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false },
  public_id: { type: DataTypes.STRING(300) },
  alt_ar: { type: DataTypes.STRING(200) },
  alt_en: { type: DataTypes.STRING(200) },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'product_images' });

module.exports = ProductImage;
