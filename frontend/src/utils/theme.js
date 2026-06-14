export const THEME_STORAGE_KEY = 'theme';

const THEME_COLORS = {
  light: '#FAFAF8',
  dark: '#0a0a0a',
};

export function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

export function resolveTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

function updateThemeColorMeta(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[normalizeTheme(theme)]);
}

export function applyTheme(theme) {
  const normalized = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalized;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
  updateThemeColorMeta(normalized);
  return normalized;
}

export function setUserTheme(theme) {
  return applyTheme(theme);
}
