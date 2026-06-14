const crypto = require('crypto');

exports.sha256Hex = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase(), 'utf8').digest('hex');

/**
 * Normalize phone to E.164-like digits-only for hashing.
 */
exports.normalizePhoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

exports.hashMetaSnapUserData = (user = {}) => {
  const hashed = {};

  const addHash = (key, raw) => {
    if (!raw) return;
    const v = String(raw).trim();
    if (!v) return;
    hashed[key] = exports.sha256Hex(v.toLowerCase ? v.toLowerCase() : v);
  };

  if (user.email) {
    const email = String(user.email).trim().toLowerCase();
    if (email) hashed.em = exports.sha256Hex(email);
  }

  const ph = exports.normalizePhoneDigits(user.phone);
  if (ph) hashed.ph = exports.sha256Hex(ph);

  if (user.first_name || user.fn) addHash('fn', user.first_name || user.fn);
  if (user.last_name || user.ln) addHash('ln', user.last_name || user.ln);
  if (user.city || user.ct) addHash('ct', user.city || user.ct);
  if (user.state || user.st) addHash('st', user.state || user.st);
  if (user.zip || user.zp) addHash('zp', String(user.zip || user.zp));
  if (user.country || user.country_code || user.countryCode) addHash('country', user.country_code || user.countryCode || user.country);

  /** External IDs (already opaque) hashed for consistency across platforms */
  if (user.external_id) hashed.external_id = [exports.sha256Hex(String(user.external_id))];

  /** Meta prefers fbp/fbc as plain cookie values */
  if (user.fbp) hashed.fbp = user.fbp;
  if (user.fbc) hashed.fbc = user.fbc;

  return hashed;
};
