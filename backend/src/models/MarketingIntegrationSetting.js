const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Non-sensitive tuning flags (batch sizes, webhook URLs). Values are plain text JSON strings.
 */
module.exports = sequelize.define(
  'MarketingIntegrationSetting',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    marketing_integration_id: { type: DataTypes.INTEGER, allowNull: false },
    key: { type: DataTypes.STRING(120), allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'marketing_integration_settings',
    indexes: [{ unique: true, fields: ['marketing_integration_id', 'key'], name: 'uniq_integration_setting_key' }],
  }
);
