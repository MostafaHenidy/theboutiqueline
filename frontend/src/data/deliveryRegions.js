/**
 * Regions shown in checkout / addresses per delivery country (ISO 3166-1 alpha-2).
 * Persist `country` on addresses & orders as the ISO code (e.g. EG, SA).
 */

export const DELIVERY_COUNTRY_META = [
  { code: 'EG', labelAr: 'مصر', labelEn: 'Egypt' },
  { code: 'SA', labelAr: 'المملكة العربية السعودية', labelEn: 'Saudi Arabia' },
  { code: 'AE', labelAr: 'الإمارات العربية المتحدة', labelEn: 'United Arab Emirates' },
  { code: 'KW', labelAr: 'الكويت', labelEn: 'Kuwait' },
  { code: 'BH', labelAr: 'البحرين', labelEn: 'Bahrain' },
  { code: 'QA', labelAr: 'قطر', labelEn: 'Qatar' },
  { code: 'OM', labelAr: 'سلطنة عُمان', labelEn: 'Oman' },
  { code: 'JO', labelAr: 'الأردن', labelEn: 'Jordan' },
];

const EG_REGIONS = [
  'أسوان',
  'أسيوط',
  'الأقصر',
  'الإسكندرية',
  'الإسماعيلية',
  'البحر الأحمر',
  'البحيرة',
  'الجيزة',
  'الدقهلية',
  'السويس',
  'الشرقية',
  'الغربية',
  'الفيوم',
  'القاهرة',
  'القليوبية',
  'المنوفية',
  'المنيا',
  'الوادي الجديد',
  'بني سويف',
  'بورسعيد',
  'جنوب سيناء',
  'دمياط',
  'سوهاج',
  'شمال سيناء',
  'قنا',
  'كفر الشيخ',
  'مطروح',
];

/** De-dupe in case list edited */
const uniq = (arr) => [...new Set(arr)];

export const REGION_OPTIONS_BY_COUNTRY = {
  EG: uniq(EG_REGIONS),
  SA: [
    'الرياض',
    'جدة',
    'مكة المكرمة',
    'المدينة المنورة',
    'الدمام',
    'الطائف',
    'تبوك',
    'بريدة',
    'خميس مشيط',
    'الهفوف',
    'المبرز',
    'حائل',
    'نجران',
    'الجبيل',
    'ينبع',
    'القطيف',
    'أبها',
    'عرعر',
  ],
  AE: ['أبوظبي', 'دبي', 'الشارقة', 'عجمان', 'أم القيوين', 'رأس الخيمة', 'الفجيرة'],
  KW: ['العاصمة', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء', 'مبارك الكبير'],
  BH: ['المحرق', 'العاصمة', 'الجنوبية'],
  QA: ['الدوحة', 'الريان', 'الوكرة', 'الخور والذخيرة', 'الشمال'],
  OM: ['مسقط', 'ظفار', 'جنوب الباطنة', 'شمال الباطنة', 'الداخلية', 'البريمي', 'الظاهرة', 'مسندم', 'الوسطى', 'شمال الشرقية', 'جنوب الشرقية'],
  JO: ['عمان', 'إربد', 'الزرقاء', 'المفرق', 'عجلون', 'جرش', 'البلقاء', 'الكرك', 'معان', 'الطفيلة', 'العقبة', 'مادبا'],
};

/** @deprecated use REGION_OPTIONS_BY_COUNTRY.SA */
export const SAUDI_CITIES = REGION_OPTIONS_BY_COUNTRY.SA;

export const ALLOWED_DELIVERY_ISO = new Set(DELIVERY_COUNTRY_META.map((c) => c.code));

export function getCountryLabel(code, lang = 'ar') {
  const c = DELIVERY_COUNTRY_META.find((x) => x.code === code);
  if (!c) return code || '';
  return lang === 'ar' ? c.labelAr : c.labelEn;
}

export function getRegionsForCountry(code) {
  if (!code) return [];
  return REGION_OPTIONS_BY_COUNTRY[String(code).toUpperCase()] || [];
}

/** Normalize legacy full country names → ISO code */
export function parseCountryToCode(raw) {
  if (!raw || typeof raw !== 'string') return 'EG';
  const t = raw.trim();
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
  const lower = t.toLowerCase();
  const mapFragments = [
    ['SA', ['saudi', 'السعود', 'المملكة العربية السعودية', 'المملكه العربيه السعوديه']],
    ['EG', ['egypt', 'مصر', 'egy']],
    ['AE', ['emirates', 'uae', 'إمارات', 'الإمارات', 'ایمارات']],
    ['KW', ['kuwait', 'الكويت', 'كويت']],
    ['BH', ['bahrain', 'البحرين', 'بحرين']],
    ['QA', ['qatar', 'قطر']],
    ['OM', ['oman', 'عُمان', 'عمان', 'سلطنة']],
    ['JO', ['jordan', 'الأردن', 'الاردن']],
  ];
  for (const [code, needles] of mapFragments) {
    if (needles.some((n) => lower.includes(n) || t.includes(n))) return code;
  }
  const meta = DELIVERY_COUNTRY_META.find(
    (m) => lower === String(m.labelEn).toLowerCase() || t === m.labelAr
  );
  return meta?.code || 'EG';
}

/** Parses settings JSON / legacy */
export function parseDeliveryCountryCodes(rawSetting) {
  try {
    if (!rawSetting) return ['EG'];
    const p =
      Array.isArray(rawSetting) ? rawSetting : typeof rawSetting === 'string' ? JSON.parse(rawSetting) : [];
    if (!Array.isArray(p)) return ['EG'];
    const codes = p.map((x) => String(x).toUpperCase()).filter((x) => ALLOWED_DELIVERY_ISO.has(x));
    return codes.length ? codes : ['EG'];
  } catch {
    return ['EG'];
  }
}
