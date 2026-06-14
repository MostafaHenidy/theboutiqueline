#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/models');
const { seedCategories } = require('../src/seed/categories');
const { seedStorefrontProducts } = require('../src/seed/storefrontProducts');

(async () => {
  try {
    await sequelize.authenticate();
    await seedCategories();
    await seedStorefrontProducts();
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Storefront product seed failed:', err.message);
    process.exit(1);
  }
})();
