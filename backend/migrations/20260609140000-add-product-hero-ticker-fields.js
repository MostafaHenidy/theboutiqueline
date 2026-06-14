'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('products');
    } catch {
      return;
    }
    if (!desc.is_hero_ticker) {
      await queryInterface.addColumn('products', 'is_hero_ticker', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!desc.hero_ticker_order) {
      await queryInterface.addColumn('products', 'hero_ticker_order', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('products');
      if (desc.is_hero_ticker) {
        await queryInterface.removeColumn('products', 'is_hero_ticker');
      }
      if (desc.hero_ticker_order) {
        await queryInterface.removeColumn('products', 'hero_ticker_order');
      }
    } catch {
      /* noop */
    }
  },
};
