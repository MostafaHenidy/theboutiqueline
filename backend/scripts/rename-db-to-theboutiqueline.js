/**
 * Move all tables from "the boutiqueline" → theboutiqueline (drops empty target if needed).
 * Run: node scripts/rename-db-to-theboutiqueline.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const OLD_DB = 'the boutiqueline';
const NEW_DB = 'theboutiqueline';

async function countProducts(c, db) {
  try {
    const [rows] = await c.query(`SELECT COUNT(*) AS n FROM \`${db}\`.products`);
    return Number(rows[0].n) || 0;
  } catch {
    return -1;
  }
}

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const [oldDb] = await c.query('SHOW DATABASES LIKE ?', [OLD_DB]);
  if (!oldDb.length) {
    const [newDb] = await c.query('SHOW DATABASES LIKE ?', [NEW_DB]);
    if (newDb.length) {
      const n = await countProducts(c, NEW_DB);
      console.log(`✅ Only "${NEW_DB}" exists (${n} products). Nothing to migrate.`);
      await c.end();
      return;
    }
    console.error(`❌ Neither "${OLD_DB}" nor "${NEW_DB}" found. Import SQL into "${NEW_DB}" in phpMyAdmin.`);
    process.exit(1);
  }

  const [newDb] = await c.query('SHOW DATABASES LIKE ?', [NEW_DB]);
  if (newDb.length) {
    const oldCount = await countProducts(c, OLD_DB);
    const newCount = await countProducts(c, NEW_DB);
    if (newCount > 0 && oldCount === 0) {
      console.log(`✅ "${NEW_DB}" already has ${newCount} products. No migration needed.`);
      await c.end();
      return;
    }
    if (oldCount > 0) {
      console.log(`ℹ️  "${OLD_DB}" has ${oldCount} products; "${NEW_DB}" has ${newCount}. Replacing empty target…`);
      await c.query(`DROP DATABASE \`${NEW_DB}\``);
    } else {
      console.log(`✅ "${NEW_DB}" already exists and source is empty.`);
      await c.end();
      return;
    }
  }

  await c.query(
    `CREATE DATABASE \`${NEW_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  const [tables] = await c.query(`SHOW TABLES FROM \`${OLD_DB}\``);
  const tableKey = `Tables_in_${OLD_DB.replace(/ /g, '_')}`;
  const names = tables.map((row) => row[tableKey] || row[Object.keys(row)[0]]);

  for (const name of names) {
    await c.query(
      `RENAME TABLE \`${OLD_DB}\`.\`${name}\` TO \`${NEW_DB}\`.\`${name}\``,
    );
    console.log(`  moved: ${name}`);
  }

  await c.query(`DROP DATABASE \`${OLD_DB}\``);
  const finalCount = await countProducts(c, NEW_DB);
  console.log(`✅ Moved ${names.length} tables to "${NEW_DB}" (${finalCount} products). Removed "${OLD_DB}".`);
  await c.end();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
