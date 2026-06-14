#!/usr/bin/env node
/**
 * Copy all rows from miskwear.sqlite into the MySQL DB defined in ../.env (DB_DIALECT=mysql).
 * Expects tables to exist already (run sync-schema.js). Disables FK checks during insert.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

const SQLITE_PATH =
  process.env.SQLITE_IMPORT_PATH?.trim()
  || path.join(__dirname, '..', 'miskwear.sqlite');

function allSQLite(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function sqliteTables(db) {
  const rows = await allSQLite(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  return rows.map((r) => r.name);
}

/** Normalise SQLite cell for mysql2 placeholders */
function cellForMysql(colName, val) {
  if (val === undefined) return null;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'string' && (/^invalid date$/i.test(val.trim()))) return null;
  /** Empty string in optional DECIMAL/FLOAT SQLite columns — MySQL rejects '' */
  if (val === '' && colName && /price|cost|amount|total|tax|discount|fee|rate|percent|commission|deposit|paid|shipping|grand|balance|qty|quantity|average|median|latitude|longitude|conversion|lifetime|spent|earn/i.test(colName)) {
    return null;
  }
  if (typeof val === 'string') {
    const s = val;
    /** Sequelize/SQLite timestamps like `2026-05-08 20:29:53.874 +00:00` */
    if (/^\d{4}-\d{2}-\d{2}/.test(s) && /\s*[+-]\d{2}:\d{2}\s*$/.test(s)) {
      return s.replace(/\s*[+-]\d{2}:\d{2}\s*$/, '').replace('T', ' ').trim();
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
      return s.replace('T', ' ').replace(/\.\d{3}Z?$/, (m) => m.replace('Z', '')).replace(/Z$/, '').trim();
    }
  }
  return val;
}

(async () => {
  if ((process.env.DB_DIALECT || '').toLowerCase() !== 'mysql') {
    // eslint-disable-next-line no-console
    console.error('Set DB_DIALECT=mysql in .env for import.');
    process.exit(1);
  }

  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
    charset: 'utf8mb4',
  });

  const sq = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);

  try {
    const tables = await sqliteTables(sq);
    await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [mysqlTables] = await mysqlConn.query(
      `SELECT TABLE_NAME AS n FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [process.env.DB_NAME],
    );
    const existing = new Set(mysqlTables.map((r) => r.n));

    // Clear MySQL rows (preserve empty schema)
    for (const name of [...existing].reverse()) {
      await mysqlConn.query(`DELETE FROM \`${name}\``);
    }

    let total = 0;
    for (const table of tables) {
      if (!existing.has(table)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping ${table}: not present in MySQL after sync`);
        continue;
      }
      const rows = await allSQLite(sq, `SELECT * FROM \`${table}\``);
      if (!rows.length) continue;

      const cols = Object.keys(rows[0]);

      const batchSize = 300;
      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const placeholders = chunk
          .map(() => `(${cols.map(() => '?').join(',')})`)
          .join(',');
        const vals = chunk.flatMap((row) =>
          cols.map((c) => cellForMysql(c, row[c])),
        );
        await mysqlConn.query(
          `INSERT INTO \`${table}\` (${cols.map((c) => '`' + c + '`').join(',')}) VALUES ${placeholders}`,
          vals,
        );
      }

      total += rows.length;
      // eslint-disable-next-line no-console
      console.log(`Imported ${table}: ${rows.length} rows`);
    }

    await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1');

    await sq.close();
    await mysqlConn.end();
    // eslint-disable-next-line no-console
    console.log(`Done. Rows inserted (sum of tables): ${total}`);
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await sq.close();
    await mysqlConn.end();
    process.exit(1);
  }
})();
