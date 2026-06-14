const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LandingPageView = sequelize.define('LandingPageView', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  landing_page_id: { type: DataTypes.INTEGER, allowNull: false },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.STRING(300) },
}, { tableName: 'landing_page_views', updatedAt: false });

module.exports = LandingPageView;
