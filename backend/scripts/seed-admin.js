/**
 * Ensure an admin user exists (role: admin) and password matches .env.
 * Usage: node scripts/seed-admin.js
 * Requires ADMIN_EMAIL in .env; password defaults to Admin@123456 if ADMIN_PASSWORD unset.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User, Role } = require('../src/models');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  if (!email) {
    console.error('Set ADMIN_EMAIL in .env');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

  await sequelize.authenticate();
  await Role.findOrCreate({
    where: { name: 'admin' },
    defaults: { name: 'admin', permissions: { all: true } },
  });
  const adminRole = await Role.findOne({ where: { name: 'admin' } });
  if (!adminRole) throw new Error('admin role missing');

  const hash = await bcrypt.hash(password, 12);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      name: 'Admin',
      email,
      password: hash,
      role_id: adminRole.id,
      is_active: true,
      email_verified: true,
    },
  });

  if (!created) {
    await user.update({
      password: hash,
      role_id: adminRole.id,
      is_active: true,
      email_verified: true,
    });
  }

  console.log(created ? 'Admin user created.' : 'Admin user updated (password + role refreshed).');
  console.log('Login email:', email);
  console.log('Login password:', password);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
