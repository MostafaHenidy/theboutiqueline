'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('products');
    } catch {
      return;
    }
    if (!desc.hero_ticker_image_id) {
      await queryInterface.addColumn('products', 'hero_ticker_image_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('products');
      if (desc.hero_ticker_image_id) {
        await queryInterface.removeColumn('products', 'hero_ticker_image_id');
      }
    } catch {
      /* noop */
    }
  },
};
