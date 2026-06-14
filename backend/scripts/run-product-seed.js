#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/models');
const { seedDemoProducts } = require('../src/seed/demoProducts');

(async () => {
  try {
    await sequelize.authenticate();
    await seedDemoProducts();
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
