const { Product, ProductVariant } = require('../models');

function normDim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s || null;
}

function variantKey(size, color) {
  return `${normDim(size) ?? ''}|||${normDim(color) ?? ''}`;
}

function buildVariantCombinations(sizes = [], colors = []) {
  const sizeList = sizes.length ? sizes : [null];
  const colorList = colors.length ? colors : [null];
  if (!sizes.length && !colors.length) return [];
  return sizeList.flatMap((size) =>
    colorList.map((color) => ({ size, color, key: variantKey(size, color) })),
  );
}

function buildVariantSku(baseSku, size, color) {
  const parts = [baseSku || 'SKU'];
  if (normDim(size)) parts.push(normDim(size));
  if (normDim(color)) parts.push(normDim(color).replace(/\s+/g, '-'));
  return parts.join('-').slice(0, 100);
}

function findMatchingVariant(variants, size, color) {
  if (!variants?.length) return null;
  const s = normDim(size);
  const c = normDim(color);
  return variants.find((v) => normDim(v.size) === s && normDim(v.color) === c) || null;
}

function pickFirstInStockVariant(variants) {
  if (!variants?.length) return null;
  return variants.find((v) => (parseInt(v.stock, 10) || 0) > 0) || null;
}

function totalVariantStock(variants) {
  return (variants || []).reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
}

/** Resolve size/color/variant for cart lines when the client omits variant (e.g. quick-add from listing). */
function resolveLineVariant(product, size, color, variantId) {
  const variants = product?.variants || [];
  if (variantId) {
    const byId = variants.find((v) => v.id === variantId);
    if (byId) {
      return { variant_id: byId.id, size: normDim(byId.size), color: normDim(byId.color) };
    }
  }
  const match = findMatchingVariant(variants, size, color);
  if (match) {
    return { variant_id: match.id, size: normDim(match.size), color: normDim(match.color) };
  }
  if (!normDim(size) && !normDim(color) && variants.length) {
    const fallback = pickFirstInStockVariant(variants);
    if (fallback) {
      return { variant_id: fallback.id, size: normDim(fallback.size), color: normDim(fallback.color) };
    }
  }
  return { variant_id: variantId || null, size: normDim(size), color: normDim(color) };
}

async function resolveAvailableStock(product, size, color, variantId) {
  if (variantId) {
    const v = await ProductVariant.findByPk(variantId);
    if (v && v.product_id === product.id) return parseInt(v.stock, 10) || 0;
  }
  const variants = product.variants || (await ProductVariant.findAll({ where: { product_id: product.id } }));
  const match = findMatchingVariant(variants, size, color);
  if (match) return parseInt(match.stock, 10) || 0;
  if (variants.length > 0) {
    if (!normDim(size) && !normDim(color) && !variantId) {
      return totalVariantStock(variants) || parseInt(product.stock, 10) || 0;
    }
    return 0;
  }
  return parseInt(product.stock, 10) || 0;
}

async function syncProductVariants(productId, baseSku, rows) {
  const list = Array.isArray(rows) ? rows : [];
  await ProductVariant.destroy({ where: { product_id: productId } });
  if (!list.length) return null;

  const created = await ProductVariant.bulkCreate(
    list.map((r) => ({
      product_id: productId,
      size: normDim(r.size),
      color: normDim(r.color),
      stock: Math.max(0, parseInt(r.stock, 10) || 0),
      sku: buildVariantSku(baseSku, r.size, r.color),
    })),
  );

  const total = created.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
  await Product.update({ stock: total }, { where: { id: productId } });
  return total;
}

async function refreshProductStockFromVariants(productId) {
  const variants = await ProductVariant.findAll({ where: { product_id: productId } });
  if (!variants.length) return null;
  const total = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
  await Product.update({ stock: total }, { where: { id: productId } });
  return total;
}

async function decrementStock(productId, quantity, { size, color, variant_id } = {}) {
  const qty = parseInt(quantity, 10) || 0;
  if (qty <= 0) return;

  let variant = null;
  if (variant_id) {
    variant = await ProductVariant.findOne({ where: { id: variant_id, product_id: productId } });
  }
  if (!variant) {
    const variants = await ProductVariant.findAll({ where: { product_id: productId } });
    variant = findMatchingVariant(variants, size, color);
  }

  if (variant) {
    const next = Math.max(0, (parseInt(variant.stock, 10) || 0) - qty);
    await variant.update({ stock: next });
    await refreshProductStockFromVariants(productId);
    return;
  }

  await Product.decrement('stock', { by: qty, where: { id: productId } });
}

function normalizeVariantsPayload(raw, sizes, colors) {
  if (!Array.isArray(raw) || !raw.length) {
    const combos = buildVariantCombinations(sizes, colors);
    if (!combos.length) return [];
    return combos.map(({ size, color }) => ({ size, color, stock: 0 }));
  }
  return raw.map((r) => ({
    size: r.size,
    color: r.color,
    stock: Math.max(0, parseInt(r.stock, 10) || 0),
  }));
}

module.exports = {
  normDim,
  variantKey,
  buildVariantCombinations,
  findMatchingVariant,
  pickFirstInStockVariant,
  resolveLineVariant,
  resolveAvailableStock,
  syncProductVariants,
  refreshProductStockFromVariants,
  decrementStock,
  normalizeVariantsPayload,
};
