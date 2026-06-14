const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LandingPageOrder = sequelize.define('LandingPageOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  landing_page_id: { type: DataTypes.INTEGER, allowNull: false },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'landing_page_orders', updatedAt: false });

module.exports = LandingPageOrder;
