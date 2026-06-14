const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Single-row style config for Meta WhatsApp Cloud API / Business messages.
 */
module.exports = sequelize.define(
  'WhatsAppIntegration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    phone_number_id: { type: DataTypes.STRING(80), allowNull: true },
    /** WABA numeric ID — used to list approved message templates via Graph API. Find in Meta: WhatsApp → API Setup. */
    whatsapp_business_account_id: { type: DataTypes.STRING(64), allowNull: true },
    graph_api_version: { type: DataTypes.STRING(20), defaultValue: 'v21.0' },
    /** Leading country calling code for customer phones (digits only, no +), e.g. 966, 971 — used when normalizing checkout numbers for Cloud API `to`. */
    phone_country_code: { type: DataTypes.STRING(15), defaultValue: '966', allowNull: false },
    encrypted_credentials: { type: DataTypes.TEXT, allowNull: true },
    iv: { type: DataTypes.STRING(32), allowNull: true },
    auth_tag: { type: DataTypes.STRING(32), allowNull: true },
    template_config: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
    connection_status: { type: DataTypes.STRING(30), defaultValue: 'disconnected' },
    last_error: { type: DataTypes.TEXT, allowNull: true },
    last_sent_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'whatsapp_integrations' }
);
