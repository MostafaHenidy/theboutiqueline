'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let desc;
    try {
      desc = await queryInterface.describeTable('subcategories');
    } catch {
      return;
    }
    if (!desc.parent_id) {
      await queryInterface.addColumn('subcategories', 'parent_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'subcategories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
      await queryInterface.addIndex('subcategories', ['category_id', 'parent_id'], {
        name: 'subcategories_category_parent_idx',
      });
    }
  },

  async down(queryInterface) {
    try {
      const desc = await queryInterface.describeTable('subcategories');
      if (desc.parent_id) {
        await queryInterface.removeIndex('subcategories', 'subcategories_category_parent_idx').catch(() => {});
        await queryInterface.removeColumn('subcategories', 'parent_id');
      }
    } catch {
      /* noop */
    }
  },
};
