const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
  });
  const [dbs] = await c.query('SHOW DATABASES');
  for (const row of dbs) {
    const db = row.Database;
    if (!/boutique|misk/i.test(db)) continue;
    try {
      const [t] = await c.query(`SELECT COUNT(*) AS n FROM \`${db}\`.products`);
      console.log(`${db}: ${t[0].n} products`);
    } catch (e) {
      console.log(`${db}: (no products table)`);
    }
  }
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
