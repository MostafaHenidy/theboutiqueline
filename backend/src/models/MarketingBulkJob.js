const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/** Tracks progress for “Send Full Events” and other bulk marketing operations */
module.exports = sequelize.define(
  'MarketingBulkJob',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'send_full_events' },
    status: {
      type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
      defaultValue: 'queued',
    },
    total: { type: DataTypes.INTEGER, defaultValue: 0 },
    processed: { type: DataTypes.INTEGER, defaultValue: 0 },
    success_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    fail_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    /** Array of recent step outcomes */
    detail: { type: DataTypes.JSON, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    started_at: { type: DataTypes.DATE, allowNull: true },
    finished_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'marketing_bulk_jobs' }
);
