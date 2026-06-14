/** @param {string|null|undefined} size @param {string|null|undefined} color */
export function variantKey(size, color) {
  const s = size == null ? '' : String(size).trim();
  const c = color == null ? '' : String(color).trim();
  return `${s}|||${c}`;
}

export function buildVariantCombinations(sizes = [], colors = []) {
  const sizeList = sizes.length ? sizes : [null];
  const colorList = colors.length ? colors : [null];
  if (!sizes.length && !colors.length) return [];
  return sizeList.flatMap((size) =>
    colorList.map((color) => ({
      size,
      color,
      key: variantKey(size, color),
    })),
  );
}

export function findMatchingVariant(variants, size, color) {
  if (!variants?.length) return null;
  const s = size == null || String(size).trim() === '' ? null : String(size).trim();
  const c = color == null || String(color).trim() === '' ? null : String(color).trim();
  return variants.find((v) => {
    const vs = v.size == null || String(v.size).trim() === '' ? null : String(v.size).trim();
    const vc = v.color == null || String(v.color).trim() === '' ? null : String(v.color).trim();
    return vs === s && vc === c;
  }) || null;
}

export function getVariantStock(product, size, color) {
  const variants = product?.variants;
  if (variants?.length) {
    const match = findMatchingVariant(variants, size, color);
    return match ? parseInt(match.stock, 10) || 0 : 0;
  }
  return parseInt(product?.stock, 10) || 0;
}

export function variantsFromProduct(product) {
  const map = {};
  (product?.variants || []).forEach((v) => {
    map[variantKey(v.size, v.color)] = String(parseInt(v.stock, 10) || 0);
  });
  return map;
}

export function variantRowsToPayload(variantStocks, sizes, colors) {
  return buildVariantCombinations(sizes, colors).map(({ size, color, key }) => ({
    size,
    color,
    stock: parseInt(variantStocks[key], 10) || 0,
  }));
}
