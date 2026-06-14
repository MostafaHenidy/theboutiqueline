const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreSession = sequelize.define('StoreSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  referrer: { type: DataTypes.STRING(500), allowNull: true },
  utm_source: { type: DataTypes.STRING(100), allowNull: true },
  utm_medium: { type: DataTypes.STRING(100), allowNull: true },
  utm_campaign: { type: DataTypes.STRING(100), allowNull: true },
  device_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'other' },
  country: { type: DataTypes.STRING(80), allowNull: true },
  city: { type: DataTypes.STRING(80), allowNull: true },
  landing_path: { type: DataTypes.STRING(300), allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  last_seen_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'store_sessions' });

module.exports = StoreSession;
