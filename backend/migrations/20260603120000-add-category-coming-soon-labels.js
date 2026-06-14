'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('categories');
    } catch {
      return;
    }
    if (!desc.coming_soon_label_en) {
      await queryInterface.addColumn('categories', 'coming_soon_label_en', {
        type: Sequelize.STRING(80),
        allowNull: true,
      });
    }
    if (!desc.coming_soon_label_ar) {
      await queryInterface.addColumn('categories', 'coming_soon_label_ar', {
        type: Sequelize.STRING(80),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('categories');
      if (desc.coming_soon_label_en) {
        await queryInterface.removeColumn('categories', 'coming_soon_label_en');
      }
      if (desc.coming_soon_label_ar) {
        await queryInterface.removeColumn('categories', 'coming_soon_label_ar');
      }
    } catch {
      /* noop */
    }
  },
};
