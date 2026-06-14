const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LandingPageSection = sequelize.define('LandingPageSection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  landing_page_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('hero', 'product', 'features', 'countdown', 'text', 'image', 'testimonials', 'stats', 'cta', 'gallery'),
    allowNull: false,
  },
  content: { type: DataTypes.JSON, defaultValue: {} },
  settings: { type: DataTypes.JSON, defaultValue: {} },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'landing_page_sections' });

module.exports = LandingPageSection;
