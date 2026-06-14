const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NavLink = sequelize.define('NavLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  label_en: { type: DataTypes.STRING(100), allowNull: false },
  label_ar: { type: DataTypes.STRING(100) },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  href: { type: DataTypes.STRING(300), allowNull: false },
  link_type: { type: DataTypes.ENUM('browse', 'page'), defaultValue: 'browse' },
  filter_config: { type: DataTypes.TEXT, defaultValue: '{}' },
  product_ids: { type: DataTypes.TEXT, defaultValue: '[]' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'nav_links' });

module.exports = NavLink;
