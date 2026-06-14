const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(50) },
  title_ar: { type: DataTypes.STRING(200) },
  title_en: { type: DataTypes.STRING(200) },
  body_ar: { type: DataTypes.TEXT },
  body_en: { type: DataTypes.TEXT },
  data: { type: DataTypes.JSON },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: { type: DataTypes.DATE },
}, { tableName: 'notifications' });

module.exports = Notification;
