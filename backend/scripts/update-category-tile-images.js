#!/usr/bin/env node
/** Update homepage category tile images by slug (static /photos paths). */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../src/models');
const { Category } = require('../src/models');

const TILE_IMAGES = {
  'womens-clothing': '/photos/cat-womens-clothing.jpg',
  'mens-clothing': '/photos/cat-mens-clothing.jpg',
  accessories: '/photos/cat-accessories.jpg',
  'childrens-clothing': '/photos/cat-childrens-clothing.jpg',
};

async function main() {
  await sequelize.authenticate();
  for (const [slug, image] of Object.entries(TILE_IMAGES)) {
    const [count] = await Category.update({ image }, { where: { slug } });
    console.log(`${slug} → ${image} (${count ? 'updated' : 'not found'})`);
  }
  await sequelize.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
