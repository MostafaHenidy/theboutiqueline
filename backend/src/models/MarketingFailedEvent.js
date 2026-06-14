const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Persisted failure row for dashboards and reconciliation; resolves when a retry succeeds.
 */
module.exports = sequelize.define(
  'MarketingFailedEvent',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    marketing_integration_id: { type: DataTypes.INTEGER, allowNull: true },
    provider: { type: DataTypes.STRING(32), allowNull: false },
    event_name: { type: DataTypes.STRING(80), allowNull: false },
    event_id: { type: DataTypes.STRING(120), allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    last_log_id: { type: DataTypes.INTEGER, allowNull: true },
    retries_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'marketing_failed_events',
    indexes: [{ fields: ['provider', 'resolved'], name: 'idx_failed_provider_resolved' }],
  }
);
