#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../src/models');
const { seedCategories } = require('../src/seed/categories');

(async () => {
  try {
    await sequelize.authenticate();
    await seedCategories();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
