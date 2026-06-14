/**
 * Client-side helpers so browser pixels mirror server event_id / purchase context.
 */

const KEY = 'misk_last_purchase';

export function storePurchaseForPixels(payload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      ...payload,
      ts: Date.now(),
    }));
  } catch {
    //
  }
}

export function consumePurchaseForPixels() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readFbpFbc() {
  const read = (name) => {
    const m = typeof document !== 'undefined'
      && document.cookie.match(new RegExp(`${name}=([^;]+)`));
    return m?.[1]?.trim() || null;
  };
  return { fbp: read('_fbp'), fbc: read('_fbc') };
}
