/** Approximate country centroids for live view globe markers (ISO 3166-1 alpha-2). */
const COUNTRY_COORDS = {
  EG: { lat: 26.82, lng: 30.80, label: 'Egypt' },
  SA: { lat: 23.89, lng: 45.08, label: 'Saudi Arabia' },
  AE: { lat: 23.42, lng: 53.85, label: 'United Arab Emirates' },
  KW: { lat: 29.31, lng: 47.48, label: 'Kuwait' },
  QA: { lat: 25.35, lng: 51.18, label: 'Qatar' },
  BH: { lat: 26.07, lng: 50.55, label: 'Bahrain' },
  OM: { lat: 21.47, lng: 55.98, label: 'Oman' },
  JO: { lat: 30.59, lng: 36.24, label: 'Jordan' },
  LB: { lat: 33.85, lng: 35.86, label: 'Lebanon' },
  IQ: { lat: 33.22, lng: 43.68, label: 'Iraq' },
  SY: { lat: 34.80, lng: 38.99, label: 'Syria' },
  YE: { lat: 15.55, lng: 48.52, label: 'Yemen' },
  PS: { lat: 31.95, lng: 35.23, label: 'Palestine' },
  MA: { lat: 31.79, lng: -7.09, label: 'Morocco' },
  DZ: { lat: 28.03, lng: 1.66, label: 'Algeria' },
  TN: { lat: 33.89, lng: 9.54, label: 'Tunisia' },
  LY: { lat: 26.34, lng: 17.23, label: 'Libya' },
  SD: { lat: 12.86, lng: 30.22, label: 'Sudan' },
  US: { lat: 37.09, lng: -95.71, label: 'United States' },
  GB: { lat: 55.38, lng: -3.44, label: 'United Kingdom' },
  DE: { lat: 51.17, lng: 10.45, label: 'Germany' },
  FR: { lat: 46.23, lng: 2.21, label: 'France' },
  IT: { lat: 41.87, lng: 12.57, label: 'Italy' },
  ES: { lat: 40.46, lng: -3.75, label: 'Spain' },
  NL: { lat: 52.13, lng: 5.29, label: 'Netherlands' },
  TR: { lat: 38.96, lng: 35.24, label: 'Turkey' },
  CN: { lat: 35.86, lng: 104.20, label: 'China' },
  IN: { lat: 20.59, lng: 78.96, label: 'India' },
  PK: { lat: 30.38, lng: 69.35, label: 'Pakistan' },
  CA: { lat: 56.13, lng: -106.35, label: 'Canada' },
  AU: { lat: -25.27, lng: 133.78, label: 'Australia' },
  BR: { lat: -14.24, lng: -51.93, label: 'Brazil' },
  RU: { lat: 61.52, lng: 105.32, label: 'Russia' },
  JP: { lat: 36.20, lng: 138.25, label: 'Japan' },
  KR: { lat: 35.91, lng: 127.77, label: 'South Korea' },
  NG: { lat: 9.08, lng: 8.68, label: 'Nigeria' },
  ZA: { lat: -30.56, lng: 22.94, label: 'South Africa' },
};

const NAME_TO_CODE = Object.fromEntries(
  Object.entries(COUNTRY_COORDS).map(([code, v]) => [v.label.toLowerCase(), code]),
);

function normalizeCountryCode(country) {
  if (!country) return null;
  const raw = String(country).trim();
  if (!raw) return null;
  if (raw.length === 2) return raw.toUpperCase();
  const byName = NAME_TO_CODE[raw.toLowerCase()];
  if (byName) return byName;
  const partial = Object.entries(NAME_TO_CODE).find(([name]) => name.includes(raw.toLowerCase()) || raw.toLowerCase().includes(name));
  return partial ? partial[1] : null;
}

function coordsForCountry(country, jitterSeed = 0) {
  const code = normalizeCountryCode(country);
  const base = code && COUNTRY_COORDS[code] ? { ...COUNTRY_COORDS[code] } : { lat: 20, lng: 0, label: country || 'Unknown' };
  if (jitterSeed) {
    const j = ((jitterSeed * 9301 + 49297) % 233280) / 233280;
    const k = ((jitterSeed * 7919 + 104729) % 233280) / 233280;
    base.lat += (j - 0.5) * 4;
    base.lng += (k - 0.5) * 4;
  }
  return base;
}

module.exports = {
  COUNTRY_COORDS,
  normalizeCountryCode,
  coordsForCountry,
};
