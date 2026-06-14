import api from './api';

const SESSION_KEY = 'tbl_analytics_session';
const UTM_KEY = 'tbl_analytics_utm';
const LANDING_KEY = 'tbl_analytics_landing';

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getAnalyticsSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

function readUtm() {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistUtmFromUrl() {
  if (typeof window === 'undefined') return readUtm();
  const existing = readUtm();
  if (Object.keys(existing).length) return existing;
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
  };
  if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    return utm;
  }
  return {};
}

function getLandingPath() {
  try {
    let path = sessionStorage.getItem(LANDING_KEY);
    if (!path) {
      path = window.location.pathname + window.location.search;
      sessionStorage.setItem(LANDING_KEY, path);
    }
    return path;
  } catch {
    return '/';
  }
}

function shouldTrackPath(path) {
  if (!path || path.startsWith('/admin')) return false;
  return true;
}

export function trackStoreEvent(event, payload = {}) {
  if (typeof window === 'undefined') return;
  const path = payload.path || window.location.pathname;
  if (!shouldTrackPath(path) && event === 'page_view') return;

  const utm = persistUtmFromUrl();
  const body = {
    session_id: getAnalyticsSessionId(),
    event,
    path,
    product_id: payload.product_id,
    metadata: payload.metadata,
    referrer: document.referrer || '',
    landing_path: getLandingPath(),
    ...utm,
  };

  api.post('/analytics/collect', body).catch(() => {});
}

export function trackPageView(pathname) {
  if (!shouldTrackPath(pathname)) return;
  trackStoreEvent('page_view', { path: pathname });
}

export function getAnalyticsPayloadForOrder() {
  return { analytics_session_id: getAnalyticsSessionId() };
}

export function initAnalyticsFromUrl() {
  persistUtmFromUrl();
  getLandingPath();
}
