/** Drop model fields that are not yet present in the DB (safe deploy without migrations). */
async function adaptProductSchema(sequelize, Product) {
  let hasHeroTickerImageId = false;

  try {
    const desc = await sequelize.getQueryInterface().describeTable('products');
    hasHeroTickerImageId = !!desc.hero_ticker_image_id;
  } catch {
    hasHeroTickerImageId = false;
  }

  if (!hasHeroTickerImageId && Product.rawAttributes.hero_ticker_image_id) {
    Product.removeAttribute('hero_ticker_image_id');
  }

  Product._heroTickerImageIdSupported = hasHeroTickerImageId;
  return hasHeroTickerImageId;
}

function supportsHeroTickerImageId(Product) {
  return Product._heroTickerImageIdSupported === true;
}

/** Nested includes (cart/wishlist) can still reference removed attrs unless excluded explicitly. */
function productAttributesOption(Product) {
  if (supportsHeroTickerImageId(Product)) return undefined;
  return { exclude: ['hero_ticker_image_id'] };
}

async function adaptOrderSchema(sequelize, Order) {
  let hasLocale = false;

  try {
    const desc = await sequelize.getQueryInterface().describeTable('orders');
    hasLocale = !!desc.locale;
  } catch {
    hasLocale = false;
  }

  if (!hasLocale && Order.rawAttributes.locale) {
    Order.removeAttribute('locale');
  }

  Order._localeSupported = hasLocale;
  return hasLocale;
}

function supportsOrderLocale(Order) {
  return Order._localeSupported === true;
}

module.exports = {
  adaptProductSchema,
  adaptOrderSchema,
  supportsHeroTickerImageId,
  supportsOrderLocale,
  productAttributesOption,
};
