const { Op } = require('sequelize');
const { Setting } = require('../models');

const PUBLIC_KEYS = [
  'currency',
  'tax_rate',
  'shipping_cost',
  'free_shipping_threshold',
  'payment_stripe',
  'payment_cod',
  'payment_bank_transfer',
  'payment_paymob',
  'bank_name',
  'bank_account',
  'delivery_countries',
  'default_language',
];

const { normalizeDeliveryCountries } = require('../utils/deliveryCountries');

exports.getPublicShopSettings = async (_req, res, next) => {
  try {
    const rows = await Setting.findAll({
      attributes: ['key', 'value'],
      where: { key: { [Op.in]: PUBLIC_KEYS } },
    });
    const map = {};
    for (const r of rows) map[r.key] = r.value ?? '';

    const deliveryCountries = normalizeDeliveryCountries(map.delivery_countries);

    const data = {
      currency: map.currency || 'EGP',
      tax_rate: map.tax_rate !== undefined && map.tax_rate !== null && map.tax_rate !== '' ? map.tax_rate : '15',
      shipping_cost: map.shipping_cost || '50',
      free_shipping_threshold: map.free_shipping_threshold || '5000',
      payment_stripe: map.payment_stripe !== undefined && map.payment_stripe !== '' ? map.payment_stripe : 'true',
      payment_cod: map.payment_cod !== undefined && map.payment_cod !== '' ? map.payment_cod : 'true',
      payment_bank_transfer: map.payment_bank_transfer !== undefined && map.payment_bank_transfer !== '' ? map.payment_bank_transfer : 'true',
      payment_paymob: map.payment_paymob !== undefined && map.payment_paymob !== '' ? map.payment_paymob : 'false',
      delivery_countries: deliveryCountries,
      bank_name: map.bank_name || '',
      bank_account: map.bank_account || '',
      default_language: String(map.default_language || '').toLowerCase() === 'en' ? 'en' : 'ar',
    };

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
