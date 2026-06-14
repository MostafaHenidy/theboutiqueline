'use strict';

/**
 * Guest checkout stores user_id NULL. Older SQLite/MySQL schemas had user_id NOT NULL,
 * causing INSERT failures. Sequelize/sqlite3 surface some NOT NULL violations as
 * SequelizeUniqueConstraintError ("Resource already exists"), which is misleading.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('orders');
    if (desc.user_id?.allowNull) return;

    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS c FROM orders WHERE user_id IS NULL;',
      );
      const c = rows?.[0]?.c ?? rows?.[0]?.count ?? 0;
      if (Number(c) > 0) {
        console.warn(
          '[migrations] Skipping revert: orders with NULL user_id exist (guest orders). Delete them before reverting.',
        );
        return;
      }
    }

    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
