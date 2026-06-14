'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const set = new Set(tables.map((x) => (typeof x === 'string' ? x : String(x)).toLowerCase()));

    if (!set.has('store_sessions')) {
      await queryInterface.createTable('store_sessions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        session_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        user_id: { type: Sequelize.INTEGER, allowNull: true },
        referrer: { type: Sequelize.STRING(500), allowNull: true },
        utm_source: { type: Sequelize.STRING(100), allowNull: true },
        utm_medium: { type: Sequelize.STRING(100), allowNull: true },
        utm_campaign: { type: Sequelize.STRING(100), allowNull: true },
        device_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'other' },
        country: { type: Sequelize.STRING(80), allowNull: true },
        city: { type: Sequelize.STRING(80), allowNull: true },
        landing_path: { type: Sequelize.STRING(300), allowNull: true },
        started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('store_sessions', ['started_at'], { name: 'idx_store_sessions_started' });
      await queryInterface.addIndex('store_sessions', ['device_type'], { name: 'idx_store_sessions_device' });
    }

    if (!set.has('store_events')) {
      await queryInterface.createTable('store_events', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        session_id: { type: Sequelize.STRING(64), allowNull: false },
        event_name: { type: Sequelize.STRING(50), allowNull: false },
        path: { type: Sequelize.STRING(300), allowNull: true },
        product_id: { type: Sequelize.INTEGER, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('store_events', ['session_id'], { name: 'idx_store_events_session' });
      await queryInterface.addIndex('store_events', ['event_name', 'created_at'], { name: 'idx_store_events_name_time' });
    }

    const ordersDesc = await queryInterface.describeTable('orders');
    if (ordersDesc && !ordersDesc.attribution) {
      await queryInterface.addColumn('orders', 'attribution', { type: Sequelize.JSON, allowNull: true });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('store_events').catch(() => {});
    await queryInterface.dropTable('store_sessions').catch(() => {});
    await queryInterface.removeColumn('orders', 'attribution').catch(() => {});
  },
};
