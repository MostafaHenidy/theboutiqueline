const { Address } = require('../models');

exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.findAll({ where: { user_id: req.user.id }, order: [['is_default', 'DESC']] });
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
};

exports.createAddress = async (req, res, next) => {
  try {
    const data = { ...req.body, user_id: req.user.id };
    if (data.is_default) await Address.update({ is_default: false }, { where: { user_id: req.user.id } });
    const address = await Address.create(data);
    res.status(201).json({ success: true, data: address });
  } catch (err) { next(err); }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
    if (req.body.is_default) await Address.update({ is_default: false }, { where: { user_id: req.user.id } });
    await address.update(req.body);
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    await Address.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) { next(err); }
};
