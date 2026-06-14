const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Address = sequelize.define('Address', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  label: { type: DataTypes.STRING(50) },
  full_name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  country: { type: DataTypes.STRING(100), defaultValue: 'EG' },
  city: { type: DataTypes.STRING(100), allowNull: false },
  district: { type: DataTypes.STRING(100) },
  street: { type: DataTypes.STRING(200) },
  building: { type: DataTypes.STRING(50) },
  postal_code: { type: DataTypes.STRING(20) },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'addresses' });

module.exports = Address;
