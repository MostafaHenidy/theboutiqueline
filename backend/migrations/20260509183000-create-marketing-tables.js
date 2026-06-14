'use strict';

/**
 * Mirrors Sequelize models for deployments that prefer `sequelize-cli db:migrate`.
 * SQLite + MySQL friendly (no ENUM type — store short strings instead).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const set = new Set(tables.map((x) => (typeof x === 'string' ? x : String(x)).toLowerCase()));
    /** Dev DB often already has these from `sequelize.sync`; skip cleanly. */
    if (set.has('marketing_integrations')) {
      return;
    }

    await queryInterface.createTable('marketing_integrations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      provider: { type: Sequelize.STRING(24), allowNull: false, unique: true },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      test_mode: { type: Sequelize.BOOLEAN, defaultValue: false },
      connection_status: { type: Sequelize.STRING(32), defaultValue: 'disconnected' },
      last_sync_at: { type: Sequelize.DATE, allowNull: true },
      last_test_at: { type: Sequelize.DATE, allowNull: true },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      encrypted_credentials: { type: Sequelize.TEXT, allowNull: true },
      iv: { type: Sequelize.STRING(32), allowNull: true },
      auth_tag: { type: Sequelize.STRING(48), allowNull: true },
      secret_version: { type: Sequelize.INTEGER, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('marketing_integration_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      marketing_integration_id: { type: Sequelize.INTEGER, allowNull: false },
      key: { type: Sequelize.STRING(120), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex(
      'marketing_integration_settings',
      ['marketing_integration_id', 'key'],
      { unique: true, name: 'uniq_integration_setting_key' },
    );

    await queryInterface.createTable('marketing_bulk_jobs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'send_full_events' },
      status: { type: Sequelize.STRING(32), defaultValue: 'queued' },
      total: { type: Sequelize.INTEGER, defaultValue: 0 },
      processed: { type: Sequelize.INTEGER, defaultValue: 0 },
      success_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      fail_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      detail: { type: Sequelize.JSON, allowNull: true },
      error: { type: Sequelize.TEXT, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      finished_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('marketing_retry_queue', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      marketing_integration_id: { type: Sequelize.INTEGER, allowNull: true },
      marketing_failed_event_id: { type: Sequelize.INTEGER, allowNull: true },
      event_name: { type: Sequelize.STRING(80), allowNull: false },
      event_id: { type: Sequelize.STRING(120), allowNull: true },
      payload: { type: Sequelize.JSON, allowNull: false },
      attempts: { type: Sequelize.INTEGER, defaultValue: 0 },
      max_attempts: { type: Sequelize.INTEGER, defaultValue: 6 },
      next_attempt_at: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(32), defaultValue: 'pending' },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('marketing_retry_queue', ['status', 'next_attempt_at'], {
      name: 'idx_retry_status_next',
    });

    await queryInterface.createTable('marketing_failed_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      marketing_integration_id: { type: Sequelize.INTEGER, allowNull: true },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      event_name: { type: Sequelize.STRING(80), allowNull: false },
      event_id: { type: Sequelize.STRING(120), allowNull: true },
      payload: { type: Sequelize.JSON, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      last_log_id: { type: Sequelize.INTEGER, allowNull: true },
      retries_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      resolved: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('marketing_failed_events', ['provider', 'resolved'], {
      name: 'idx_failed_provider_resolved',
    });

    await queryInterface.createTable('marketing_event_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      marketing_integration_id: { type: Sequelize.INTEGER, allowNull: true },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      event_name: { type: Sequelize.STRING(80), allowNull: false },
      event_id: { type: Sequelize.STRING(120), allowNull: true },
      status: { type: Sequelize.STRING(24), defaultValue: 'pending' },
      http_status: { type: Sequelize.INTEGER, allowNull: true },
      request_payload: { type: Sequelize.JSON, allowNull: true },
      response_body: { type: Sequelize.TEXT, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      retry_of_log_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_event_logs');
    await queryInterface.dropTable('marketing_failed_events');
    await queryInterface.dropTable('marketing_retry_queue');
    await queryInterface.dropTable('marketing_bulk_jobs');
    await queryInterface.dropTable('marketing_integration_settings');
    await queryInterface.dropTable('marketing_integrations');
  },
};
