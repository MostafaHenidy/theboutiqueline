'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('orders');
    if (!desc.locale) {
      await queryInterface.addColumn('orders', 'locale', {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'en',
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('orders').catch(() => ({}));
    if (desc.locale) await queryInterface.removeColumn('orders', 'locale');
  },
};
