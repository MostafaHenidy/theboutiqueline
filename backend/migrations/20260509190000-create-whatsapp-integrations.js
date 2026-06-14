'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const set = new Set(tables.map((x) => (typeof x === 'string' ? x : String(x)).toLowerCase()));
    if (set.has('whatsapp_integrations')) {
      return;
    }

    await queryInterface.createTable('whatsapp_integrations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      phone_number_id: { type: Sequelize.STRING(80), allowNull: true },
      graph_api_version: { type: Sequelize.STRING(20), defaultValue: 'v21.0' },
      encrypted_credentials: { type: Sequelize.TEXT, allowNull: true },
      iv: { type: Sequelize.STRING(48), allowNull: true },
      auth_tag: { type: Sequelize.STRING(48), allowNull: true },
      template_config: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      connection_status: { type: Sequelize.STRING(30), defaultValue: 'disconnected' },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      last_sent_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_integrations');
  },
};
