const { body, param, query } = require('express-validator');

exports.providerParam = [
  param('provider').trim().notEmpty().isIn(['meta', 'snapchat', 'google']).withMessage('Invalid provider'),
];

exports.integrationUpdateRules = [
  body('enabled').optional().isBoolean(),
  body('test_mode').optional().isBoolean(),
  body('credentials').optional().isObject(),
];

exports.paginationRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('provider').optional().trim().isIn(['meta', 'snapchat', 'google', 'all']),
];

exports.singleEventRules = [
  body('event_name').trim().notEmpty(),
  body('currency').optional().trim().isLength({ min: 3, max: 5 }),
  body('value').optional().isFloat(),
  body('product_ids').optional().isArray(),
];
