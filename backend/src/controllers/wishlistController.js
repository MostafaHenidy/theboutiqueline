const { Wishlist, Product } = require('../models');
const { nestedStorefrontProductInclude } = require('../utils/productIncludes');

const wishlistInclude = [nestedStorefrontProductInclude()];

exports.getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.findAll({
      where: { user_id: req.user.id },
      include: wishlistInclude,
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.body;
    const exists = await Wishlist.findOne({ where: { user_id: req.user.id, product_id } });
    if (exists) {
      await exists.destroy();
      return res.json({ success: true, message: 'Removed from wishlist', added: false, product_id });
    }
    const created = await Wishlist.create({ user_id: req.user.id, product_id });
    const item = await Wishlist.findByPk(created.id, { include: wishlistInclude });
    res.json({ success: true, message: 'Added to wishlist', added: true, data: item });
  } catch (err) { next(err); }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Wishlist.destroy({ where: { id, user_id: req.user.id } });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) { next(err); }
};

exports.checkWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const item = await Wishlist.findOne({ where: { user_id: req.user.id, product_id } });
    res.json({ success: true, in_wishlist: !!item });
  } catch (err) { next(err); }
};
