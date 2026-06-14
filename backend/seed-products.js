/**
 * seed-products.js
 * Run once: node seed-products.js
 * Adds 16 real products to the SQLite database using the photos
 * already in frontend/public/photos/
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sequelize, Product, ProductImage, Category } = require('./src/models');

// Photo base URL (served by Vite dev server / production build)
const PH = (name) => `/photos/${name}`;

const PRODUCTS = [
  // ── MEN (category_id: 2) ──────────────────────────────────────
  {
    category_id: 2,
    name_ar: 'قميص كتان مغسول',
    name_en: 'Washed Linen Overshirt',
    slug: 'washed-linen-overshirt',
    sku: 'TBL-M001',
    description_en: 'Premium washed linen overshirt with a relaxed silhouette. Effortlessly elevated.',
    description_ar: 'قميص كتان مغسول بقصة مريحة وأناقة لا تنتهي.',
    price: 2400,
    sale_price: 1680,
    stock: 30,
    is_active: true,
    is_new_arrival: true,
    is_on_sale: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Beige', 'White']),
    thumbnail: PH('3ZytNmcPnRvgkQrdPfnjNSmUHQ.png'),
  },
  {
    category_id: 2,
    name_ar: 'تيشرت بطبعة جرافيك',
    name_en: 'Relaxed Fit Graphic Tee',
    slug: 'relaxed-fit-graphic-tee',
    sku: 'TBL-M002',
    description_en: 'Bold graphic print on heavyweight cotton. A streetwear essential.',
    description_ar: 'تيشرت قطني ثقيل بطبعة جرافيك جريئة.',
    price: 950,
    stock: 80,
    is_active: true,
    is_new_arrival: true,
    is_featured: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
    colors: JSON.stringify(['Black', 'White']),
    thumbnail: PH('DOI2BlFnOLTaxn4GyYPQRPKIB0.png'),
  },
  {
    category_id: 2,
    name_ar: 'هودي زيبر بريميوم',
    name_en: 'Premium Zip Hoodie',
    slug: 'premium-zip-hoodie',
    sku: 'TBL-M003',
    description_en: 'Full-zip heavyweight hoodie in a slim athletic cut. Built to last.',
    description_ar: 'هودي ثقيل بسحاب كامل وقصة رياضية.',
    price: 2200,
    sale_price: 1760,
    stock: 25,
    is_active: true,
    is_on_sale: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Grey', 'Black', 'Navy']),
    thumbnail: PH('Y4WdVAdjEYoqP3hfDIDIZcs5nQ.png'),
  },
  {
    category_id: 2,
    name_ar: 'هودي هيفي ويت',
    name_en: 'Heavyweight Drop-Shoulder Hoodie',
    slug: 'heavyweight-drop-shoulder-hoodie',
    sku: 'TBL-M004',
    description_en: 'Drop-shoulder heavyweight hoodie for an oversized editorial look.',
    description_ar: 'هودي هيفي ويت بكتف نازل للمظهر الأوفرسايز.',
    price: 1950,
    stock: 40,
    is_active: true,
    is_new_arrival: true,
    is_best_seller: true,
    sizes: JSON.stringify(['M', 'L', 'XL', 'XXL']),
    colors: JSON.stringify(['Off-White', 'Black']),
    thumbnail: PH('US3m591Ba1oBNTKd7x1ZpQRKnco.png'),
  },
  {
    category_id: 2,
    name_ar: 'جاكيت جينز مطرز',
    name_en: 'Embroidered Denim Jacket',
    slug: 'embroidered-denim-jacket',
    sku: 'TBL-M005',
    description_en: 'Heavy-duty denim jacket with embroidered brand detail on the back.',
    description_ar: 'جاكيت جينز بتطريز فريد على الظهر.',
    price: 4500,
    sale_price: 2700,
    stock: 15,
    is_active: true,
    is_on_sale: true,
    is_featured: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Indigo', 'Light Wash']),
    thumbnail: PH('JSSRUPNQJ8ReBMPpOfswqFx54.png'),
  },
  {
    category_id: 2,
    name_ar: 'بنطلون جينز ستريت ليج',
    name_en: 'Straight-Leg Denim Jeans',
    slug: 'straight-leg-denim-jeans',
    sku: 'TBL-M006',
    description_en: 'Classic straight-leg cut in rigid raw denim. A timeless staple.',
    description_ar: 'جينز بقصة مستقيمة كلاسيكية من الدنيم الخام.',
    price: 2200,
    sale_price: 1540,
    stock: 35,
    is_active: true,
    is_on_sale: true,
    is_best_seller: true,
    sizes: JSON.stringify(['28', '30', '32', '34', '36']),
    colors: JSON.stringify(['Raw Indigo', 'Black']),
    thumbnail: PH('B901GlrPeeHwgOEp2oAWcQmY8s.png'),
  },
  {
    category_id: 2,
    name_ar: 'سويتر كنيت سيجنتشر',
    name_en: 'Signature Knit Sweater',
    slug: 'signature-knit-sweater',
    sku: 'TBL-M007',
    description_en: 'Chunky-knit crewneck sweater in a premium wool-blend.',
    description_ar: 'سويتر كنيت بقصة كروينك من مزيج الصوف الفاخر.',
    price: 3200,
    stock: 20,
    is_active: true,
    is_new_arrival: true,
    is_featured: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Cream', 'Charcoal', 'Rust']),
    thumbnail: PH('BJfrkmv0iyiZnReeFBXU944wCT0.webp'),
  },
  {
    category_id: 2,
    name_ar: 'قميص دنيم بريميوم',
    name_en: 'Premium Denim Shirt',
    slug: 'premium-denim-shirt',
    sku: 'TBL-M008',
    description_en: 'Overshirt-weight denim shirt with pearl snap buttons and a boxy cut.',
    description_ar: 'قميص دنيم ثقيل بأزرار لؤلؤية وقصة بوكسي.',
    price: 1980,
    stock: 28,
    is_active: true,
    is_new_arrival: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Light Wash', 'Dark Wash']),
    thumbnail: PH('LIiUpXMeQEBfuNgYYaeO1PyL5BA.jpg'),
  },

  // ── WOMEN (category_id: 1) ────────────────────────────────────
  {
    category_id: 1,
    name_ar: 'تيشرت بطبعة جرافيك نسائي',
    name_en: 'Graphic Print Tee',
    slug: 'women-graphic-print-tee',
    sku: 'TBL-W001',
    description_en: 'Oversized drop-shoulder tee with an editorial graphic. Pure cotton.',
    description_ar: 'تيشرت أوفرسايز بطبعة إيديتوريال من القطن الخالص.',
    price: 850,
    sale_price: 595,
    stock: 60,
    is_active: true,
    is_new_arrival: true,
    is_on_sale: true,
    sizes: JSON.stringify(['XS', 'S', 'M', 'L']),
    colors: JSON.stringify(['White', 'Black', 'Grey']),
    thumbnail: PH('SPZzAXp3MGGvfY6xYZzIzXbt9HI.jpeg'),
  },
  {
    category_id: 1,
    name_ar: 'جينز ستريت 90s نسائي',
    name_en: "90's Straight-Leg Jeans",
    slug: 'womens-90s-straight-jeans',
    sku: 'TBL-W002',
    description_en: 'High-rise straight-leg jeans inspired by 90s denim. Effortless cool.',
    description_ar: 'جينز ستريت ليج بخصر عالٍ مستوحى من تسعينيات الدنيم.',
    price: 2800,
    sale_price: 1960,
    stock: 22,
    is_active: true,
    is_on_sale: true,
    is_featured: true,
    sizes: JSON.stringify(['24', '26', '28', '30']),
    colors: JSON.stringify(['Light Wash', 'Mid Wash']),
    thumbnail: PH('mpHmfjvHxDqVECG0phNtm1stCg.png'),
  },
  {
    category_id: 1,
    name_ar: 'جينز أومبري فلير نسائي',
    name_en: 'Ombré Flare Jeans',
    slug: 'womens-ombre-flare-jeans',
    sku: 'TBL-W003',
    description_en: 'Statement flare-cut jeans with a custom ombré dye. One of a kind.',
    description_ar: 'بنطلون فلير بصبغة أومبري مميزة وفريدة.',
    price: 3100,
    stock: 18,
    is_active: true,
    is_new_arrival: true,
    is_featured: true,
    sizes: JSON.stringify(['24', '26', '28', '30', '32']),
    colors: JSON.stringify(['Blue Ombré']),
    thumbnail: PH('sryKbTpcRyaW7v3XxPsUwHUFyVw.jpeg'),
  },
  {
    category_id: 1,
    name_ar: 'فارسيتي بومبر نسائي',
    name_en: 'Varsity Bomber Jacket',
    slug: 'womens-varsity-bomber',
    sku: 'TBL-W004',
    description_en: 'Wool-body varsity bomber with leather sleeves and contrast ribbing.',
    description_ar: 'جاكيت فارسيتي بومبر من الصوف مع أكمام جلدية.',
    price: 4800,
    sale_price: 3360,
    stock: 12,
    is_active: true,
    is_on_sale: true,
    is_best_seller: true,
    sizes: JSON.stringify(['XS', 'S', 'M', 'L']),
    colors: JSON.stringify(['Black/White', 'Navy/Red']),
    thumbnail: PH('NiRvbSwxwZAIC23FbAJyOeFvbY0.png'),
  },

  // ── Accessories / Mixed ────────────────────────────────────────
  {
    category_id: 1,
    name_ar: 'حقيبة توت كروك-إيفيكت',
    name_en: 'Croc-Effect Tote Bag',
    slug: 'croc-effect-tote-bag',
    sku: 'TBL-A001',
    description_en: 'Structured tote in embossed croc-effect faux leather. Fits everything.',
    description_ar: 'شنطة توت هيكلية من الجلد الصناعي بنقش التمساح.',
    price: 3800,
    sale_price: 2280,
    stock: 20,
    is_active: true,
    is_on_sale: true,
    is_featured: true,
    sizes: JSON.stringify(['One Size']),
    colors: JSON.stringify(['Black', 'Brown', 'White']),
    thumbnail: PH('pKv4Us5BSBO8V6XiEQBTiVJpkM.png'),
  },
  {
    category_id: 2,
    name_ar: 'سنيكر جلد أحمر',
    name_en: 'Red Leather Low-Top Sneaker',
    slug: 'red-leather-low-top-sneaker',
    sku: 'TBL-A002',
    description_en: 'Italian-tanned red leather sneaker with a vulcanized sole.',
    description_ar: 'سنيكر جلد أحمر مدبوغ إيطاليًا بنعل فولكانايزد.',
    price: 3200,
    sale_price: 2240,
    stock: 10,
    is_active: true,
    is_on_sale: true,
    is_featured: true,
    is_best_seller: true,
    sizes: JSON.stringify(['38', '39', '40', '41', '42', '43', '44']),
    colors: JSON.stringify(['Red']),
    thumbnail: PH('v0XCMMD3lRM3TU0xC5O5upOnFM.jpeg'),
  },
  {
    category_id: 2,
    name_ar: 'طقم دنيم فينيل',
    name_en: 'Vinyl Denim Co-ord Set',
    slug: 'vinyl-denim-coord-set',
    sku: 'TBL-M009',
    description_en: 'Matching denim jacket and trouser set with a vinyl-coated finish.',
    description_ar: 'طقم جاكيت وبنطلون دنيم بتشطيب فينيل لامع.',
    price: 2650,
    stock: 15,
    is_active: true,
    is_new_arrival: true,
    is_featured: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Black', 'Dark Wash']),
    thumbnail: PH('CgLTCwizOUrmynOaa9H1WKiL8c.png'),
  },
  {
    category_id: 2,
    name_ar: 'قميص بورغاندي مُنسج',
    name_en: 'Burgundy Textured Overshirt',
    slug: 'burgundy-textured-overshirt',
    sku: 'TBL-M010',
    description_en: 'Richly textured burgundy overshirt in a relaxed, layerable fit.',
    description_ar: 'قميص بورغاندي منسوج بملمس غني وقصة مريحة للتطبيق.',
    price: 1299,
    stock: 35,
    is_active: true,
    is_new_arrival: true,
    is_best_seller: true,
    sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
    colors: JSON.stringify(['Burgundy']),
    thumbnail: PH('grQPT0mJNGR4u9N7bpUUkvk720w.webp'),
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check existing
    const existing = await Product.count();
    if (existing > 0) {
      console.log(`⚠️  Database already has ${existing} product(s). Skipping seed.`);
      console.log('   To re-seed, run: node seed-products.js --force');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
      console.log('   --force detected, clearing products first...');
      await ProductImage.destroy({ where: {} });
      await Product.destroy({ where: {} });
    }

    console.log(`\n📦 Seeding ${PRODUCTS.length} products...\n`);

    for (const data of PRODUCTS) {
      const p = await Product.create(data);

      // Add the thumbnail as a ProductImage too (so detail page gallery works)
      if (p.thumbnail) {
        await ProductImage.create({
          product_id: p.id,
          url: p.thumbnail,
          public_id: p.slug + '-img-1',
          sort_order: 0,
          is_primary: true,
        });
      }

      console.log(`  ✓ [${p.sku}] ${p.name_en}`);
    }

    console.log(`\n🎉 Done! ${PRODUCTS.length} products seeded successfully.`);
    console.log('   Refresh http://localhost:5173/products to see them.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
