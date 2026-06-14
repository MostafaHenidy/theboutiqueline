const DEFAULT_STOREFRONT = 'https://theboutiqueline.com';

function normalizeDomainHost(input) {
  if (input == null || typeof input !== 'string') return '';
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0].split(':')[0].replace(/\.$/, '');
  return s;
}

/** Split FRONTEND_URL when it lists multiple origins for CORS. */
function parseFrontendUrlCandidates(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[,;\n\r]+/)
    .map((part) => part.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map((part) => (/^https?:\/\//i.test(part) ? part : `https://${part}`));
}

function scoreStorefrontCandidate(url) {
  try {
    const { protocol, hostname } = new URL(url);
    let score = 0;
    if (protocol === 'https:') score += 100;
    if (hostname.includes('anmka.com')) score -= 50;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) score -= 200;
    if (hostname === 'theboutiqueline.com') return score + 80;
    if (hostname === 'www.theboutiqueline.com') return score + 70;
    if (hostname.endsWith('.theboutiqueline.com')) return score + 40;
    return score;
  } catch {
    return -999;
  }
}

function pickBestStorefrontCandidate(candidates) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => scoreStorefrontCandidate(b) - scoreStorefrontCandidate(a))[0];
}

/**
 * One canonical storefront origin for links in emails, Paymob redirects, etc.
 * FRONTEND_URL may be comma-separated (CORS); verified custom_domain takes priority.
 */
function resolveStorefrontBaseUrl(options = {}) {
  const { settingsMap, envRaw = process.env.FRONTEND_URL } = options;

  const customDomain = settingsMap?.custom_domain?.trim();
  const domainStatus = String(settingsMap?.domain_status || '').toLowerCase();
  if (customDomain && domainStatus === 'verified') {
    const host = normalizeDomainHost(customDomain);
    if (host) return `https://${host}`;
  }

  const picked = pickBestStorefrontCandidate(parseFrontendUrlCandidates(envRaw));
  return picked || DEFAULT_STOREFRONT;
}

function resolveFrontendOrigins(envRaw = process.env.FRONTEND_URL) {
  const fromEnv = parseFrontendUrlCandidates(envRaw);
  return [...new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...fromEnv,
  ])];
}

module.exports = {
  DEFAULT_STOREFRONT,
  parseFrontendUrlCandidates,
  resolveStorefrontBaseUrl,
  resolveFrontendOrigins,
  normalizeDomainHost,
};
