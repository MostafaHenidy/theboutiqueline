/**
 * Create orders-only admin accounts (role: orders_admin).
 * Usage: node scripts/seed-orders-admins.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User, Role } = require('../src/models');

const ORDERS_ADMINS = [
  { name: 'Orders Admin 1', email: 'orders1@theboutiqueline.com', password: 'OrdersAdmin1@2026' },
  { name: 'Orders Admin 2', email: 'orders2@theboutiqueline.com', password: 'OrdersAdmin2@2026' },
  { name: 'Orders Admin 3', email: 'orders3@theboutiqueline.com', password: 'OrdersAdmin3@2026' },
];

async function main() {
  await sequelize.authenticate();

  await Role.findOrCreate({
    where: { name: 'orders_admin' },
    defaults: { name: 'orders_admin', permissions: { orders: true } },
  });
  const ordersRole = await Role.findOne({ where: { name: 'orders_admin' } });
  if (!ordersRole) throw new Error('orders_admin role missing');

  console.log('Orders-only admin accounts:\n');

  for (const account of ORDERS_ADMINS) {
    const hash = await bcrypt.hash(account.password, 12);
    const [user, created] = await User.findOrCreate({
      where: { email: account.email },
      defaults: {
        name: account.name,
        email: account.email,
        password: hash,
        role_id: ordersRole.id,
        is_active: true,
        email_verified: true,
      },
    });

    if (!created) {
      await user.update({
        name: account.name,
        password: hash,
        role_id: ordersRole.id,
        is_active: true,
        email_verified: true,
      });
    }

    console.log(`${created ? 'Created' : 'Updated'}: ${account.email}`);
    console.log(`  Password: ${account.password}\n`);
  }

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
