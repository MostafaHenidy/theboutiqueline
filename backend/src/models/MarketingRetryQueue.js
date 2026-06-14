const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define(
  'MarketingRetryQueue',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    provider: { type: DataTypes.STRING(32), allowNull: false },
    marketing_integration_id: { type: DataTypes.INTEGER, allowNull: true },
    marketing_failed_event_id: { type: DataTypes.INTEGER, allowNull: true },
    event_name: { type: DataTypes.STRING(80), allowNull: false },
    event_id: { type: DataTypes.STRING(120), allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: false },
    attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    max_attempts: { type: DataTypes.INTEGER, defaultValue: 6 },
    next_attempt_at: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'dead'),
      defaultValue: 'pending',
    },
    last_error: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'marketing_retry_queue',
    indexes: [
      { fields: ['status', 'next_attempt_at'], name: 'idx_retry_status_next' },
    ],
  }
);
