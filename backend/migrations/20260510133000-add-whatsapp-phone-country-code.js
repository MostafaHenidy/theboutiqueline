'use strict';

/**
 * WhatsApp outbound "to": phone numbers normalized with this leading country calling code (no +).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('whatsapp_integrations');
    } catch {
      return;
    }
    if (desc.phone_country_code) return;

    await queryInterface.addColumn('whatsapp_integrations', 'phone_country_code', {
      type: Sequelize.STRING(15),
      allowNull: false,
      defaultValue: '966',
    });
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('whatsapp_integrations');
      if (desc.phone_country_code) await queryInterface.removeColumn('whatsapp_integrations', 'phone_country_code');
    } catch {
      /* noop */
    }
  },
};
