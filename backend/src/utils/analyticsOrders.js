const { Op } = require('sequelize');

const EXCLUDED_ORDER_STATUSES = ['cancelled', 'refunded'];

/**
 * Orders that count toward store revenue analytics.
 * Includes paid orders plus COD/bank transfer placed orders (still pending payment).
 */
function revenueOrderWhere(range) {
  const where = {
    status: { [Op.notIn]: EXCLUDED_ORDER_STATUSES },
    [Op.or]: [
      { payment_status: 'paid' },
      {
        payment_method: { [Op.in]: ['cod', 'bank_transfer'] },
        payment_status: { [Op.ne]: 'failed' },
      },
    ],
  };
  if (range?.start && range?.end) {
    where.created_at = { [Op.between]: [range.start, range.end] };
  }
  return where;
}

function priorRevenueOrderWhere(beforeDate, extra = {}) {
  return {
    status: { [Op.notIn]: EXCLUDED_ORDER_STATUSES },
    [Op.or]: [
      { payment_status: 'paid' },
      {
        payment_method: { [Op.in]: ['cod', 'bank_transfer'] },
        payment_status: { [Op.ne]: 'failed' },
      },
    ],
    created_at: { [Op.lt]: beforeDate },
    ...extra,
  };
}

module.exports = { revenueOrderWhere, priorRevenueOrderWhere, EXCLUDED_ORDER_STATUSES };
