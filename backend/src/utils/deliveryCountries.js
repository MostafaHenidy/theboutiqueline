/** ISO codes supported by storefront region lists (mirror frontend `deliveryRegions`) */
const ALLOWED_DELIVERY_ISO = new Set(['EG', 'SA', 'AE', 'KW', 'BH', 'QA', 'OM', 'JO']);

function normalizeDeliveryCountries(input) {
  let parsed = [];
  try {
    if (input === undefined || input === null) parsed = [];
    else if (typeof input === 'string') {
      const t = input.trim();
      parsed = t ? JSON.parse(t) : [];
    } else if (Array.isArray(input)) {
      parsed = input;
    }
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) parsed = [];
  let codes = parsed.map((x) => String(x).toUpperCase()).filter((c) => ALLOWED_DELIVERY_ISO.has(c));
  if (!codes.length) codes = ['EG'];
  return codes;
}

module.exports = {
  ALLOWED_DELIVERY_ISO,
  normalizeDeliveryCountries,
};
