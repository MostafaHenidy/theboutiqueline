/**
 * Sequelize CLI database config (migrate / seed).
 * Mirrors env used by {@link ../src/config/database.js}.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dialect = process.env.DB_DIALECT || 'mysql';

function build() {
  if (dialect === 'sqlite') {
    return {
      dialect: 'sqlite',
      storage: path.join(__dirname, '..', 'miskwear.sqlite'),
      logging: false,
      define: { timestamps: true, underscored: true },
    };
  }

  return {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    define: { timestamps: true, underscored: true },
  };
}

module.exports = {
  development: build(),
  test: build(),
  production: build(),
};
