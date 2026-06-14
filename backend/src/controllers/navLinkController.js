const { NavLink } = require('../models');
const { serializeNavLink, parseJsonField, REMOVED_NAV_SLUGS } = require('../seed/navLinks');

exports.getPublicNavLinks = async (req, res, next) => {
  try {
    const rows = await NavLink.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    const removed = new Set(REMOVED_NAV_SLUGS);
    const data = rows.map(serializeNavLink).filter((link) => !removed.has(link.slug));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAdminNavLinks = async (req, res, next) => {
  try {
    const rows = await NavLink.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: rows.map(serializeNavLink) });
  } catch (err) { next(err); }
};

exports.createNavLink = async (req, res, next) => {
  try {
    const { label_en, label_ar, slug, href, link_type, filter_config, product_ids, is_active, sort_order } = req.body;
    const row = await NavLink.create({
      label_en,
      label_ar: label_ar || label_en,
      slug,
      href,
      link_type: link_type || 'browse',
      filter_config: JSON.stringify(filter_config || {}),
      product_ids: JSON.stringify(product_ids || []),
      is_active: is_active !== false,
      sort_order: sort_order ?? 0,
    });
    res.status(201).json({ success: true, data: serializeNavLink(row) });
  } catch (err) { next(err); }
};

exports.updateNavLink = async (req, res, next) => {
  try {
    const row = await NavLink.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Nav link not found' });

    const updates = {};
    const fields = ['label_en', 'label_ar', 'slug', 'href', 'link_type', 'is_active', 'sort_order'];
    for (const key of fields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.filter_config !== undefined) {
      updates.filter_config = JSON.stringify(req.body.filter_config || {});
    }
    if (req.body.product_ids !== undefined) {
      updates.product_ids = JSON.stringify(req.body.product_ids || []);
    }

    await row.update(updates);
    res.json({ success: true, data: serializeNavLink(row) });
  } catch (err) { next(err); }
};

exports.toggleNavLink = async (req, res, next) => {
  try {
    const row = await NavLink.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Nav link not found' });
    await row.update({ is_active: !row.is_active });
    res.json({ success: true, data: serializeNavLink(row) });
  } catch (err) { next(err); }
};

exports.deleteNavLink = async (req, res, next) => {
  try {
    const row = await NavLink.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Nav link not found' });
    await row.destroy();
    res.json({ success: true, message: 'Nav link deleted' });
  } catch (err) { next(err); }
};

exports.getNavLinkBySlug = async (slug) => {
  const row = await NavLink.findOne({ where: { slug } });
  return row ? serializeNavLink(row) : null;
};

exports.applyNavFilter = async (navSlug, where) => {
  const row = await NavLink.findOne({ where: { slug: navSlug } });
  if (!row) return null;

  const link = serializeNavLink(row);
  const productIds = link.product_ids || [];

  if (productIds.length > 0) {
    const { Op } = require('sequelize');
    where.id = { [Op.in]: productIds };
    return link;
  }

  const filter = link.filter_config || {};
  const { Category } = require('../models');

  if (filter.category) where.category_id = filter.category;
  if (filter.subcategory) where.subcategory_id = filter.subcategory;
  if (filter.gender === 'men' || filter.gender === 'women') {
    const genderSlug = filter.gender === 'men' ? 'mens-clothing' : 'womens-clothing';
    const genderCat = await Category.findOne({ where: { slug: genderSlug } });
    if (genderCat) {
      const catActive = genderCat.is_active !== false && genderCat.is_active !== 0;
      if (!catActive) {
        where.id = -1;
      } else {
        where.category_id = genderCat.id;
      }
    }
  }
  if (filter.category_slug) {
    const cat = await Category.findOne({ where: { slug: filter.category_slug } });
    if (cat) where.category_id = cat.id;
  }
  if (filter.featured) where.is_featured = true;
  if (filter.new_arrivals) where.is_new_arrival = true;
  if (filter.best_sellers) where.is_best_seller = true;
  if (filter.on_sale) where.is_on_sale = true;

  return link;
};
