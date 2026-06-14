/**
 * منتجات تجريبية لكل فئة فرعية — روابط صور مُختبرَة (رد 200 من Unsplash).
 * Idempotent حسب slug المنتج.
 */
const { Product, ProductImage, Subcategory } = require('../models');

/** مجموعة صور أزياء / ملابس مُعتمدة (تحقّقنا من توفرها) */
const IMG_POOL = [
  'photo-1595777457583-95e059d581b8', // elegant dress
  'photo-1543163521-1bf539c55dd2', // retail rails
  'photo-1515886657613-9f3515b0c78f', // model fashion
  'photo-1434389677669-e08b4cac3105', // hangers / clothing
  'photo-1521572163474-6864f9cf17ab', // plain tee flat
  'photo-1490481651871-ab68de25d43d', // fabric folded
  'photo-1522335789203-aabd1fc54bc9', // product flatlay
  'photo-1556909114-f6e7ad7d3136', // outfit flatlay
  'photo-1551488831-00ddcb6c6bd3', // group fashion
  'photo-1539109136881-3be0616acf4b', // street style fashion
];

const img = (poolIndex, w = 1200) => {
  const id = IMG_POOL[((poolIndex % IMG_POOL.length) + IMG_POOL.length) % IMG_POOL.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
};

const paletteWomen = ['أسود / Black', 'بيج / Beige', 'كحلي / Navy', 'زيتوني / Olive'];
const paletteMen = ['أبيض / White', 'أسود / Black', 'رمادي / Gray', 'كحلي / Navy'];
const paletteKids = ['أبيض ثلجي', 'وردي Soft', 'سماوي', 'أخضر فاتح'];
const sizesAdult = ['S', 'M', 'L', 'XL'];
const sizesKids = ['4Y', '6Y', '8Y', '10Y', '12Y'];

/**
 * @param specs - { slug, sku, name_ar, name_en, price, sale_price?, thumbI, imgs: number[], is_* ? }
 */
const BY_SUB = {
  'reception-jalabiyat': [
    { slug: 'jalabiyat-satin-falahi-gold', sku: 'RJL-001', name_ar: 'جلابية استقبال ساتان فلاحي', name_en: 'Satin Falahi Reception Jalabiya', price: 349, sale_price: 299, thumbI: 0, imgs: [0, 1, 5], colors: paletteWomen, is_on_sale: true },
    { slug: 'jalabiyat-embroidery-dusty-rose', sku: 'RJL-002', name_ar: 'جلابية مطرزة وردي غبار', name_en: 'Embroidered Dusty Rose Jalabiya', price: 389, thumbI: 2, imgs: [2, 3, 6], colors: paletteWomen },
  ],
  'outdoor-abayas': [
    { slug: 'abaya-outdoor-crepe-classic', sku: 'OAB-001', name_ar: 'عباية خروج كريب كلاسيك', name_en: 'Classic Crepe Outdoor Abaya', price: 279, thumbI: 1, imgs: [1, 0, 4], colors: paletteWomen },
    { slug: 'abaya-outdoor-wrap-belt', sku: 'OAB-002', name_ar: 'عباية لف بحزام', name_en: 'Wrap Abaya with Belt', price: 319, sale_price: 269, thumbI: 3, imgs: [3, 2, 5], colors: paletteWomen, is_on_sale: true, is_best_seller: true },
  ],
  'embroidered-abayas': [
    { slug: 'abaya-hand-embroidery-front', sku: 'EAB-001', name_ar: 'عباية مطرزة يدوياً', name_en: 'Hand Embroidered Abaya', price: 459, thumbI: 2, imgs: [2, 5, 7], colors: paletteWomen },
    { slug: 'abaya-floral-embroidered-sleeves', sku: 'EAB-002', name_ar: 'عباية مطرز الأكمام', name_en: 'Embroidered Sleeve Abaya', price: 429, thumbI: 6, imgs: [6, 0, 8], colors: paletteWomen },
  ],
  'open-abayas': [
    { slug: 'open-abaya-light-cardigan', sku: 'OPN-001', name_ar: 'عباية مفتوحة خفيفة', name_en: 'Light Open Cardigan Abaya', price: 249, thumbI: 7, imgs: [7, 1, 4], colors: paletteWomen },
    { slug: 'open-abaya-kimono-style', sku: 'OPN-002', name_ar: 'عباية مفتوحة كيمونو', name_en: 'Kimono Style Open Abaya', price: 289, thumbI: 8, imgs: [8, 3, 9], colors: paletteWomen },
  ],
  'plain-abayas': [
    { slug: 'plain-abaya-essential-black', sku: 'PLN-001', name_ar: 'عباية سادة أساسية', name_en: 'Essential Plain Abaya', price: 199, thumbI: 0, imgs: [0, 4, 6], colors: paletteWomen, is_best_seller: true },
    { slug: 'plain-abaya-soft-jersey', sku: 'PLN-002', name_ar: 'عباية سادة جيرسي ناعم', name_en: 'Soft Jersey Plain Abaya', price: 219, thumbI: 5, imgs: [5, 1, 2], colors: paletteWomen },
  ],
  dresses: [
    { slug: 'midi-dress-satin-elegant', sku: 'DRS-001', name_ar: 'فستان ساتان ميدي أنيق', name_en: 'Elegant Satin Midi Dress', price: 399, thumbI: 0, imgs: [0, 2, 9], colors: paletteWomen, is_featured: true },
    { slug: 'wrap-maxi-floral-dress', sku: 'DRS-002', name_ar: 'فستان ماكسي لف بطبعات', name_en: 'Printed Wrap Maxi Dress', price: 359, sale_price: 299, thumbI: 9, imgs: [9, 3, 1], colors: paletteWomen, is_on_sale: true },
  ],
  'womens-pajamas': [
    { slug: 'cotton-pajama-set-sage', sku: 'PAJ-W-001', name_ar: 'طقم بيجامة قطن مريحة', name_en: 'Comfort Cotton Pajama Set', price: 149, thumbI: 4, imgs: [4, 5, 6], colors: paletteWomen },
    { slug: 'modal-lounge-striped-set', sku: 'PAJ-W-002', name_ar: 'طقم منزلي مودال مخطّط', name_en: 'Striped Modal Lounge Set', price: 169, thumbI: 5, imgs: [5, 7, 8], colors: paletteWomen },
  ],
  lingerie: [
    { slug: 'lace-soft-bralette-set', sku: 'LNG-001', name_ar: 'طقم دانتيل ناعم', name_en: 'Soft Lace Bralette Set', price: 189, thumbI: 2, imgs: [2, 6, 8], colors: paletteWomen },
    { slug: 'satin-chemise-minimal', sku: 'LNG-002', name_ar: 'قميص نوم ساتان', name_en: 'Satin Minimal Chemise', price: 159, thumbI: 0, imgs: [0, 7, 3], colors: paletteWomen },
  ],
  'evening-wear': [
    { slug: 'evening-gown-refined-black', sku: 'EVN-001', name_ar: 'فستان سهرة فخم', name_en: 'Refined Evening Gown', price: 899, thumbI: 2, imgs: [2, 0, 9], colors: paletteWomen, is_featured: true },
    { slug: 'cocktail-dress-mini-satin', sku: 'EVN-002', name_ar: 'فستان كوكتيل قصير ساتان', name_en: 'Satin Cocktail Mini Dress', price: 549, thumbI: 8, imgs: [8, 1, 2], colors: paletteWomen },
  ],
  'mens-pants': [
    { slug: 'mens-chino-slim-stone', sku: 'MPT-001', name_ar: 'بنطال شينو سليم', name_en: 'Slim Chino Pants', price: 189, thumbI: 4, imgs: [4, 3, 5], colors: paletteMen },
    { slug: 'mens-joggers-fleece', sku: 'MPT-002', name_ar: 'بنطال جوغر فليس', name_en: 'Fleece Joggers', price: 169, thumbI: 6, imgs: [6, 7, 1], colors: paletteMen },
  ],
  'mens-shirts': [
    { slug: 'mens-oxford-shirt-classic', sku: 'MSH-001', name_ar: 'قميص أكسفورد كلاسيك', name_en: 'Classic Oxford Shirt', price: 149, thumbI: 4, imgs: [4, 5, 3], colors: paletteMen, is_best_seller: true },
    { slug: 'mens-linen-shirt-summer', sku: 'MSH-002', name_ar: 'قميص كتان صيفي', name_en: 'Summer Linen Shirt', price: 179, thumbI: 5, imgs: [5, 6, 8], colors: paletteMen },
  ],
  'mens-suits': [
    { slug: 'mens-two-piece-navy-suit', sku: 'MST-001', name_ar: 'بدلة رجالية كحلي', name_en: 'Navy Two-Piece Suit', price: 899, thumbI: 3, imgs: [3, 8, 9], colors: paletteMen },
    { slug: 'mens-blazer-smart-casual', sku: 'MST-002', name_ar: 'بليزر كاجوال أنيق', name_en: 'Smart Casual Blazer', price: 449, thumbI: 9, imgs: [9, 1, 4], colors: paletteMen },
  ],
  'mens-tracksuits': [
    { slug: 'mens-tracksuit-navy-panel', sku: 'MTK-001', name_ar: 'ترنج رياضي كحلي', name_en: 'Navy Panel Tracksuit', price: 259, thumbI: 7, imgs: [7, 4, 6], colors: paletteMen },
    { slug: 'mens-tracksuit-zip-hoodie', sku: 'MTK-002', name_ar: 'ترنج سحّاب وهودي', name_en: 'Zip Hoodie Tracksuit', price: 289, thumbI: 1, imgs: [1, 6, 8], colors: paletteMen },
  ],
  'kids-outdoor': [
    { slug: 'kids-denim-outdoor-set', sku: 'KDO-001', name_ar: 'طقم جينز خارجي للأطفال', name_en: 'Kids Denim Outdoor Set', price: 129, thumbI: 8, imgs: [8, 2, 1], sizes: sizesKids, colors: paletteKids },
    { slug: 'kids-playday-shirt-shorts', sku: 'KDO-002', name_ar: 'طقم قميص وشورت ألوان', name_en: 'Colourful Shirt & Shorts', price: 119, thumbI: 9, imgs: [9, 3, 4], sizes: sizesKids, colors: paletteKids },
  ],
  'kids-abayas': [
    { slug: 'kids-simple-school-abaya', sku: 'KAB-001', name_ar: 'عباية أطفال بسيطة', name_en: 'Kids Simple Abaya', price: 179, thumbI: 0, imgs: [0, 1, 3], sizes: sizesKids, colors: paletteKids },
    { slug: 'kids-soft-open-abaya', sku: 'KAB-002', name_ar: 'عباية بألوان pastel', name_en: 'Kids Pastel Soft Abaya', price: 159, thumbI: 2, imgs: [2, 5, 7], sizes: sizesKids, colors: paletteKids },
  ],
  'kids-pajamas': [
    { slug: 'kids-cotton-pajama-fun', sku: 'KPJ-001', name_ar: 'بيجامة قطن مريحة', name_en: 'Fun Cotton Pajamas', price: 89, thumbI: 4, imgs: [4, 5, 6], sizes: sizesKids, colors: paletteKids },
    { slug: 'kids-fleece-night-set', sku: 'KPJ-002', name_ar: 'بيجامة فليس لليل', name_en: 'Cozy Fleece Night Set', price: 99, thumbI: 5, imgs: [5, 7, 8], sizes: sizesKids, colors: paletteKids },
  ],
};

async function createProductImages(product, indices) {
  const seen = new Set();
  let order = 0;
  for (const i of indices) {
    const url = img(i);
    if (seen.has(url)) continue;
    seen.add(url);
    await ProductImage.create({
      product_id: product.id,
      url,
      alt_ar: product.name_ar,
      alt_en: product.name_en,
      sort_order: order,
      is_primary: order === 0,
    });
    order += 1;
  }
}

async function upsertOne(row, sub) {
  const thumbIdx = row.thumbI;
  const imageIndices = [thumbIdx, ...(row.imgs || [])];

  const [product, created] = await Product.findOrCreate({
    where: { slug: row.slug },
    defaults: {
      category_id: sub.category_id,
      subcategory_id: sub.id,
      sku: row.sku,
      name_ar: row.name_ar,
      name_en: row.name_en,
      slug: row.slug,
      description_ar: `قطعة من مجموعة «${sub.name_ar}» — خامات مختارة لتناسب طابع مسك والراحة اليومية.`,
      description_en: `From «${sub.name_en}» — fabrics selected for elegance and everyday comfort.`,
      price: row.price,
      sale_price: row.sale_price ?? null,
      stock: row.stock ?? 45,
      thumbnail: img(thumbIdx, 640),
      is_active: true,
      is_featured: !!row.is_featured,
      is_new_arrival: !!row.is_new_arrival,
      is_best_seller: !!row.is_best_seller,
      is_on_sale: !!row.is_on_sale,
      sizes: row.sizes ?? sizesAdult,
      colors: row.colors ?? paletteWomen,
      tags: ['miskwear-demo', sub.slug],
    },
  });

  if (created) await createProductImages(product, imageIndices);
  return created;
}

async function seedDemoProducts() {
  const subs = await Subcategory.findAll();
  const bySlug = Object.fromEntries(subs.map((s) => [s.slug, s]));

  let added = 0;
  let skippedCats = 0;

  for (const [slug, rows] of Object.entries(BY_SUB)) {
    const sub = bySlug[slug];
    if (!sub) {
      skippedCats += 1;
      console.warn(`[seed/products] لا توجد فئة فرعية: ${slug}`);
      continue;
    }
    for (const row of rows) {
      try {
        if (await upsertOne(row, sub)) added += 1;
      } catch (e) {
        console.warn(`[seed/products] تجاهل ${row.slug}:`, e.message);
      }
    }
  }

  console.log(`✅ بذرة المنتجات: تمت إضافة ${added} منتجًا جديدًا (حسب slug). الفئات الناقصة: ${skippedCats}`);
}

module.exports = { seedDemoProducts, BY_SUB };
