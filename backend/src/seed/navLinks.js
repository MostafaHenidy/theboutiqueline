const REMOVED_NAV_SLUGS = ['browse', 'all', 'apparel', 'sneakers', 'collectibles', 'trading-cards', 'about'];

const DEFAULT_NAV_LINKS = [
  { label_en: 'Brands', label_ar: 'ماركات', slug: 'brands', href: '/products?nav=brands', link_type: 'browse', filter_config: {}, sort_order: 1 },
  { label_en: 'Trending', label_ar: 'رائج', slug: 'trending', href: '/products?nav=trending', link_type: 'browse', filter_config: { best_sellers: true }, sort_order: 2 },
  { label_en: 'New', label_ar: 'جديد', slug: 'new', href: '/products?nav=new', link_type: 'browse', filter_config: { new_arrivals: true }, sort_order: 3 },
  { label_en: 'Deals', label_ar: 'عروض', slug: 'deals', href: '/products?nav=deals', link_type: 'browse', filter_config: { on_sale: true }, sort_order: 4 },
  { label_en: 'Men', label_ar: 'رجالي', slug: 'men', href: '/products?nav=men', link_type: 'browse', filter_config: { gender: 'men' }, sort_order: 5 },
  { label_en: 'Women', label_ar: 'نسائي', slug: 'women', href: '/products?nav=women', link_type: 'browse', filter_config: { gender: 'women' }, sort_order: 6 },
  { label_en: 'Kids', label_ar: 'أطفال', slug: 'kids', href: '/products?nav=kids', link_type: 'browse', filter_config: { category_slug: 'childrens-clothing' }, sort_order: 7 },
  { label_en: 'Shoes', label_ar: 'أحذية', slug: 'shoes', href: '/products?nav=shoes', link_type: 'browse', filter_config: { category_slug: 'shoes' }, sort_order: 8 },
  { label_en: 'Accessories', label_ar: 'إكسسوارات', slug: 'accessories', href: '/products?nav=accessories', link_type: 'browse', filter_config: { category_slug: 'accessories' }, sort_order: 9 },
  { label_en: 'More', label_ar: 'المزيد', slug: 'more', href: '/products?nav=more', link_type: 'browse', filter_config: {}, sort_order: 10 },
];

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function serializeNavLink(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    ...plain,
    filter_config: parseJsonField(plain.filter_config, {}),
    product_ids: parseJsonField(plain.product_ids, []),
  };
}

async function seedNavLinks() {
  const { NavLink } = require('../models');

  await NavLink.destroy({ where: { slug: REMOVED_NAV_SLUGS } });

  for (const row of DEFAULT_NAV_LINKS) {
    const [link, created] = await NavLink.findOrCreate({
      where: { slug: row.slug },
      defaults: {
        ...row,
        filter_config: JSON.stringify(row.filter_config || {}),
        product_ids: '[]',
        is_active: true,
      },
    });

    if (!created) {
      await link.update({
        label_en: row.label_en,
        label_ar: row.label_ar,
        href: row.href,
        link_type: row.link_type,
        sort_order: row.sort_order,
      });
    }
  }
}

module.exports = { seedNavLinks, serializeNavLink, parseJsonField, DEFAULT_NAV_LINKS, REMOVED_NAV_SLUGS };
