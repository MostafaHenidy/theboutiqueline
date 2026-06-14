const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(20) },
  password: { type: DataTypes.STRING(255), allowNull: false },
  avatar: { type: DataTypes.STRING(500) },
  role_id: { type: DataTypes.INTEGER, defaultValue: 2 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp: { type: DataTypes.STRING(10) },
  otp_expires: { type: DataTypes.DATE },
  reset_token: { type: DataTypes.STRING(255) },
  reset_token_expires: { type: DataTypes.DATE },
  last_login: { type: DataTypes.DATE },
}, { tableName: 'users' });

module.exports = User;
