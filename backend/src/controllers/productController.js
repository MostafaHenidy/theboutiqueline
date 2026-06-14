const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Subcategory,
  Review,
  User,
  OrderItem,
  Wishlist,
  CartItem,
  LandingPage,
} = require('../models');
const slugify = require('../utils/slugify');
const { syncProductVariants, normalizeVariantsPayload } = require('../utils/productVariants');
const { collectDescendantIds } = require('../utils/subcategoryTree');
const { storefrontProductImagesInclude } = require('../utils/productIncludes');
const { supportsHeroTickerImageId } = require('../utils/adaptProductSchema');
const {
  setHeroTickerImageForProduct,
  clearHeroTickerImageForProduct,
  clearHeroTickerImageForProducts,
  attachHeroTickerImageIds,
  getHeroTickerImageMap,
} = require('../utils/heroTickerImageStore');

async function applySubcategoryFilter(where, subcategory) {
  if (!subcategory) return;
  const allSubs = await Subcategory.findAll({ attributes: ['id', 'parent_id'] });
  const ids = collectDescendantIds(allSubs, subcategory, true);
  if (ids.length === 1) {
    where.subcategory_id = ids[0];
  } else if (ids.length > 1) {
    where.subcategory_id = { [Op.in]: ids };
  }
}

/** Price shown to customers: sale_price when set, otherwise regular price. */
const effectivePriceExpr = () =>
  sequelize.fn('COALESCE', sequelize.col('sale_price'), sequelize.col('price'));

function applyEffectivePriceFilter(where, minPrice, maxPrice) {
  if (!minPrice && !maxPrice) return;
  const priceClauses = [];
  if (minPrice) priceClauses.push(sequelize.where(effectivePriceExpr(), Op.gte, minPrice));
  if (maxPrice) priceClauses.push(sequelize.where(effectivePriceExpr(), Op.lte, maxPrice));
  where[Op.and] = [...(where[Op.and] || []), ...priceClauses];
}

async function nextHeroTickerOrder(excludeId) {
  const where = { is_hero_ticker: true };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const maxOrder = await Product.max('hero_ticker_order', { where });
  if (Number.isFinite(maxOrder)) return maxOrder + 1;
  const count = await Product.count({ where });
  return count + 1;
}

async function persistHeroTickerImageId(productId, imageId) {
  if (supportsHeroTickerImageId(Product)) return;
  if (!productId) return;
  await setHeroTickerImageForProduct(productId, imageId);
}

async function normalizeHeroTickerFields(data, productId) {
  const next = { ...data };
  const hasImageField = Object.prototype.hasOwnProperty.call(data, 'hero_ticker_image_id');

  if (next.is_hero_ticker === true) {
    const order = parseInt(next.hero_ticker_order, 10);
    if (!Number.isFinite(order) || order < 1) {
      next.hero_ticker_order = await nextHeroTickerOrder(productId);
    } else {
      next.hero_ticker_order = order;
    }

    if (hasImageField) {
      if (next.hero_ticker_image_id != null && next.hero_ticker_image_id !== '') {
        const imageId = parseInt(next.hero_ticker_image_id, 10);
        if (!Number.isFinite(imageId)) {
          if (supportsHeroTickerImageId(Product)) next.hero_ticker_image_id = null;
          else await persistHeroTickerImageId(productId, null);
        } else if (!productId) {
          const err = new Error('Slider image can only be set after the product and its images exist');
          err.status = 400;
          throw err;
        } else {
          const image = await ProductImage.findOne({ where: { id: imageId, product_id: productId } });
          if (!image) {
            const err = new Error('Slider image must belong to this product');
            err.status = 400;
            throw err;
          }
          if (supportsHeroTickerImageId(Product)) {
            next.hero_ticker_image_id = imageId;
          } else {
            await persistHeroTickerImageId(productId, imageId);
          }
        }
      } else if (supportsHeroTickerImageId(Product)) {
        next.hero_ticker_image_id = null;
      } else {
        await persistHeroTickerImageId(productId, null);
      }
    }

    if (!supportsHeroTickerImageId(Product)) {
      delete next.hero_ticker_image_id;
    }
  } else if (next.is_hero_ticker === false) {
    next.hero_ticker_order = null;
    if (supportsHeroTickerImageId(Product)) {
      next.hero_ticker_image_id = null;
    } else if (productId) {
      await clearHeroTickerImageForProduct(productId);
    }
    if (!supportsHeroTickerImageId(Product)) {
      delete next.hero_ticker_image_id;
    }
  } else if (!supportsHeroTickerImageId(Product)) {
    delete next.hero_ticker_image_id;
  }

  return next;
}

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, subcategory, search, minPrice, maxPrice, sizes, colors, sort = 'newest', featured, new_arrivals, best_sellers, on_sale, gender, nav, hero_ticker } = req.query;
    const offset = (page - 1) * limit;
    const where = { is_active: true };
    let navLinkMeta = null;

    if (nav) {
      const { applyNavFilter } = require('./navLinkController');
      navLinkMeta = await applyNavFilter(nav, where);
      if (!navLinkMeta) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 },
          nav_link: null,
        });
      }
    }

    if (!nav && category) {
      const catRow = await Category.findByPk(category);
      if (catRow) {
        const catActive = catRow.is_active !== false && catRow.is_active !== 0;
        if (!catActive) {
          return res.json({
            success: true,
            data: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 },
          });
        }
      }
      where.category_id = category;
    }
    if (!nav && (gender === 'men' || gender === 'women')) {
      const slug = gender === 'men' ? 'mens-clothing' : 'womens-clothing';
      const genderCat = await Category.findOne({ where: { slug } });
      if (genderCat) {
        const catActive = genderCat.is_active !== false && genderCat.is_active !== 0;
        if (!catActive) {
          return res.json({
            success: true,
            data: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 },
          });
        }
        where.category_id = genderCat.id;
      }
    }
    if (!nav && subcategory) await applySubcategoryFilter(where, subcategory);
    if (search) where[Op.or] = [{ name_ar: { [Op.like]: `%${search}%` } }, { name_en: { [Op.like]: `%${search}%` } }];
    applyEffectivePriceFilter(where, minPrice, maxPrice);
    if (!nav && featured === 'true') where.is_featured = true;
    if (!nav && new_arrivals === 'true') where.is_new_arrival = true;
    if (!nav && best_sellers === 'true') where.is_best_seller = true;
    if (!nav && on_sale === 'true') where.is_on_sale = true;
    if (!nav && hero_ticker === 'true') where.is_hero_ticker = true;
    if (sizes) {
      const sizeArr = sizes.split(',');
      where.sizes = { [Op.overlap]: sizeArr };
    }

    const orderMap = {
      newest: [['created_at', 'DESC']],
      oldest: [['created_at', 'ASC']],
      price_asc: [[effectivePriceExpr(), 'ASC']],
      price_desc: [[effectivePriceExpr(), 'DESC']],
      popular: [['sales_count', 'DESC']],
      rating: [['rating_avg', 'DESC']],
      hero_ticker: [['hero_ticker_order', 'ASC'], ['id', 'ASC']],
    };

    const resolvedSort = hero_ticker === 'true' ? 'hero_ticker' : sort;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        storefrontProductImagesInclude,
        { model: Category, as: 'category', attributes: ['id', 'name_ar', 'name_en', 'slug'] },
        { model: Subcategory, as: 'subcategory', attributes: ['id', 'name_ar', 'name_en', 'slug'] },
      ],
      order: orderMap[resolvedSort] || orderMap.newest,
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const data = await attachHeroTickerImageIds(rows);

    res.json({
      success: true,
      data,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
      nav_link: navLinkMeta ? { slug: navLinkMeta.slug, label_en: navLinkMeta.label_en, label_ar: navLinkMeta.label_ar } : undefined,
    });
  } catch (err) { next(err); }
};

/** Paginated catalog for admin: all products (active + inactive). */
exports.getAdminProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      search,
      sort = 'newest',
      status,
    } = req.query;
    const pg = parseInt(page, 10) || 1;
    const lim = parseInt(limit, 10) || 20;
    const offset = (pg - 1) * lim;
    const where = {};

    if (category) where.category_id = category;
    if (subcategory) await applySubcategoryFilter(where, subcategory);
    if (search) where[Op.or] = [{ name_ar: { [Op.like]: `%${search}%` } }, { name_en: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }];
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;

    const orderMap = {
      newest: [['created_at', 'DESC']],
      oldest: [['created_at', 'ASC']],
      price_asc: [['price', 'ASC']],
      price_desc: [['price', 'DESC']],
      popular: [['sales_count', 'DESC']],
      rating: [['rating_avg', 'DESC']],
    };

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: ProductImage, as: 'images', limit: 2 },
        { model: Category, as: 'category', attributes: ['id', 'name_ar', 'name_en', 'slug'] },
        { model: Subcategory, as: 'subcategory', attributes: ['id', 'name_ar', 'name_en', 'slug'] },
      ],
      order: orderMap[sort] || orderMap.newest,
      limit: lim,
      offset,
      distinct: true,
    });

    const data = rows.map((row) => {
      const j = row.toJSON();
      if (!j.thumbnail?.trim() && j.images?.[0]?.url) j.thumbnail = j.images[0].url;
      return j;
    });

    res.json({
      success: true,
      data,
      pagination: { total: count, page: pg, limit: lim, pages: Math.ceil(count / lim) },
    });
  } catch (err) { next(err); }
};

/** IDs for “select all” (same filters as admin list). Max 5000. */
exports.getAdminProductIds = async (req, res, next) => {
  try {
    const { search, category, status } = req.query;
    const where = {};
    if (category) where.category_id = category;
    if (search) where[Op.or] = [{ name_ar: { [Op.like]: `%${search}%` } }, { name_en: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }];
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;

    const cap = 5000;
    const rows = await Product.findAll({
      attributes: ['id'],
      where,
      order: [['id', 'DESC']],
      limit: cap,
      raw: true,
    });

    const fullCount = await Product.count({ where });
    const ids = rows.map((r) => r.id);

    res.json({
      success: true,
      ids,
      truncated: fullCount > cap,
      totalMatched: fullCount,
    });
  } catch (err) { next(err); }
};

exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const rawIds = req.body.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const ids = [...new Set(
      rawIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0),
    )];
    if (!ids.length) return res.status(400).json({ success: false, message: 'No valid ids' });

    const referenced = await OrderItem.findAll({
      attributes: ['product_id'],
      where: { product_id: { [Op.in]: ids } },
      raw: true,
    });
    const blocked = new Set(referenced.map((r) => r.product_id));
    const okIds = ids.filter((id) => !blocked.has(id));
    const deactivateIds = ids.filter((id) => blocked.has(id));

    await sequelize.transaction(async (transaction) => {
      if (okIds.length) {
        await CartItem.destroy({ where: { product_id: { [Op.in]: okIds } }, transaction });
        await Wishlist.destroy({ where: { product_id: { [Op.in]: okIds } }, transaction });
        await Review.destroy({ where: { product_id: { [Op.in]: okIds } }, transaction });
        await ProductImage.destroy({ where: { product_id: { [Op.in]: okIds } }, transaction });
        await ProductVariant.destroy({ where: { product_id: { [Op.in]: okIds } }, transaction });
        await LandingPage.update({ product_id: null }, { where: { product_id: { [Op.in]: okIds } }, transaction });
        await Product.destroy({ where: { id: { [Op.in]: okIds } }, transaction });
      }
      if (deactivateIds.length) {
        await Product.update(
          { is_active: false, is_hero_ticker: false, is_featured: false, is_new_arrival: false, is_best_seller: false },
          { where: { id: { [Op.in]: deactivateIds } }, transaction },
        );
      }
    });

    await clearHeroTickerImageForProducts([...okIds, ...deactivateIds]);

    res.json({
      success: true,
      deletedCount: okIds.length,
      deactivatedCount: deactivateIds.length,
      ...(deactivateIds.length ? { warning: `${deactivateIds.length} product(s) had order history and were deactivated instead of deleted` } : {}),
    });
  } catch (err) { next(err); }
};

exports.lookupProductsByIds = async (req, res, next) => {
  try {
    const rawIds = req.body.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    const ids = [...new Set(rawIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0))].slice(0, 3000);
    if (!ids.length) return res.status(400).json({ success: false, message: 'No valid ids' });

    const rows = await Product.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: Category, as: 'category', attributes: ['name_ar', 'name_en'] },
      ],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

/** Single product for admin edit (by numeric id); includes inactive. */
exports.getAdminProductById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' },
        { model: Category, as: 'category', attributes: ['id', 'name_ar', 'name_en'] },
        { model: Subcategory, as: 'subcategory', attributes: ['id', 'name_ar', 'name_en'] },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const data = await attachHeroTickerImageIds(product);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({
      where: { slug, is_active: true },
      include: [
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' },
        { model: Category, as: 'category' },
        { model: Subcategory, as: 'subcategory' },
        { model: Review, as: 'reviews', where: { is_approved: true }, required: false, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }] },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    product.views += 1;
    await product.save();
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

async function applyProductVariants(product, body) {
  const sizes = Array.isArray(body.sizes) ? body.sizes : product.sizes;
  const colors = Array.isArray(body.colors) ? body.colors : product.colors;
  const variantRows = normalizeVariantsPayload(body.variants, sizes, colors);
  if (variantRows.length) {
    const total = await syncProductVariants(product.id, product.sku, variantRows);
    if (total != null) await product.update({ stock: total });
  }
}

exports.createProduct = async (req, res, next) => {
  try {
    const { variants, ...data } = req.body;
    if (!data.slug) data.slug = slugify(data.name_en) + '-' + Date.now();
    if (!data.sku) data.sku = 'MW-' + Date.now();
    const normalized = await normalizeHeroTickerFields(data);
    const product = await Product.create(normalized);
    await applyProductVariants(product, { ...data, variants });
    const fresh = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }],
    });
    res.status(201).json({ success: true, message: 'Product created', data: fresh });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variants, ...data } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const normalized = await normalizeHeroTickerFields(data, product.id);

    await product.update(normalized);
    await applyProductVariants(product, { ...product.toJSON(), ...data, variants });
    const fresh = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }, { model: ProductImage, as: 'images' }],
    });
    const responseData = await attachHeroTickerImageIds(fresh);
    res.json({ success: true, message: 'Product updated', data: responseData });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const hasOrders = await OrderItem.count({ where: { product_id: id } });
    if (hasOrders) {
      await product.update({ is_active: false, is_hero_ticker: false, is_featured: false, is_new_arrival: false, is_best_seller: false });
      await clearHeroTickerImageForProduct(id);
      return res.json({ success: true, message: 'Product deactivated (has order history)', deactivated: true });
    }

    await clearHeroTickerImageForProduct(id);
    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
};

function uploadedFileUrl(file) {
  const p = file?.path ?? file?.secure_url ?? file?.url;
  if (p == null) return null;
  const s = String(p).trim();
  return s || null;
}

async function syncProductThumbnail(productId, imageUrl) {
  if (!imageUrl) return;
  const product = await Product.findByPk(productId);
  if (!product) return;
  const current = product.thumbnail?.trim();
  if (current && current.toLowerCase() !== 'null') return;
  await product.update({ thumbnail: imageUrl });
}

exports.deleteProductImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const image = await ProductImage.findOne({ where: { id: imageId, product_id: id } });
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    const wasThumbnail = product.thumbnail?.trim() === image.url?.trim();
    let wasSliderImage = false;
    if (supportsHeroTickerImageId(Product)) {
      wasSliderImage = product.hero_ticker_image_id === image.id;
    } else {
      const map = await getHeroTickerImageMap();
      wasSliderImage = map[product.id] === image.id;
    }

    const { cloudinary } = require('../config/cloudinary');
    if (cloudinary && image.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id, { invalidate: true });
      } catch (err) {
        console.warn('[cloudinary] image destroy:', err.message || String(err));
      }
    }

    await image.destroy();

    const productUpdates = {};
    if (wasThumbnail) {
      const nextImage = await ProductImage.findOne({
        where: { product_id: id },
        order: [['is_primary', 'DESC'], ['sort_order', 'ASC'], ['id', 'ASC']],
      });
      productUpdates.thumbnail = nextImage?.url || null;
    }
    if (wasSliderImage) {
      if (supportsHeroTickerImageId(Product)) {
        productUpdates.hero_ticker_image_id = null;
      } else {
        await clearHeroTickerImageForProduct(id);
      }
    }
    if (Object.keys(productUpdates).length) {
      await product.update(productUpdates);
    }

    res.json({ success: true, message: 'Image deleted' });
  } catch (err) { next(err); }
};

exports.uploadProductImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (!req.files || !req.files.length) return res.status(400).json({ success: false, message: 'No images uploaded' });

    const existingCount = await ProductImage.count({ where: { product_id: id } });
    const images = await Promise.all(req.files.map((file, i) => {
      const url = uploadedFileUrl(file);
      if (!url) throw new Error('Invalid uploaded file');
      return ProductImage.create({
        product_id: id,
        url,
        public_id: file.filename || file.public_id || `${id}-${Date.now()}-${i}`,
        sort_order: existingCount + i,
        is_primary: existingCount === 0 && i === 0,
      });
    }));

    await syncProductThumbnail(id, images[0]?.url);
    res.json({ success: true, message: 'Images uploaded', data: images });
  } catch (err) { next(err); }
};

exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ where: { slug } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const related = await Product.findAll({
      where: { category_id: product.category_id, id: { [Op.ne]: product.id }, is_active: true },
      include: [storefrontProductImagesInclude],
      limit: 8,
    });
    res.json({ success: true, data: related });
  } catch (err) { next(err); }
};
