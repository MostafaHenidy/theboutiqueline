/**
 * Canonical storefront categories — upserted on every server start.
 * Images are static paths served from the frontend /photos folder.
 */
const CATEGORY_SEED = [
  {
    slug: 'mens-clothing',
    name_en: "Men's Clothing",
    name_ar: 'ملابس رجالية',
    image: '/photos/vfprU5p4ewa5iy7pKy0FpdX3A.jpg',
    sort_order: 1,
  },
  {
    slug: 'womens-clothing',
    name_en: "Women's Clothing",
    name_ar: 'ملابس نسائية',
    coming_soon_label_en: '(2027)',
    coming_soon_label_ar: '(2027)',
    image: '/photos/klOLqeBgESjqUBiaPQqHCqBgSw.webp',
    sort_order: 2,
    is_active: false,
  },
  {
    slug: 'childrens-clothing',
    name_en: "Children's Clothing",
    name_ar: 'ملابس أطفال',
    coming_soon_label_en: '(2027)',
    coming_soon_label_ar: '(2027)',
    image: '/photos/LIiUpXMeQEBfuNgYYaeO1PyL5BA.jpg',
    sort_order: 3,
    is_active: false,
  },
  {
    slug: 'accessories',
    name_en: 'Accessories',
    name_ar: 'إكسسوارات',
    coming_soon_label_en: '(SEP)',
    coming_soon_label_ar: '(سبتمبر)',
    image: '/photos/mqgBZP4952uBDqPQX6hHfyoX6fM.png',
    sort_order: 4,
    is_active: false,
  },
  {
    slug: 'shoes',
    name_en: 'Shoes',
    name_ar: 'أحذية',
    coming_soon_label_en: '(SEP)',
    coming_soon_label_ar: '(سبتمبر)',
    image: '/photos/v0XCMMD3lRM3TU0xC5O5upOnFM.jpeg',
    sort_order: 5,
    is_active: false,
  },
  {
    slug: 'perfumes',
    name_en: 'Perfumes',
    name_ar: 'عطور',
    coming_soon_label_en: '(SEP)',
    coming_soon_label_ar: '(سبتمبر)',
    image: '/photos/9634.jpg',
    sort_order: 6,
    is_active: false,
  },
];

const ACTIVE_SLUGS = CATEGORY_SEED.map((c) => c.slug);

async function seedCategories() {
  const { Op } = require('sequelize');
  const { Category } = require('../models');

  for (const row of CATEGORY_SEED) {
    const isActive = row.is_active !== false;
    const [category, created] = await Category.findOrCreate({
      where: { slug: row.slug },
      defaults: { ...row, is_active: isActive },
    });
    if (!created) {
      await category.update({
        name_en: row.name_en,
        name_ar: row.name_ar,
        image: row.image,
        sort_order: row.sort_order,
        is_active: isActive,
        coming_soon_label_en: row.coming_soon_label_en ?? null,
        coming_soon_label_ar: row.coming_soon_label_ar ?? null,
      });
    }
  }

  await Category.update(
    { is_active: false },
    { where: { slug: { [Op.notIn]: ACTIVE_SLUGS } } },
  );

  console.log(`✅ Categories seeded (${CATEGORY_SEED.length} active)`);
}

module.exports = { seedCategories, CATEGORY_SEED };
