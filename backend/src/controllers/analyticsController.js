/**
 * Store analytics — Phase 1: order/product/customer/LP view aggregations.
 * Phase 2: store_sessions + store_events for funnel/referrer/device widgets.
 * See backend/docs/analytics-phase2.md
 */
const { buildLiveAnalytics } = require('../services/liveAnalyticsService');
const { buildReportData } = require('../services/reportAnalyticsService');
const { Op } = require('sequelize');
const {
  sequelize,
  Order,
  OrderItem,
  Product,
  User,
  Role,
  LandingPage,
  LandingPageView,
  StoreSession,
} = require('../models');
const { revenueOrderWhere, priorRevenueOrderWhere } = require('../utils/analyticsOrders');

const FULFILLED_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];
const PAYMENT_CHANNEL_LABELS = {
  stripe: 'Stripe',
  cod: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
  paymob: 'Paymob',
};

function parseYmd(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDayUtc(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfDayUtc(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function defaultRanges() {
  const today = new Date();
  const start = startOfDayUtc(today);
  const end = endOfDayUtc(today);
  const y = new Date(today);
  y.setUTCDate(y.getUTCDate() - 1);
  return {
    start,
    end,
    compareStart: startOfDayUtc(y),
    compareEnd: endOfDayUtc(y),
  };
}

function resolveRanges(query) {
  const startDate = parseYmd(query.start);
  const endDate = parseYmd(query.end);
  const defaults = defaultRanges();
  const start = startDate ? startOfDayUtc(startDate) : defaults.start;
  const end = endDate ? endOfDayUtc(endDate) : defaults.end;
  const compareStart = parseYmd(query.compareStart)
    ? startOfDayUtc(parseYmd(query.compareStart))
    : defaults.compareStart;
  const compareEnd = parseYmd(query.compareEnd)
    ? endOfDayUtc(parseYmd(query.compareEnd))
    : defaults.compareEnd;
  return { start, end, compareStart, compareEnd };
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current, previous) {
  const c = num(current);
  const p = num(previous);
  if (p === 0) return c === 0 ? 0 : 100;
  return Math.round(((c - p) / p) * 1000) / 10;
}

function orderWhere(range) {
  return {
    status: { [Op.ne]: 'cancelled' },
    created_at: { [Op.between]: [range.start, range.end] },
  };
}

async function aggregateSalesBreakdown(range) {
  const where = revenueOrderWhere(range);
  const rows = await Order.findAll({
    where,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('subtotal')), 'gross'],
      [sequelize.fn('SUM', sequelize.col('discount_amount')), 'discounts'],
      [sequelize.fn('SUM', sequelize.col('shipping_cost')), 'shipping'],
      [sequelize.fn('SUM', sequelize.col('tax_amount')), 'taxes'],
      [sequelize.fn('SUM', sequelize.col('total')), 'total'],
    ],
    raw: true,
  });
  const refunded = await Order.sum('total', {
    where: { status: 'refunded', created_at: { [Op.between]: [range.start, range.end] } },
  });
  const gross = num(rows[0]?.gross);
  const discounts = num(rows[0]?.discounts);
  const shipping = num(rows[0]?.shipping);
  const taxes = num(rows[0]?.taxes);
  const total = num(rows[0]?.total);
  const returns = num(refunded);
  const net = gross - discounts - returns;
  return { gross, discounts, returns, net, shipping, taxes, total };
}

async function countOrders(range) {
  return Order.count({ where: orderWhere(range) });
}

async function countFulfilled(range) {
  return Order.count({
    where: {
      ...orderWhere(range),
      status: { [Op.in]: FULFILLED_STATUSES },
    },
  });
}

async function grossSales(range) {
  const v = await Order.sum('subtotal', { where: revenueOrderWhere(range) });
  return num(v);
}

async function totalSales(range) {
  const v = await Order.sum('total', { where: revenueOrderWhere(range) });
  return num(v);
}

async function returningCustomerRate(range) {
  const orders = await Order.findAll({
    where: revenueOrderWhere(range),
    attributes: ['user_id', 'guest_email'],
    raw: true,
  });
  if (!orders.length) return { rate: 0, returning: 0, total: 0 };
  const keys = orders.map((o) => (o.user_id ? `u:${o.user_id}` : `g:${(o.guest_email || '').toLowerCase()}`));
  const unique = [...new Set(keys)];
  let returning = 0;
  for (const key of unique) {
    const isUser = key.startsWith('u:');
    const id = key.slice(2);
    const prior = await Order.count({
      where: priorRevenueOrderWhere(range.start, isUser ? { user_id: id } : { guest_email: id }),
    });
    if (prior > 0) returning += 1;
  }
  const rate = unique.length ? Math.round((returning / unique.length) * 1000) / 10 : 0;
  return { rate, returning, total: unique.length };
}

function isSingleDayRange(start, end) {
  return start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
}

async function salesOverTime(range, bucket = 'auto') {
  const singleDay = bucket === 'hour' || (bucket === 'auto' && isSingleDayRange(range.start, range.end));
  const dateExpr = singleDay
    ? sequelize.fn('HOUR', sequelize.col('created_at'))
    : sequelize.fn('DATE', sequelize.col('created_at'));
  const rows = await Order.findAll({
    where: revenueOrderWhere(range),
    attributes: [
      [dateExpr, 'bucket'],
      [sequelize.fn('SUM', sequelize.col('total')), 'sales'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
    ],
    group: [dateExpr],
    order: [[dateExpr, 'ASC']],
    raw: true,
  });
  return rows.map((r) => ({
    bucket: String(r.bucket),
    sales: num(r.sales),
    orders: parseInt(r.orders, 10) || 0,
  }));
}

async function aovOverTime(range) {
  const singleDay = isSingleDayRange(range.start, range.end);
  const dateExpr = singleDay
    ? sequelize.fn('HOUR', sequelize.col('created_at'))
    : sequelize.fn('DATE', sequelize.col('created_at'));
  const rows = await Order.findAll({
    where: revenueOrderWhere(range),
    attributes: [
      [dateExpr, 'bucket'],
      [sequelize.fn('AVG', sequelize.col('total')), 'aov'],
    ],
    group: [dateExpr],
    order: [[dateExpr, 'ASC']],
    raw: true,
  });
  return rows.map((r) => ({ bucket: String(r.bucket), aov: Math.round(num(r.aov) * 100) / 100 }));
}

async function salesByProduct(range, limit = 15) {
  const rows = await OrderItem.findAll({
    attributes: [
      'product_id',
      'name_en',
      'name_ar',
      [sequelize.fn('SUM', sequelize.col('total_price')), 'revenue'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'qty'],
    ],
    include: [{
      model: Order,
      as: 'order',
      attributes: [],
      where: revenueOrderWhere(range),
      required: true,
    }],
    group: ['product_id', 'name_en', 'name_ar'],
    order: [[sequelize.literal('revenue'), 'DESC']],
    limit,
    raw: true,
  });
  return rows.map((r) => ({
    productId: r.product_id,
    name: r.name_en || r.name_ar || 'Product',
    nameAr: r.name_ar,
    revenue: num(r.revenue),
    quantity: parseInt(r.qty, 10) || 0,
  }));
}

async function salesByChannel(range) {
  const rows = await Order.findAll({
    where: revenueOrderWhere(range),
    attributes: [
      'payment_method',
      [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
    ],
    group: ['payment_method'],
    order: [[sequelize.literal('revenue'), 'DESC']],
    raw: true,
  });
  return rows.map((r) => ({
    channel: PAYMENT_CHANNEL_LABELS[r.payment_method] || r.payment_method || 'Other',
    method: r.payment_method,
    revenue: num(r.revenue),
    orders: parseInt(r.orders, 10) || 0,
  }));
}

async function salesByLocation(range, limit = 12) {
  const orders = await Order.findAll({
    where: revenueOrderWhere(range),
    attributes: ['shipping_address', 'total'],
    raw: true,
  });
  const map = new Map();
  for (const o of orders) {
    let addr = o.shipping_address;
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { addr = {}; }
    }
    const country = addr?.country || 'Unknown';
    const city = addr?.city || addr?.district || '';
    const label = city ? `${country} — ${city}` : country;
    const prev = map.get(label) || { label, country, city, revenue: 0, orders: 0 };
    prev.revenue += num(o.total);
    prev.orders += 1;
    map.set(label, prev);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

async function customerCohorts(monthsBack = 8) {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - monthsBack);
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const customerRole = await Role.findOne({ where: { name: 'customer' }, attributes: ['id'] });
  const customerWhere = {
    role_id: customerRole?.id || 2,
    created_at: { [Op.gte]: since },
  };

  const customers = await User.findAll({
    where: customerWhere,
    attributes: ['id', 'created_at'],
    raw: true,
  });

  const cohortMap = new Map();
  for (const u of customers) {
    const d = new Date(u.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!cohortMap.has(key)) cohortMap.set(key, { cohort: key, customers: 0, months: {} });
    cohortMap.get(key).customers += 1;
  }

  for (const [cohortKey, data] of cohortMap) {
    const [y, m] = cohortKey.split('-').map(Number);
    const cohortStart = new Date(Date.UTC(y, m - 1, 1));
    const cohortEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    const cohortUsers = customers.filter((u) => {
      const d = new Date(u.created_at);
      return d >= cohortStart && d <= cohortEnd;
    }).map((u) => u.id);
    if (!cohortUsers.length) continue;

    for (let offset = 0; offset <= 6; offset++) {
      const mStart = new Date(Date.UTC(y, m - 1 + offset, 1));
      const mEnd = new Date(Date.UTC(y, m + offset, 0, 23, 59, 59, 999));
      const buyers = await Order.count({
        where: {
          user_id: { [Op.in]: cohortUsers },
          ...revenueOrderWhere({ start: mStart, end: mEnd }),
        },
        distinct: true,
        col: 'user_id',
      });
      const pct = cohortUsers.length ? Math.round((buyers / cohortUsers.length) * 10000) / 100 : 0;
      data.months[offset] = { buyers, pct };
    }
  }

  return [...cohortMap.values()].sort((a, b) => a.cohort.localeCompare(b.cohort));
}

async function sellThroughProducts(limit = 12) {
  const products = await Product.findAll({
    where: { is_active: true },
    attributes: ['id', 'name_en', 'name_ar', 'sku', 'sales_count', 'stock'],
    order: [['sales_count', 'DESC']],
    limit: 50,
    raw: true,
  });
  return products
    .map((p) => {
      const sold = parseInt(p.sales_count, 10) || 0;
      const stock = parseInt(p.stock, 10) || 0;
      const total = sold + stock;
      const rate = total > 0 ? Math.round((sold / total) * 10000) / 100 : 0;
      return {
        productId: p.id,
        name: p.name_en || p.name_ar,
        nameAr: p.name_ar,
        sku: p.sku,
        sellThrough: rate,
        sold,
        stock,
      };
    })
    .sort((a, b) => b.sellThrough - a.sellThrough)
    .slice(0, limit);
}

async function storeLandingSessions(range, limit = 12) {
  const rows = await StoreSession.findAll({
    where: { started_at: { [Op.between]: [range.start, range.end] } },
    attributes: [
      'landing_path',
      [sequelize.fn('COUNT', sequelize.col('id')), 'sessions'],
    ],
    group: ['landing_path'],
    order: [[sequelize.literal('sessions'), 'DESC']],
    limit,
    raw: true,
  });
  return rows.map((r) => {
    const path = r.landing_path || '/';
    return {
      landingPageId: null,
      slug: null,
      title: path,
      sessions: parseInt(r.sessions, 10) || 0,
      path,
    };
  });
}

async function landingPageSessions(range, limit = 12) {
  const [lpRows, storeRows] = await Promise.all([
    LandingPageView.findAll({
      where: { created_at: { [Op.between]: [range.start, range.end] } },
      attributes: [
        'landing_page_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'sessions'],
      ],
      group: ['landing_page_id'],
      order: [[sequelize.literal('sessions'), 'DESC']],
      limit,
      raw: true,
    }),
    storeLandingSessions(range, limit),
  ]);

  const pageIds = lpRows.map((r) => r.landing_page_id).filter(Boolean);
  const pages = pageIds.length
    ? await LandingPage.findAll({
      where: { id: { [Op.in]: pageIds } },
      attributes: ['id', 'slug', 'title_en', 'title_ar'],
      raw: true,
    })
    : [];
  const pageById = Object.fromEntries(pages.map((p) => [p.id, p]));

  const lpItems = lpRows.map((r) => {
    const page = pageById[r.landing_page_id];
    return {
      landingPageId: r.landing_page_id,
      slug: page?.slug,
      title: page?.title_en || page?.title_ar || page?.slug || 'Landing page',
      sessions: parseInt(r.sessions, 10) || 0,
      path: page?.slug ? `/lp/${page.slug}` : '/',
    };
  });

  const merged = new Map();
  for (const item of [...lpItems, ...storeRows]) {
    const key = item.path || '/';
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...item });
      continue;
    }
    prev.sessions += item.sessions;
    if (!prev.title || prev.title === '/') prev.title = item.title;
  }

  return [...merged.values()].sort((a, b) => b.sessions - a.sessions).slice(0, limit);
}

async function buildInsights(range) {
  const insights = [];
  const threeWeeksAgo = new Date(range.end);
  threeWeeksAgo.setUTCDate(threeWeeksAgo.getUTCDate() - 21);
  const oneWeekAgo = new Date(range.end);
  oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);

  const productSales = await OrderItem.findAll({
    attributes: [
      'product_id',
      'name_en',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'qty'],
    ],
    include: [{
      model: Order,
      as: 'order',
      attributes: [],
      where: {
        ...revenueOrderWhere({ start: threeWeeksAgo, end: range.end }),
      },
      required: true,
    }],
    group: ['product_id', 'name_en'],
    raw: true,
  });

  for (const p of productSales) {
    const pid = p.product_id;
    const recent = await OrderItem.sum('quantity', {
      include: [{
        model: Order,
        as: 'order',
        where: revenueOrderWhere({ start: oneWeekAgo, end: range.end }),
      }],
      where: { product_id: pid },
    });
    const older = await OrderItem.sum('quantity', {
      include: [{
        model: Order,
        as: 'order',
        where: revenueOrderWhere({ start: threeWeeksAgo, end: oneWeekAgo }),
      }],
      where: { product_id: pid },
    });
    const r = num(recent);
    const o = num(older);
    if (o >= 3 && r < o * 0.7) {
      insights.push({
        id: `decline-${pid}`,
        type: 'decline',
        title: p.name_en || 'Product',
        message: `Orders for this product are down. You received ${Math.round(o - r)} fewer units last week than 2 weeks prior.`,
        productId: pid,
      });
    }
  }

  const lowStock = await Product.count({ where: { is_active: true, stock: { [Op.lte]: 5 } } });
  if (lowStock > 0) {
    insights.push({
      id: 'low-stock',
      type: 'inventory',
      title: 'Low stock alert',
      message: `${lowStock} active product(s) have 5 or fewer units in stock.`,
    });
  }

  const topProducts = await salesByProduct(range, 5);
  const newInTop = await Product.findAll({
    where: {
      id: { [Op.in]: topProducts.map((p) => p.productId).filter(Boolean) },
      is_new_arrival: true,
    },
    attributes: ['id', 'name_en'],
    raw: true,
  });
  for (const p of newInTop) {
    insights.push({
      id: `new-top-${p.id}`,
      type: 'highlight',
      title: p.name_en,
      message: 'New arrival product is among your top sellers in this period.',
      productId: p.id,
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'no-insights',
      type: 'info',
      title: 'No insights',
      message: 'No notable trends detected for the selected date range.',
    });
  }

  return insights;
}

const { buildPhase2Analytics } = require('../services/storeAnalyticsPhase2');

exports.getAnalytics = async (req, res, next) => {
  try {
    const range = resolveRanges(req.query);
    const compare = { start: range.compareStart, end: range.compareEnd };

    const [
      grossCurrent, grossCompare,
      ordersCurrent, ordersCompare,
      fulfilledCurrent, fulfilledCompare,
      returningCurrent, returningCompare,
      breakdownCurrent, breakdownCompare,
      totalCurrent, totalCompare,
      salesTimeCurrent, salesTimeCompare,
      aovCurrent, aovCompare,
      byProduct, byChannel, byLocation,
      cohorts, sellThrough, lpSessions,
      insights, phase2, reportData,
    ] = await Promise.all([
      grossSales(range),
      grossSales(compare),
      countOrders(range),
      countOrders(compare),
      countFulfilled(range),
      countFulfilled(compare),
      returningCustomerRate(range),
      returningCustomerRate(compare),
      aggregateSalesBreakdown(range),
      aggregateSalesBreakdown(compare),
      totalSales(range),
      totalSales(compare),
      salesOverTime(range),
      salesOverTime(compare),
      aovOverTime(range),
      aovOverTime(compare),
      salesByProduct(range),
      salesByChannel(range),
      salesByLocation(range),
      customerCohorts(),
      sellThroughProducts(),
      landingPageSessions(range),
      buildInsights(range),
      buildPhase2Analytics(range, compare),
      buildReportData(range, compare),
    ]);

    const orderCount = ordersCurrent;
    const aov = orderCount ? Math.round((totalCurrent / orderCount) * 100) / 100 : 0;
    const aovCompareVal = ordersCompare ? Math.round((totalCompare / ordersCompare) * 100) / 100 : 0;

    res.json({
      success: true,
      data: {
        refreshedAt: new Date().toISOString(),
        range: {
          start: range.start.toISOString().slice(0, 10),
          end: range.end.toISOString().slice(0, 10),
          compareStart: range.compareStart.toISOString().slice(0, 10),
          compareEnd: range.compareEnd.toISOString().slice(0, 10),
        },
        currency: 'EGP',
        kpis: {
          grossSales: { value: grossCurrent, change: pctChange(grossCurrent, grossCompare) },
          returningCustomerRate: {
            value: returningCurrent.rate,
            change: pctChange(returningCurrent.rate, returningCompare.rate),
          },
          ordersFulfilled: { value: fulfilledCurrent, change: pctChange(fulfilledCurrent, fulfilledCompare) },
          orders: { value: ordersCurrent, change: pctChange(ordersCurrent, ordersCompare) },
          averageOrderValue: { value: aov, change: pctChange(aov, aovCompareVal) },
          totalSales: { value: totalCurrent, change: pctChange(totalCurrent, totalCompare) },
        },
        salesOverTime: {
          current: salesTimeCurrent,
          compare: salesTimeCompare,
        },
        salesBreakdown: {
          current: breakdownCurrent,
          compare: breakdownCompare,
        },
        aovOverTime: {
          current: aovCurrent,
          compare: aovCompare,
        },
        salesByProduct: byProduct,
        salesByChannel: byChannel,
        salesByLocation: byLocation,
        customerCohorts: cohorts,
        sellThrough: sellThrough,
        landingPageSessions: lpSessions,
        insights,
        phase2,
        reportData,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getLiveAnalytics = async (req, res, next) => {
  try {
    const data = await buildLiveAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
