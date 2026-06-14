'use strict';

/**
 * Older SQLite/MySQL DBs may lack guest checkout columns defined in Order.js.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('orders');
    if (!desc.guest_name) {
      await queryInterface.addColumn('orders', 'guest_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!desc.guest_email) {
      await queryInterface.addColumn('orders', 'guest_email', {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('orders').catch(() => ({}));
    if (desc.guest_name) await queryInterface.removeColumn('orders', 'guest_name');
    if (desc.guest_email) await queryInterface.removeColumn('orders', 'guest_email');
  },
};
