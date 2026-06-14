let geoip;
try {
  geoip = require('geoip-lite');
} catch {
  geoip = null;
}

const SOCIAL_HOSTS = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'pinterest.com', 'snapchat.com'];
const SEARCH_HOSTS = ['google.', 'bing.com', 'yahoo.com', 'duckduckgo.com'];

const COUNTRY_NAMES = {
  EG: 'Egypt',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  KW: 'Kuwait',
  QA: 'Qatar',
  BH: 'Bahrain',
  OM: 'Oman',
  JO: 'Jordan',
  LB: 'Lebanon',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
};

function formatCountryName(code) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  return COUNTRY_NAMES[c] || c;
}

function formatGeoLabel(country, city) {
  const countryLabel = formatCountryName(country) || 'Unknown';
  return city ? `${countryLabel} — ${city}` : countryLabel;
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (xf) return String(xf).split(',')[0].trim();
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return String(ip).replace(/^::ffff:/, '');
}

function parseDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'other';
  if (/ipad|tablet|kindle|playbook/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|windows phone/.test(ua)) return 'mobile';
  if (/android/.test(ua)) return 'tablet';
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
  return 'other';
}

function hostFromReferrer(referrer) {
  if (!referrer || typeof referrer !== 'string') return '';
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function classifyReferrerChannel({ referrer, utm_source, utm_medium }) {
  const src = String(utm_source || '').toLowerCase().trim();
  const med = String(utm_medium || '').toLowerCase().trim();
  const host = hostFromReferrer(referrer);

  if (src) {
    if (SOCIAL_HOSTS.some((h) => src.includes(h.replace('.com', '')) || src.includes('facebook') || src.includes('instagram'))) {
      return { channel: 'social', label: src, social: src };
    }
    if (med === 'cpc' || med === 'paid') return { channel: 'paid', label: src };
    if (med === 'organic' || med === 'search') return { channel: 'organic', label: src };
    if (med === 'email') return { channel: 'email', label: src };
    return { channel: 'campaign', label: src };
  }

  if (!host) return { channel: 'direct', label: 'Direct' };

  if (SOCIAL_HOSTS.some((h) => host.includes(h))) {
    const social = host.includes('instagram') ? 'instagram' : host.includes('facebook') || host.includes('fb.') ? 'facebook' : host.split('.').slice(-2, -1)[0] || host;
    return { channel: 'social', label: social, social };
  }
  if (SEARCH_HOSTS.some((h) => host.includes(h))) {
    const engine = host.includes('google') ? 'google' : host.split('.')[0];
    return { channel: 'organic', label: engine };
  }

  return { channel: 'referral', label: host };
}

function sessionReferrerLabel(session) {
  const ch = classifyReferrerChannel(session);
  const geo = formatGeoLabel(session.country, session.city);
  if (ch.channel === 'direct') return `Direct — ${geo}`;
  if (ch.channel === 'organic') return `Search — ${ch.label} — ${geo}`;
  if (ch.channel === 'social') return `Social — ${ch.label} — ${geo}`;
  return `${ch.channel} — ${ch.label} — ${geo}`;
}

function geoFromRequest(req) {
  const headerCountry = req.headers['cf-ipcountry']
    || req.headers['x-vercel-ip-country']
    || req.headers['cloudfront-viewer-country']
    || null;
  if (headerCountry && headerCountry !== 'XX') {
    return {
      country: String(headerCountry).slice(0, 80),
      city: null,
    };
  }

  if (geoip) {
    const ip = clientIp(req);
    if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      const lookup = geoip.lookup(ip);
      if (lookup?.country) {
        return {
          country: String(lookup.country).slice(0, 80),
          city: lookup.city ? String(lookup.city).slice(0, 80) : null,
        };
      }
    }
  }

  const ip = clientIp(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'EG', city: null };
  }

  return { country: null, city: null };
}

function sanitizePath(path) {
  if (!path || typeof path !== 'string') return '/';
  const s = path.trim().slice(0, 300);
  return s.startsWith('/') ? s : `/${s}`;
}

module.exports = {
  parseDeviceType,
  classifyReferrerChannel,
  sessionReferrerLabel,
  geoFromRequest,
  sanitizePath,
  formatGeoLabel,
  formatCountryName,
  SOCIAL_HOSTS,
};
