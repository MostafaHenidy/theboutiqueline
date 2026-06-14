#!/usr/bin/env node
/** Create MySQL tables from Sequelize models (no alter). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    // eslint-disable-next-line no-console
    console.log('Schema synced.');
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  }
})();
