/** ISO code persisted on orders / Stripe lowercase */
export const SHOP_CURRENCY = 'EGP';

export const formatPrice = (price, _currency = SHOP_CURRENCY, lang = 'ar') => {
  const formatted = parseFloat(price || 0).toFixed(2);
  return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
};

export const getProductName = (product, lang = 'en') => {
  if (!product) return '';
  if (lang === 'ar') return product.name_ar || product.name_en || '';
  return product.name_en || product.name_ar || '';
};

export const getCategoryName = (cat, lang = 'en') => {
  if (!cat) return '';
  if (lang === 'ar') return cat.name_ar || cat.name_en || '';
  return cat.name_en || cat.name_ar || '';
};

/** Category title without trailing "(date)" when a dedicated coming-soon label exists */
export const getCategoryTileTitle = (cat, lang = 'en') => {
  const name = getCategoryName(cat, lang);
  const dedicated = lang === 'ar'
    ? (cat?.coming_soon_label_ar || cat?.coming_soon_label_en)
    : (cat?.coming_soon_label_en || cat?.coming_soon_label_ar);
  if (dedicated?.trim()) {
    return name.replace(/\s*(\([^)]+\)|（[^）]+）)\s*$/u, '').trim() || name;
  }
  const match = name.match(/^(.*?)\s*(\([^)]+\)|（[^）]+）)\s*$/u);
  return match ? match[1].trim() : name;
};

/** Large date on coming-soon tiles — from admin fields or "(…)" in the name */
export const getCategoryComingSoonLabel = (cat, lang = 'en') => {
  if (!cat) return null;
  const dedicated = lang === 'ar'
    ? (cat.coming_soon_label_ar || cat.coming_soon_label_en)
    : (cat.coming_soon_label_en || cat.coming_soon_label_ar);
  if (dedicated?.trim()) return dedicated.trim();
  const name = getCategoryName(cat, lang);
  const match = name.match(/(\([^)]+\)|（[^）]+）)\s*$/u);
  return match ? match[1].trim() : null;
};

export const isCategoryActive = (cat) => {
  if (!cat) return false;
  return cat.is_active !== false && cat.is_active !== 0;
};

export const findCategoryBySlug = (categories, slug) =>
  (categories || []).find((c) => c.slug === slug) || null;

/** JSON fields (sizes, colors, tags) may arrive as string from MySQL */
export function parseJsonStringArray(val) {
  if (val == null || val === '') return [];
  if (Array.isArray(val)) return val.filter((x) => x != null && x !== '');
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s.toLowerCase() === 'null') return [];
    try {
      const p = JSON.parse(s);
      return Array.isArray(p) ? p.filter((x) => x != null && x !== '') : [];
    } catch {
      return s ? [s] : [];
    }
  }
  return [];
}

/** Parse admin percent settings (tax, etc.) — 0 is valid; do not use `|| fallback`. */
export function parsePercentSetting(value, fallback = 15) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
}

/* global __MISK_BACKEND_PORT__ */
/** Backend origin for media when the SPA and API share a host (or LAN dev). */
function resolveBackendOrigin() {
  if (import.meta.env.DEV) {
    const host = typeof window !== 'undefined' ? window.location?.hostname : 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') return '';
    const inj = typeof __MISK_BACKEND_PORT__ !== 'undefined' ? String(__MISK_BACKEND_PORT__).trim() : '';
    const port = inj || '5001';
    return `http://${host}:${port}`;
  }
  const raw = typeof import.meta.env?.VITE_API_BASE_URL === 'string'
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : '';
  if (raw.startsWith('http')) return raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  return '';
}

function toApiUploadsPath(pathname) {
  if (pathname.startsWith('/api/uploads/')) return pathname;
  if (pathname.startsWith('/uploads/')) return `/api${pathname}`;
  return null;
}

export const resolveMediaUrl = (url) => {
  if (url == null || url === false) return '';
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s || s.toLowerCase() === 'null' || s === 'undefined') return '';

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const apiPath = toApiUploadsPath(u.pathname);
      if (apiPath) {
        const origin = resolveBackendOrigin();
        return origin ? `${origin}${apiPath}${u.search}` : `${apiPath}${u.search}`;
      }
    } catch {
      /* external absolute URL — return as-is below */
    }
    return s;
  }

  const [pathPart, ...rest] = s.split('?');
  const apiPath = toApiUploadsPath(pathPart);
  if (apiPath) {
    const origin = resolveBackendOrigin();
    const qs = rest.length ? `?${rest.join('?')}` : '';
    return origin ? `${origin}${apiPath}${qs}` : `${apiPath}${qs}`;
  }

  return s;
};

export const getProductImage = (product) =>
  resolveMediaUrl(product?.thumbnail || product?.images?.[0]?.url)
  || 'https://via.placeholder.com/400x400?text=Smart+Wood';

/** Ordered gallery URLs for product cards — one switch per image. */
export function getProductCardImages(product) {
  if (!product) return [];

  const seen = new Set();
  const out = [];
  const push = (raw, key) => {
    const url = resolveMediaUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ key, url });
  };

  const imgs = Array.isArray(product.images) ? product.images : [];
  [...imgs]
    .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0) || (a?.id ?? 0) - (b?.id ?? 0))
    .forEach((img) => push(img?.url, `img-${img?.id ?? out.length}`));

  if (product.thumbnail) {
    const thumb = resolveMediaUrl(product.thumbnail);
    if (thumb && !seen.has(thumb)) {
      out.unshift({ key: 'thumb', url: thumb });
    }
  }

  if (!out.length) {
    const fallback = getProductImage(product);
    if (fallback) out.push({ key: 'fallback', url: fallback });
  }

  return out;
}

export const getDiscountPercent = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

/** Sequelize JSON uses createdAt; some clients use created_at */
export const createdAtOf = (record) => record?.created_at ?? record?.createdAt ?? null;

export const formatDate = (date, lang = 'ar') => {
  if (!date) return '';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(date));
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export {
  SAUDI_CITIES,
  DELIVERY_COUNTRY_META,
  REGION_OPTIONS_BY_COUNTRY,
  getCountryLabel,
  getRegionsForCountry,
  parseCountryToCode,
  parseDeliveryCountryCodes,
  ALLOWED_DELIVERY_ISO,
} from '../data/deliveryRegions';

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size', '36', '38', '40', '42', '44', '46'];
