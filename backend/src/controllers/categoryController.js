const { Category, Subcategory, Product } = require('../models');
const slugify = require('../utils/slugify');
const {
  buildSubcategoryTree,
  validateParentAssignment,
} = require('../utils/subcategoryTree');

async function loadAllSubcategories(where = {}) {
  return Subcategory.findAll({
    where,
    order: [['sort_order', 'ASC'], ['id', 'ASC']],
  });
}

function attachSubcategoryTrees(categories, flatSubs) {
  const subsByCategory = new Map();
  for (const sub of flatSubs) {
    const plain = typeof sub.toJSON === 'function' ? sub.toJSON() : sub;
    const catId = plain.category_id;
    if (!subsByCategory.has(catId)) subsByCategory.set(catId, []);
    subsByCategory.get(catId).push(plain);
  }

  return categories.map((cat) => {
    const plain = typeof cat.toJSON === 'function' ? cat.toJSON() : { ...cat };
    const catSubs = subsByCategory.get(plain.id) || [];
    return { ...plain, subcategories: buildSubcategoryTree(catSubs) };
  });
}

/** Storefront: all categories; subcategories filtered to active only, nested tree. */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    const flatSubs = await loadAllSubcategories({ is_active: true });
    res.json({ success: true, data: attachSubcategoryTrees(categories, flatSubs) });
  } catch (err) { next(err); }
};

/** Admin: all categories and nested subcategories for management. */
exports.getCategoriesAdmin = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    const flatSubs = await loadAllSubcategories();
    res.json({ success: true, data: attachSubcategoryTrees(categories, flatSubs) });
  } catch (err) { next(err); }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ where: { slug: req.params.slug } });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    const flatSubs = await loadAllSubcategories({ category_id: category.id, is_active: true });
    const data = {
      ...(typeof category.toJSON === 'function' ? category.toJSON() : category),
      subcategories: buildSubcategoryTree(flatSubs.map((s) => (typeof s.toJSON === 'function' ? s.toJSON() : s))),
    };
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name_ar, name_en, ...rest } = req.body;
    const slug = slugify(name_en) + '-' + Date.now();
    const image = req.file ? req.file.path : null;
    const category = await Category.create({ name_ar, name_en, slug, image, ...rest });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    if (req.file) req.body.image = req.file.path;
    await category.update(req.body);
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    await category.destroy();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) { next(err); }
};

exports.createSubcategory = async (req, res, next) => {
  try {
    const { name_ar, name_en, category_id, parent_id, ...rest } = req.body;
    let resolvedCategoryId = category_id;

    if (parent_id) {
      const parent = await Subcategory.findByPk(parent_id);
      if (!parent) return res.status(400).json({ success: false, message: 'Parent subcategory not found' });
      resolvedCategoryId = parent.category_id;
    }

    await validateParentAssignment({
      Subcategory,
      category_id: resolvedCategoryId,
      parent_id,
    });

    const slug = slugify(name_en) + '-' + Date.now();
    const sub = await Subcategory.create({
      name_ar,
      name_en,
      slug,
      category_id: resolvedCategoryId,
      parent_id: parent_id || null,
      ...rest,
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

exports.updateSubcategory = async (req, res, next) => {
  try {
    const sub = await Subcategory.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });

    const nextParentId = req.body.parent_id !== undefined ? req.body.parent_id : sub.parent_id;
    const nextCategoryId = req.body.category_id !== undefined ? req.body.category_id : sub.category_id;

    const validated = await validateParentAssignment({
      Subcategory,
      category_id: nextCategoryId,
      parent_id: nextParentId,
      subcategoryId: sub.id,
    });

    const updates = { ...req.body, ...validated };
    await sub.update(updates);
    res.json({ success: true, data: sub });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

exports.deleteSubcategory = async (req, res, next) => {
  try {
    const sub = await Subcategory.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });

    const childCount = await Subcategory.count({ where: { parent_id: sub.id } });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory with child subcategories. Remove or move children first.',
      });
    }

    const productCount = await Product.count({ where: { subcategory_id: sub.id } });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory linked to products. Reassign products first.',
      });
    }

    await sub.destroy();
    res.json({ success: true, message: 'Subcategory deleted' });
  } catch (err) { next(err); }
};
