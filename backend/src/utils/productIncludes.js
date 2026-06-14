const { Product, ProductImage } = require('../models');
const { productAttributesOption } = require('./adaptProductSchema');

/** All gallery images for storefront product cards (no limit). */
const storefrontProductImagesInclude = {
  model: ProductImage,
  as: 'images',
  separate: true,
  order: [['sort_order', 'ASC'], ['id', 'ASC']],
};

/** Product nested under cart lines, wishlist rows, etc. */
function nestedStorefrontProductInclude(imageLimit) {
  const imageInclude = imageLimit
    ? { model: ProductImage, as: 'images', limit: imageLimit }
    : storefrontProductImagesInclude;

  const attrs = productAttributesOption(Product);
  return {
    model: Product,
    as: 'product',
    ...(attrs ? { attributes: attrs } : {}),
    include: [imageInclude],
  };
}

module.exports = {
  storefrontProductImagesInclude,
  nestedStorefrontProductInclude,
};
