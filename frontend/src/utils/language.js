import api from './api';
import i18n from '../i18n';

export const LANG_STORAGE_KEY = 'language';
/** Set to "1" only when the visitor picks a language in the header (not from site default). */
export const LANG_USER_CHOICE_KEY = 'language_user_selected';

export function normalizeLanguage(lang) {
  return lang === 'ar' ? 'ar' : 'en';
}

export function hasUserLanguageChoice() {
  return localStorage.getItem(LANG_USER_CHOICE_KEY) === '1';
}

export async function fetchSiteDefaultLanguage() {
  try {
    const { data } = await api.get('/shop/settings');
    return normalizeLanguage(data?.data?.default_language);
  } catch {
    return 'en';
  }
}

/** Site default from admin, unless the visitor explicitly chose a language. */
export async function resolveStorefrontLanguage() {
  if (hasUserLanguageChoice()) {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  }
  return fetchSiteDefaultLanguage();
}

export function applyLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  localStorage.setItem(LANG_STORAGE_KEY, normalized);
  const root = document.documentElement;
  root.lang = normalized;
  root.dir = normalized === 'en' ? 'ltr' : 'rtl';
  root.classList.toggle('locale-ar', normalized === 'ar');
  i18n.changeLanguage(normalized);
  return normalized;
}

/** Visitor toggled language in the header — keep their choice across visits. */
export function setUserLanguage(lang) {
  localStorage.setItem(LANG_USER_CHOICE_KEY, '1');
  return applyLanguage(lang);
}

export async function syncLanguageFromSiteSettings(dispatch, setLanguageAction) {
  if (hasUserLanguageChoice()) {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    const normalized = normalizeLanguage(saved);
    applyLanguage(normalized);
    dispatch(setLanguageAction(normalized));
    return normalized;
  }
  const lang = await fetchSiteDefaultLanguage();
  applyLanguage(lang);
  dispatch(setLanguageAction(lang));
  return lang;
}
