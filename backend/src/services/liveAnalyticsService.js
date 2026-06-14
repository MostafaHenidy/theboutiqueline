const { Op } = require('sequelize');
const {
  sequelize,
  StoreSession,
  StoreEvent,
  Order,
  OrderItem,
  Product,
} = require('../models');
const { revenueOrderWhere } = require('../utils/analyticsOrders');
const { formatCountryName } = require('../utils/storeAnalyticsHelpers');
const { coordsForCountry } = require('../utils/countryCoordinates');

const LIVE_WINDOW_MS = 10 * 60 * 1000;
const CART_WINDOW_MS = 30 * 60 * 1000;
const CHECKOUT_WINDOW_MS = 20 * 60 * 1000;

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current, previous) {
  const c = num(current);
  const p = num(previous);
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

function parseJsonField(val) {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val && typeof val === 'object' ? val : null;
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function sameTimeYesterday() {
  const now = new Date();
  const start = startOfToday();
  const elapsed = now.getTime() - start.getTime();
  const yStart = new Date(start);
  yStart.setDate(yStart.getDate() - 1);
  const yEnd = new Date(yStart.getTime() + elapsed);
  return { yStart, yEnd };
}

async function hourlySparkline(model, dateField, whereExtra = {}, valueField = null) {
  const start = startOfToday();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const rows = await model.findAll({
    attributes: [
      [sequelize.fn('HOUR', sequelize.col(dateField)), 'hour'],
      valueField
        ? [sequelize.fn('SUM', sequelize.col(valueField)), 'total']
        : [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
    ],
    where: {
      [dateField]: { [Op.gte]: start },
      ...whereExtra,
    },
    group: [sequelize.fn('HOUR', sequelize.col(dateField))],
    raw: true,
  });
  const map = Object.fromEntries(rows.map((r) => [Number(r.hour), num(r.total)]));
  return hours.map((h) => map[h] || 0);
}

async function countSessionsInBehavior(eventName, windowMs) {
  const since = new Date(Date.now() - windowMs);
  const events = await StoreEvent.findAll({
    attributes: ['session_id'],
    where: { event_name: eventName, created_at: { [Op.gte]: since } },
    group: ['session_id'],
    raw: true,
  });
  if (!events.length) return 0;

  const sessionIds = events.map((e) => e.session_id);
  const purchased = await StoreEvent.findAll({
    attributes: ['session_id'],
    where: {
      session_id: { [Op.in]: sessionIds },
      event_name: 'purchase',
    },
    group: ['session_id'],
    raw: true,
  });
  const purchasedSet = new Set(purchased.map((p) => p.session_id));
  return sessionIds.filter((id) => !purchasedSet.has(id)).length;
}

async function buildSessionsByLocation(todayStart) {
  const sessions = await StoreSession.findAll({
    where: { started_at: { [Op.gte]: todayStart } },
    attributes: ['country', 'city'],
    raw: true,
  });

  const map = new Map();
  sessions.forEach((s) => {
    const country = s.country || 'EG';
    const label = s.city
      ? `${formatCountryName(country) || country} — ${s.city}`
      : (formatCountryName(country) || country);
    map.set(label, (map.get(label) || 0) + 1);
  });

  if (!map.size) {
    const orders = await Order.findAll({
      where: { created_at: { [Op.gte]: todayStart }, ...revenueOrderWhere() },
      attributes: ['shipping_address'],
      raw: true,
    });
    orders.forEach((o) => {
      const addr = parseJsonField(o.shipping_address) || {};
      const country = addr.country || 'EG';
      const label = addr.city
        ? `${formatCountryName(country) || country} — ${addr.city}`
        : (formatCountryName(country) || country);
      map.set(label, (map.get(label) || 0) + 1);
    });
  }

  const rows = [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const locationTotal = rows.reduce((s, r) => s + r.count, 0) || 1;
  return rows.map((r) => ({
    ...r,
    percent: Math.round((r.count / locationTotal) * 100),
  }));
}

async function buildGlobeMarkers(liveSince, todayStart) {
  let liveSessions = await StoreSession.findAll({
    where: { last_seen_at: { [Op.gte]: liveSince } },
    attributes: ['id', 'country', 'city', 'session_id'],
    limit: 40,
    order: [['last_seen_at', 'DESC']],
  });

  if (!liveSessions.length) {
    liveSessions = await StoreSession.findAll({
      where: { started_at: { [Op.gte]: todayStart } },
      attributes: ['id', 'country', 'city', 'session_id'],
      limit: 40,
      order: [['last_seen_at', 'DESC']],
    });
  }

  const recentOrders = await Order.findAll({
    where: { created_at: { [Op.gte]: todayStart }, ...revenueOrderWhere() },
    attributes: ['id', 'order_number', 'total', 'attribution', 'shipping_address', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 20,
  });

  const globeVisitors = liveSessions.map((s, i) => {
    const country = s.country || 'EG';
    const c = coordsForCountry(country, i + 1);
    return {
      lat: c.lat,
      lng: c.lng,
      label: s.city ? `${c.label} — ${s.city}` : c.label,
      type: 'visitor',
      sessionId: s.session_id,
    };
  });

  const globeOrders = recentOrders.map((o, i) => {
    const attr = parseJsonField(o.attribution);
    const addr = parseJsonField(o.shipping_address);
    const country = attr?.country || addr?.country || 'EG';
    const c = coordsForCountry(country, i + 50);
    return {
      lat: c.lat,
      lng: c.lng,
      label: addr?.city ? `${c.label} — ${addr.city}` : c.label,
      type: 'order',
      orderNumber: o.order_number,
    };
  });

  return { visitors: globeVisitors, orders: globeOrders };
}

async function buildLiveAnalytics() {
  const now = new Date();
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);
  const todayStart = startOfToday();
  const { yStart, yEnd } = sameTimeYesterday();

  let visitorsRightNow = await StoreSession.count({
    where: { last_seen_at: { [Op.gte]: liveSince } },
  });
  if (!visitorsRightNow) {
    visitorsRightNow = await StoreSession.count({
      where: { started_at: { [Op.gte]: todayStart } },
    });
  }

  const sessionsToday = await StoreSession.count({
    where: { started_at: { [Op.gte]: todayStart } },
  });
  const sessionsYesterday = await StoreSession.count({
    where: { started_at: { [Op.between]: [yStart, yEnd] } },
  });

  const ordersTodayWhere = {
    created_at: { [Op.gte]: todayStart },
    ...revenueOrderWhere(),
  };
  const ordersYesterdayWhere = {
    created_at: { [Op.between]: [yStart, yEnd] },
    ...revenueOrderWhere(),
  };

  const ordersToday = await Order.count({ where: ordersTodayWhere });
  const ordersYesterday = await Order.count({ where: ordersYesterdayWhere });

  const salesTodayRow = await Order.findOne({
    attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'sum']],
    where: ordersTodayWhere,
    raw: true,
  });
  const salesYesterdayRow = await Order.findOne({
    attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'sum']],
    where: ordersYesterdayWhere,
    raw: true,
  });
  const totalSales = num(salesTodayRow?.sum);
  const totalSalesCompare = num(salesYesterdayRow?.sum);

  const sessionsSparkline = await hourlySparkline(StoreSession, 'started_at');
  const ordersSparkline = await hourlySparkline(Order, 'created_at', revenueOrderWhere());
  const salesSparkline = await hourlySparkline(Order, 'created_at', revenueOrderWhere(), 'total');

  let activeCarts = await countSessionsInBehavior('add_to_cart', CART_WINDOW_MS);
  let checkingOut = await countSessionsInBehavior('begin_checkout', CHECKOUT_WINDOW_MS);
  let purchasedToday = await StoreEvent.count({
    where: { event_name: 'purchase', created_at: { [Op.gte]: todayStart } },
  });

  if (!activeCarts && !checkingOut && !purchasedToday) {
    activeCarts = await Order.count({
      where: {
        created_at: { [Op.gte]: todayStart },
        status: { [Op.in]: ['pending', 'processing'] },
        ...revenueOrderWhere(),
      },
    });
    checkingOut = ordersToday;
    purchasedToday = await Order.count({
      where: {
        created_at: { [Op.gte]: todayStart },
        status: { [Op.in]: ['delivered', 'shipped', 'completed'] },
        ...revenueOrderWhere(),
      },
    }) || ordersToday;
  }

  const sessionsByLocation = await buildSessionsByLocation(todayStart);

  const newSessions = await StoreSession.count({
    where: { started_at: { [Op.gte]: todayStart }, user_id: null },
  });
  const returningSessions = await StoreSession.count({
    where: { started_at: { [Op.gte]: todayStart }, user_id: { [Op.ne]: null } },
  });

  const todayOrderIds = await Order.findAll({
    attributes: ['id'],
    where: ordersTodayWhere,
    raw: true,
  });
  const orderIds = todayOrderIds.map((o) => o.id);
  const itemRows = orderIds.length
    ? await OrderItem.findAll({
      where: { order_id: { [Op.in]: orderIds } },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name_en', 'name_ar', 'thumbnail'] }],
    })
    : [];

  const productAgg = new Map();
  itemRows.forEach((item) => {
    const pid = item.product_id;
    if (!pid) return;
    const prev = productAgg.get(pid) || { quantity: 0, revenue: 0, product: item.product };
    prev.quantity += num(item.quantity);
    prev.revenue += num(item.total_price);
    if (item.product) prev.product = item.product;
    productAgg.set(pid, prev);
  });

  const salesByProduct = [...productAgg.entries()]
    .map(([productId, row]) => ({
      productId,
      name: row.product?.name_en || 'Product',
      nameAr: row.product?.name_ar || row.product?.name_en || 'Product',
      image: row.product?.thumbnail || null,
      quantity: row.quantity,
      revenue: row.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const globe = await buildGlobeMarkers(liveSince, todayStart);

  return {
    refreshedAt: now.toISOString(),
    visitorsRightNow,
    totalSales: {
      value: totalSales,
      change: pctChange(totalSales, totalSalesCompare),
      sparkline: salesSparkline,
    },
    sessions: {
      value: sessionsToday,
      change: pctChange(sessionsToday, sessionsYesterday),
      sparkline: sessionsSparkline,
    },
    orders: {
      value: ordersToday,
      change: pctChange(ordersToday, ordersYesterday),
      sparkline: ordersSparkline,
    },
    customerBehavior: {
      activeCarts,
      checkingOut,
      purchased: purchasedToday,
    },
    sessionsByLocation,
    customersSplit: {
      new: newSessions || Math.max(0, sessionsToday - returningSessions),
      returning: returningSessions,
    },
    salesByProduct,
    globe,
  };
}

module.exports = { buildLiveAnalytics };
