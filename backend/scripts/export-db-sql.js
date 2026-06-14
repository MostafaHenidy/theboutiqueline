/**
 * Export local MySQL database to SQL (no mysqldump required).
 * Usage: node scripts/export-db-sql.js [outputPath]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');

const outPath = process.argv[2] || path.join(__dirname, '..', 'tmp', 'local_dump.sql');

function esc(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return mysql.escape(value.toISOString().slice(0, 19).replace('T', ' '));
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  if (typeof value === 'object') return mysql.escape(JSON.stringify(value));
  return mysql.escape(value);
}

async function main() {
  const conn = await mysqlPromise.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME;
  const lines = [
    '-- The Boutique Line local DB export',
    `SET NAMES utf8mb4;`,
    `SET FOREIGN_KEY_CHECKS=0;`,
    `USE \`${dbName}\`;`,
    '',
  ];

  const [tables] = await conn.query('SHOW TABLES');
  const tableKey = `Tables_in_${dbName}`;

  for (const row of tables) {
    const table = row[tableKey];
    const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${createRow['Create Table']};`);
    lines.push('');

    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    if (!rows.length) continue;

    const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values = chunk
        .map((r) => `(${Object.values(r).map(esc).join(', ')})`)
        .join(',\n  ');
      lines.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};`);
    }
    lines.push('');
  }

  lines.push('SET FOREIGN_KEY_CHECKS=1;');
  lines.push('');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  const sizeMb = fs.statSync(outPath).size / (1024 * 1024);
  console.log(`Exported ${tables.length} tables to ${outPath} (${sizeMb.toFixed(2)} MB)`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
