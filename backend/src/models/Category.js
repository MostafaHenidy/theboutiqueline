const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name_ar: { type: DataTypes.STRING(100), allowNull: false },
  name_en: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  description_ar: { type: DataTypes.TEXT },
  description_en: { type: DataTypes.TEXT },
  image: { type: DataTypes.STRING(500) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  /** Shown large on home when is_active=false, e.g. "(2027)" or "SEP" */
  coming_soon_label_en: { type: DataTypes.STRING(80), allowNull: true },
  coming_soon_label_ar: { type: DataTypes.STRING(80), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  meta_title_ar: { type: DataTypes.STRING(200) },
  meta_title_en: { type: DataTypes.STRING(200) },
  meta_description_ar: { type: DataTypes.TEXT },
  meta_description_en: { type: DataTypes.TEXT },
}, { tableName: 'categories' });

module.exports = Category;
