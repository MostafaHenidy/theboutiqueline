import api from './api';

const CACHE_KEY = 'tbl_nav_links_v2';
const TTL_MS = 30 * 60 * 1000;
const REMOVED_SLUGS = new Set(['browse', 'all', 'apparel', 'sneakers', 'collectibles', 'trading-cards', 'about']);

function filterNavLinks(links) {
  return (links || []).filter((link) => !REMOVED_SLUGS.has(link.slug));
}

let inflight = null;

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return filterNavLinks(parsed.data);
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

export function clearNavLinksCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  inflight = null;
}

/** Cached public nav links — one network request per tab per 30 minutes. */
export async function fetchNavLinks() {
  const cached = readCache();
  if (cached) return cached;

  if (!inflight) {
    inflight = api
      .get('/nav-links')
      .then(({ data }) => {
        const links = filterNavLinks(data?.data || []);
        writeCache(links);
        return links;
      })
      .catch((err) => {
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
