/**
 * Storefront demo products — matches Home.jsx static mocks (/photos paths).
 * Upserts by slug so re-running updates prices, flags, and images.
 */
const { Op } = require('sequelize');
const { Product, ProductImage, Category } = require('../models');

const PH = (name) => `/photos/${name}`;

function buildRow(row, categoryId) {
  const hasSale = row.sale_price != null && row.sale_price < row.price;
  return {
    category_id: categoryId,
    name_ar: row.name_ar,
    name_en: row.name_en,
    slug: row.slug,
    sku: row.sku,
    description_en: row.description_en || `${row.name_en} — The Boutique Line.`,
    description_ar: row.description_ar || row.name_ar,
    price: row.price,
    sale_price: row.sale_price ?? null,
    stock: row.stock ?? 40,
    thumbnail: row.thumbnail,
    is_active: true,
    is_featured: !!row.is_featured,
    is_new_arrival: !!row.is_new_arrival,
    is_best_seller: !!row.is_best_seller,
    is_on_sale: row.is_on_sale != null ? !!row.is_on_sale : hasSale,
    sizes: JSON.stringify(row.sizes || ['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(row.colors || ['Default']),
  };
}

const STOREFRONT_PRODUCTS = [
  // ── Men (new arrivals + hero + sale + drops) ──
  {
    category: 'mens-clothing',
    slug: 'washed-linen-overshirt',
    sku: 'TBL-M001',
    name_en: 'Washed Linen Overshirt',
    name_ar: 'قميص كتان مغسول',
    price: 2400,
    sale_price: 1680,
    is_new_arrival: true,
    thumbnail: PH('3ZytNmcPnRvgkQrdPfnjNSmUHQ.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'relaxed-fit-tee',
    sku: 'TBL-M002',
    name_en: 'Relaxed Fit Tee',
    name_ar: 'تيشرت بقصة مريحة',
    price: 950,
    is_new_arrival: true,
    thumbnail: PH('DOI2BlFnOLTaxn4GyYPQRPKIB0.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'premium-zip-hoodie',
    sku: 'TBL-M003',
    name_en: 'Premium Zip Hoodie',
    name_ar: 'هودي زيبر بريميوم',
    price: 2200,
    sale_price: 1760,
    is_new_arrival: true,
    thumbnail: PH('Y4WdVAdjEYoqP3hfDIDIZcs5nQ.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'heavyweight-hoodie',
    sku: 'TBL-M004',
    name_en: 'Heavyweight Hoodie',
    name_ar: 'هودي هيفي ويت',
    price: 1950,
    is_new_arrival: true,
    thumbnail: PH('US3m591Ba1oBNTKd7x1ZpQRKnco.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'long-sleeve-shirt',
    sku: 'TBL-M005',
    name_en: 'Long Sleeve Shirt',
    name_ar: 'قميص بأكمام طويلة',
    price: 1299,
    is_new_arrival: true,
    thumbnail: PH('3ZytNmcPnRvgkQrdPfnjNSmUHQ.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'socks-sky',
    sku: 'TBL-M006',
    name_en: 'Socks Sky',
    name_ar: 'جوارب سماوي',
    price: 450,
    is_new_arrival: true,
    thumbnail: PH('6MIsvegyvwYMBVhFkyNRH7g8Jc.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'wide-jeans',
    sku: 'TBL-M007',
    name_en: 'Wide Jeans',
    name_ar: 'جينز واسع',
    price: 2100,
    is_new_arrival: true,
    thumbnail: PH('M1vOWPrCcf5XAWjRTtfzuAOTUI.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'straight-leg-denim',
    sku: 'TBL-M008',
    name_en: 'Straight-Leg Denim',
    name_ar: 'جينز ستريت ليج',
    price: 2200,
    sale_price: 1540,
    is_on_sale: true,
    thumbnail: PH('B901GlrPeeHwgOEp2oAWcQmY8s.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'embroidered-denim-jacket',
    sku: 'TBL-M009',
    name_en: 'Embroidered Denim Jacket',
    name_ar: 'جاكيت جينز مطرز',
    price: 4500,
    sale_price: 2700,
    is_on_sale: true,
    thumbnail: PH('JSSRUPNQJ8ReBMPpOfswqFx54.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'signature-knit-sweater',
    sku: 'TBL-M010',
    name_en: 'Signature Knit Sweater',
    name_ar: 'سويتر كنيت سيجنتشر',
    price: 3200,
    is_new_arrival: true,
    thumbnail: PH('grQPT0mJNGR4u9N7bpUUkvk720w.webp'),
  },
  {
    category: 'mens-clothing',
    slug: 'vinyl-denim-set',
    sku: 'TBL-M011',
    name_en: 'Vinyl Denim Set',
    name_ar: 'طقم دنيم فينيل',
    price: 2650,
    is_new_arrival: true,
    thumbnail: PH('BJfrkmv0iyiZnReeFBXU944wCT0.webp'),
  },
  {
    category: 'mens-clothing',
    slug: 'premium-denim-shirt',
    sku: 'TBL-M012',
    name_en: 'Premium Denim Shirt',
    name_ar: 'قميص دنيم بريميوم',
    price: 1980,
    is_new_arrival: true,
    thumbnail: PH('LIiUpXMeQEBfuNgYYaeO1PyL5BA.jpg'),
  },
  {
    category: 'mens-clothing',
    slug: 'mens-graphic-print-tee',
    sku: 'TBL-M013',
    name_en: 'Graphic Print Tee',
    name_ar: 'تيشرت بطبعة جرافيك',
    price: 990,
    is_new_arrival: true,
    thumbnail: PH('CgLTCwizOUrmynOaa9H1WKiL8c.png'),
  },
  {
    category: 'mens-clothing',
    slug: 'red-leather-sneakers',
    sku: 'TBL-M014',
    name_en: 'Red Leather Sneakers',
    name_ar: 'سنيكر جلد أحمر',
    price: 3200,
    sale_price: 2240,
    is_on_sale: true,
    thumbnail: PH('v0XCMMD3lRM3TU0xC5O5upOnFM.jpeg'),
  },

  // ── Women (new arrivals + sale) ──
  {
    category: 'womens-clothing',
    slug: 'womens-graphic-print-tee',
    sku: 'TBL-W001',
    name_en: 'Graphic Print Tee',
    name_ar: 'تيشرت بطبعة جرافيك نسائي',
    price: 850,
    sale_price: 595,
    is_new_arrival: true,
    thumbnail: PH('SPZzAXp3MGGvfY6xYZzIzXbt9HI.jpeg'),
  },
  {
    category: 'womens-clothing',
    slug: 'womens-90s-straight-jeans',
    sku: 'TBL-W002',
    name_en: "90's Straight Jeans",
    name_ar: 'جينز ستريت 90s',
    price: 2800,
    sale_price: 1960,
    is_new_arrival: true,
    thumbnail: PH('x8Cr5mKpDrdupojxFdCKUAPeOA8.png'),
  },
  {
    category: 'womens-clothing',
    slug: 'womens-ombre-flare-jeans',
    sku: 'TBL-W003',
    name_en: 'Ombré Flare Jeans',
    name_ar: 'جينز أومبري فلير',
    price: 3100,
    is_new_arrival: true,
    thumbnail: PH('mpHmfjvHxDqVECG0phNtm1stCg.png'),
  },
  {
    category: 'womens-clothing',
    slug: 'womens-varsity-bomber',
    sku: 'TBL-W004',
    name_en: 'Varsity Bomber',
    name_ar: 'فارسيتي بومبر',
    price: 4800,
    sale_price: 3360,
    is_new_arrival: true,
    thumbnail: PH('sryKbTpcRyaW7v3XxPsUwHUFyVw.jpeg'),
  },
  {
    category: 'womens-clothing',
    slug: 'croc-effect-tote',
    sku: 'TBL-W005',
    name_en: 'Croc-Effect Tote',
    name_ar: 'حقيبة توت كروك',
    price: 3800,
    sale_price: 2280,
    is_on_sale: true,
    thumbnail: PH('pKv4Us5BSBO8V6XiEQBTiVJpkM.png'),
  },
];

async function syncPrimaryImage(product, url) {
  if (!url) return;
  const [image, created] = await ProductImage.findOrCreate({
    where: { product_id: product.id, is_primary: true },
    defaults: {
      product_id: product.id,
      url,
      public_id: `${product.slug}-primary`,
      sort_order: 0,
      is_primary: true,
    },
  });
  if (!created) await image.update({ url });
}

async function upsertStorefrontProduct(row, categoryBySlug) {
  const cat = categoryBySlug[row.category];
  if (!cat) {
    console.warn(`[storefrontProducts] Skip ${row.slug}: category ${row.category} not found`);
    return null;
  }

  const payload = buildRow(row, cat.id);
  const [product, created] = await Product.findOrCreate({
    where: { slug: row.slug },
    defaults: payload,
  });

  if (!created) await product.update(payload);
  await syncPrimaryImage(product, payload.thumbnail);
  return { product, created };
}

async function seedStorefrontProducts() {
  const categories = await Category.findAll({
    where: { slug: { [Op.in]: ['mens-clothing', 'womens-clothing'] } },
  });
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  if (!categoryBySlug['mens-clothing'] || !categoryBySlug['womens-clothing']) {
    throw new Error('Run npm run seed:categories before seed:products');
  }

  let created = 0;
  let updated = 0;

  for (const row of STOREFRONT_PRODUCTS) {
    const result = await upsertStorefrontProduct(row, categoryBySlug);
    if (!result) continue;
    if (result.created) created += 1;
    else updated += 1;
  }

  console.log(`✅ Storefront products seeded (${created} created, ${updated} updated, ${STOREFRONT_PRODUCTS.length} total)`);
}

module.exports = { seedStorefrontProducts, STOREFRONT_PRODUCTS };
