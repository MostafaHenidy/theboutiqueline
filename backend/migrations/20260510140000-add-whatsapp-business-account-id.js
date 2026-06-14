'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('whatsapp_integrations');
    } catch {
      return;
    }
    if (desc.whatsapp_business_account_id) return;

    await queryInterface.addColumn('whatsapp_integrations', 'whatsapp_business_account_id', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('whatsapp_integrations');
      if (desc.whatsapp_business_account_id) {
        await queryInterface.removeColumn('whatsapp_integrations', 'whatsapp_business_account_id');
      }
    } catch {
      /* noop */
    }
  },
};
