const { Review, Product, User } = require('../models');
const { Op } = require('sequelize');

exports.getProductReviews = async (req, res, next) => {
  try {
    const { product_id, page = 1, limit = 10 } = req.query;
    const { count, rows } = await Review.findAndCountAll({
      where: { product_id, is_approved: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

exports.createReview = async (req, res, next) => {
  try {
    const { product_id, rating, title, body } = req.body;
    const existing = await Review.findOne({ where: { product_id, user_id: req.user.id } });
    if (existing) return res.status(409).json({ success: false, message: 'You already reviewed this product' });
    const review = await Review.create({ product_id, user_id: req.user.id, rating, title, body });
    await updateProductRating(product_id);
    res.status(201).json({ success: true, message: 'Review submitted for approval', data: review });
  } catch (err) { next(err); }
};

exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    review.is_approved = true;
    await review.save();
    await updateProductRating(review.product_id);
    res.json({ success: true, message: 'Review approved' });
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const product_id = review.product_id;
    await review.destroy();
    await updateProductRating(product_id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) { next(err); }
};

exports.getAllReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_approved } = req.query;
    const where = {};
    if (is_approved !== undefined) where.is_approved = is_approved === 'true';
    const { count, rows } = await Review.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }, { model: Product, as: 'product', attributes: ['id', 'name_ar', 'name_en'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (err) { next(err); }
};

async function updateProductRating(product_id) {
  const reviews = await Review.findAll({ where: { product_id, is_approved: true }, attributes: ['rating'] });
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  await Product.update({ rating_avg: avg.toFixed(2), rating_count: count }, { where: { id: product_id } });
}
