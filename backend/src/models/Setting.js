const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT },
  group: { type: DataTypes.STRING(50), defaultValue: 'general' },
  type: { type: DataTypes.ENUM('string','number','boolean','json'), defaultValue: 'string' },
  label_ar: { type: DataTypes.STRING(200) },
  label_en: { type: DataTypes.STRING(200) },
}, { tableName: 'settings' });

module.exports = Setting;
