const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * One row per ad platform connection (meta, snapchat, google).
 * Secrets live in encrypted_credentials (AES-256-GCM).
 */
module.exports = sequelize.define(
  'MarketingIntegration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    provider: {
      type: DataTypes.ENUM('meta', 'snapchat', 'google'),
      allowNull: false,
      unique: true,
    },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    test_mode: { type: DataTypes.BOOLEAN, defaultValue: false },
    connection_status: {
      type: DataTypes.ENUM('disconnected', 'connected', 'error', 'testing'),
      defaultValue: 'disconnected',
    },
    last_sync_at: { type: DataTypes.DATE, allowNull: true },
    last_test_at: { type: DataTypes.DATE, allowNull: true },
    last_error: { type: DataTypes.TEXT, allowNull: true },
    /** Base64 ciphertext */
    encrypted_credentials: { type: DataTypes.TEXT, allowNull: true },
    iv: { type: DataTypes.STRING(32), allowNull: true },
    auth_tag: { type: DataTypes.STRING(32), allowNull: true },
    /** Credential schema version for future rotations */
    secret_version: { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { tableName: 'marketing_integrations' }
);
