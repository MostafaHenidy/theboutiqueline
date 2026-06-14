const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoreEvent = sequelize.define('StoreEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: { type: DataTypes.STRING(64), allowNull: false },
  event_name: { type: DataTypes.STRING(50), allowNull: false },
  path: { type: DataTypes.STRING(300), allowNull: true },
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'store_events', updatedAt: false });

module.exports = StoreEvent;
