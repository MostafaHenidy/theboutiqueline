'use strict';

/** Add paymob to payment_method ENUM on orders and payments tables */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`orders\`
      MODIFY COLUMN \`payment_method\`
      ENUM('stripe','cod','bank_transfer','paymob') NOT NULL
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE \`payments\`
      MODIFY COLUMN \`method\`
      ENUM('stripe','cod','bank_transfer','paymob') NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE \`orders\` SET \`payment_method\` = 'cod' WHERE \`payment_method\` = 'paymob'
    `);
    await queryInterface.sequelize.query(`
      UPDATE \`payments\` SET \`method\` = 'cod' WHERE \`method\` = 'paymob'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE \`orders\`
      MODIFY COLUMN \`payment_method\`
      ENUM('stripe','cod','bank_transfer') NOT NULL
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE \`payments\`
      MODIFY COLUMN \`method\`
      ENUM('stripe','cod','bank_transfer') NOT NULL
    `);
  },
};
