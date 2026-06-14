const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LandingPage = sequelize.define('LandingPage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title_ar: { type: DataTypes.STRING(200), allowNull: false },
  title_en: { type: DataTypes.STRING(200) },
  slug: { type: DataTypes.STRING(250), unique: true, allowNull: false },
  product_id: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  settings: { type: DataTypes.JSON, defaultValue: {} },
  meta_title: { type: DataTypes.STRING(200) },
  meta_description: { type: DataTypes.TEXT },
}, { tableName: 'landing_pages' });

module.exports = LandingPage;
