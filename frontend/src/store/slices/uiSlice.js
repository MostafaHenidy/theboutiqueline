import { createSlice } from '@reduxjs/toolkit';
import { applyTheme } from '../../utils/theme';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    mobileMenuOpen: false,
    cartDrawerOpen: false,
    searchOpen: false,
    language: 'en',
    direction: 'ltr',
    theme: 'light',
  },
  reducers: {
    toggleMobileMenu: (s) => { s.mobileMenuOpen = !s.mobileMenuOpen; },
    closeMobileMenu: (s) => { s.mobileMenuOpen = false; },
    toggleCartDrawer: (s) => { s.cartDrawerOpen = !s.cartDrawerOpen; },
    closeCartDrawer: (s) => { s.cartDrawerOpen = false; },
    toggleSearch: (s) => { s.searchOpen = !s.searchOpen; },
    closeSearch: (s) => { s.searchOpen = false; },
    setLanguage: (s, a) => {
      const lang = a.payload === 'ar' ? 'ar' : 'en';
      s.language = lang;
      s.direction = lang === 'en' ? 'ltr' : 'rtl';
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    },
    setTheme: (s, a) => {
      const theme = applyTheme(a.payload);
      s.theme = theme;
    },
  },
});

export const { toggleMobileMenu, closeMobileMenu, toggleCartDrawer, closeCartDrawer, toggleSearch, closeSearch, setLanguage, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
