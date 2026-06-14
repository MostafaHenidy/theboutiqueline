const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define(
  'MarketingEventLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    marketing_integration_id: { type: DataTypes.INTEGER, allowNull: true },
    provider: { type: DataTypes.STRING(32), allowNull: false },
    event_name: { type: DataTypes.STRING(80), allowNull: false },
    event_id: { type: DataTypes.STRING(120), allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      defaultValue: 'pending',
    },
    http_status: { type: DataTypes.INTEGER, allowNull: true },
    request_payload: { type: DataTypes.JSON, allowNull: true },
    response_body: { type: DataTypes.TEXT, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    retry_of_log_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'marketing_event_logs' }
);
