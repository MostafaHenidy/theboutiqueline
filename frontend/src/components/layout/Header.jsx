import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ShoppingCart, Heart, Search, Menu, X, User, LogOut, Package, Sun, Moon } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { resetCart } from '../../store/slices/cartSlice';
import { toggleCartDrawer, setLanguage, setTheme } from '../../store/slices/uiSlice';
import { setUserLanguage } from '../../utils/language';
import { selectCartCount } from '../../store/slices/cartSlice';
import BrandLogo from '../common/BrandLogo';
import HeaderNavMenu from './HeaderNavMenu';
import { resolveMediaUrl } from '../../utils/helpers';
import { trackStoreEvent } from '../../utils/analyticsTracker';
import { fetchNavLinks } from '../../utils/navLinksCache';
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside';
import { useBodyScrollLock, forceUnlockScroll } from '../../hooks/useBodyScrollLock';
import { scrollToTop } from '../../utils/scrollToTop';

export default function Header() {
  const { t } = useTranslation();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { items: wishlistItems }  = useSelector((s) => s.wishlist);
  const cartCount = useSelector(selectCartCount);
  const { language, theme } = useSelector((s) => s.ui);

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setUserLanguage(next);
    dispatch(setLanguage(next));
  };

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));
  };

  const themeAriaLabel = theme === 'dark' ? t('theme_switch_light') : t('theme_switch_dark');
  const asideSlideX = language === 'ar' ? '100%' : '-100%';

  const [scrolled,      setScrolled]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [navLinks,      setNavLinks]      = useState([]);
  const searchRef = useRef(null);
  const searchPanelRef = useRef(null);
  const searchToggleRef = useRef(null);
  const userMenuRef = useRef(null);
  const scrollUnlockRef = useRef(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  /* scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNavLinks()
      .then((links) => { if (!cancelled) setNavLinks(links); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* auto-focus search input */
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  /* Lock scroll while mobile menu is open. */
  useBodyScrollLock(mobileOpen, scrollUnlockRef);

  /* Safety: force-clear all locks on route change. */
  useEffect(() => {
    setMobileOpen(false);
    forceUnlockScroll();
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      trackStoreEvent('search', { path: '/products', metadata: { query: q } });
      navigate(`/products?search=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    dispatch(resetCart());
    dispatch(logout());
    setUserMenuOpen(false);
    navigate('/');
  };

  const closeMenus = () => setMobileOpen(false);

  /** Close mobile menu before in-app navigation (scroll to top on destination). */
  const handleMobileLinkNavigate = () => {
    scrollUnlockRef.current = 'top';
    setMobileOpen(false);
  };

  /** Nav from mobile menu. */
  const handleNavNavigate = () => {
    handleMobileLinkNavigate();
  };

  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

  useDismissOnOutside([searchPanelRef, searchToggleRef], closeSearch, searchOpen);
  useDismissOnOutside(userMenuRef, closeUserMenu, userMenuOpen);

  const handleLogoClick = (e) => {
    e.preventDefault();
    closeMenus();
    setSearchOpen(false);
    setUserMenuOpen(false);

    if (location.pathname === '/') {
      scrollToTop();
      return;
    }

    navigate('/');
  };

  return (
    <header
      className={`site-header site-header--motion ${
        mobileOpen ? 'site-header--menu-open' : ''
      } ${scrolled ? 'is-scrolled backdrop-blur-md bg-surface-card/98' : 'bg-surface-card'}`}
    >
      {/* ══ HEADER ROW (all breakpoints) ══ */}
      <div className="site-header-main-bar container-custom">
        {/* ── Hamburger (left) ── */}
        <div className="site-header-main-bar__start">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="site-header-main-bar__burger transition-opacity hover:opacity-70 active:opacity-50 lg:hover:text-foreground text-icon lg:text-foreground-muted"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen
              ? <X strokeWidth={1.75} />
              : <Menu strokeWidth={1.75} />
            }
          </button>
        </div>

        {/* ── Logo (center) — mobile ── */}
        <Link
          to="/"
          onClick={handleLogoClick}
          aria-label="The Boutique Line — home"
          className="site-header-main-bar__center site-header-main-logo-wrap site-header-main-logo-wrap--mobile lg:hidden focus:outline-none"
        >
          <img
            src="/logo-circle.png"
            alt="The Boutique Line"
            className="site-header-mobile-logo"
            draggable={false}
          />
        </Link>

        {/* ── Logo (center) — desktop natural size (h-12 / xl:h-14, w-auto) ── */}
        <div className="site-header-main-bar__center site-header-main-logo-wrap site-header-main-logo-wrap--desktop hidden lg:flex">
          <BrandLogo variant="header" linkTo="/" className="site-header-main-logo" onClick={handleLogoClick} />
        </div>

        {/* ── Right icons ── */}
        <div className="site-header-mobile-actions site-header-main-bar__end flex items-center">
          {/* Mobile: Theme + Language + Cart */}
          <button
            type="button"
            onClick={toggleTheme}
            className="site-header-mobile-icon-btn lg:hidden transition-opacity hover:opacity-70 active:opacity-50 text-icon"
            aria-label={themeAriaLabel}
            title={themeAriaLabel}
          >
            {theme === 'dark' ? <Sun className="site-header-mobile-icon" strokeWidth={1.75} /> : <Moon className="site-header-mobile-icon" strokeWidth={1.75} />}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="site-header-lang-btn site-header-mobile-lang-btn lg:hidden uppercase border border-line text-foreground"
            aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            {language === 'ar' ? 'EN' : 'عربى'}
          </button>

          <button
            onClick={() => dispatch(toggleCartDrawer())}
            className="site-header-mobile-icon-btn lg:hidden relative transition-opacity hover:opacity-70 active:opacity-50 text-icon"
            aria-label="Cart"
          >
            <ShoppingCart className="site-header-mobile-icon" strokeWidth={1.75} />
            {cartCount > 0 && (
              <span className="cart-count-badge site-header-mobile-cart-badge absolute">
                {cartCount}
              </span>
            )}
          </button>

          {/* Desktop: full icon set */}
          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-3 text-foreground-muted hover:text-foreground transition-colors"
              aria-label={themeAriaLabel}
              title={themeAriaLabel}
            >
              {theme === 'dark' ? <Sun size={24} strokeWidth={1.75} /> : <Moon size={24} strokeWidth={1.75} />}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="site-header-lang-btn mx-1 px-3 py-1.5 uppercase text-foreground-muted hover:text-foreground border border-line hover:border-foreground/40 transition-colors"
              aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              {language === 'ar' ? 'EN' : 'عربى'}
            </button>

            <button
              ref={searchToggleRef}
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-3 text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <Search size={24} strokeWidth={1.75} />
            </button>

            <Link to="/wishlist" className="relative p-3 text-foreground-muted hover:text-foreground transition-colors" aria-label="Wishlist">
              <Heart size={24} strokeWidth={1.75} />
              {wishlistItems.length > 0 && (
                <span className="cart-count-badge absolute top-2 right-2 w-2.5 h-2.5 min-w-0 p-0" />
              )}
            </Link>

            <button
              onClick={() => dispatch(toggleCartDrawer())}
              className="relative p-3 text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={24} strokeWidth={1.75} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="cart-count-badge absolute top-1.5 right-1.5 w-5 h-5 text-[10px]"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="p-3 text-foreground-muted hover:text-foreground transition-colors"
                  aria-label="Account"
                >
                  {user?.avatar
                    ? <img src={resolveMediaUrl(user.avatar)} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    : <User size={24} strokeWidth={1.75} />
                  }
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      className="absolute right-0 mt-2 w-52 bg-surface-card border border-line py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-line mb-1">
                        <p className="text-foreground text-sm font-mono font-semibold truncate">{user?.name}</p>
                        <p className="text-foreground-dim text-xs font-mono truncate">{user?.email}</p>
                      </div>
                      {(user?.role === 'admin' || user?.role === 'orders_admin') && (
                        <Link to={user?.role === 'orders_admin' ? '/admin/orders' : '/admin'} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-boutique uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <Package size={14} /> {t('header_admin')}
                        </Link>
                      )}
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-foreground-muted uppercase tracking-widest hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <User size={14} /> {t('header_profile')}
                      </Link>
                      <Link to="/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-foreground-muted uppercase tracking-widest hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <Package size={14} /> {t('header_orders')}
                      </Link>
                      <Link to="/wishlist" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-foreground-muted uppercase tracking-widest hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <Heart size={14} /> {t('wishlist')}
                      </Link>
                      <div className="border-t border-line mt-1 pt-1">
                        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-boutique uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left">
                          <LogOut size={14} /> {t('logout')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="site-header-nav-link flex items-center gap-2 px-5 py-2.5 border border-line text-foreground-muted hover:text-foreground hover:border-foreground/40 uppercase transition-all">
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Search panel ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            ref={searchPanelRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-line bg-theme overflow-hidden relative z-[101]"
          >
            <div className="container-custom py-4">
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_products')}
                  className="input-boutique flex-1"
                />
                <button
                  type="submit"
                  className="btn-accent-boutique px-6 flex items-center gap-2"
                >
                  <Search size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-3 border border-line text-foreground-dim hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {portalReady && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <div className="site-header-aside-overlay" role="presentation">
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMenus}
                className="site-header-aside-backdrop"
                aria-label="Close menu"
              />
              <motion.div
                initial={{ opacity: 0, x: asideSlideX }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: asideSlideX }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="site-header-aside-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="site-header-aside-panel__scroll">
                  {navLinks.length > 0 && (
                    <nav className="site-header-aside-nav" aria-label="Browse navigation">
                      <HeaderNavMenu
                        navLinks={navLinks}
                        language={language}
                        onNavigate={handleNavNavigate}
                        variant="mobile"
                      />
                    </nav>
                  )}
                </div>

                <div className="site-header-aside-panel__footer">
                  {!isAuthenticated ? (
                    <div className="site-header-mobile-auth">
                      <Link
                        to="/login"
                        onClick={handleMobileLinkNavigate}
                        className="site-header-mobile-auth__btn site-header-mobile-auth__btn--outline"
                      >
                        {t('login')}
                      </Link>
                      <Link
                        to="/register"
                        onClick={handleMobileLinkNavigate}
                        className="site-header-mobile-auth__btn site-header-mobile-auth__btn--primary"
                      >
                        {t('register')}
                      </Link>
                    </div>
                  ) : (
                    <div className="site-header-mobile-account">
                      <p className="site-header-mobile-account__name">{user?.name}</p>
                      <p className="site-header-mobile-account__email">{user?.email}</p>
                      <div className="site-header-mobile-account__links">
                        {(user?.role === 'admin' || user?.role === 'orders_admin') && (
                          <Link to={user?.role === 'orders_admin' ? '/admin/orders' : '/admin'} onClick={handleMobileLinkNavigate} className="site-header-mobile-account__link">
                            <Package size={16} /> {t('header_admin')}
                          </Link>
                        )}
                        <Link to="/dashboard" onClick={handleMobileLinkNavigate} className="site-header-mobile-account__link">
                          <User size={16} /> {t('header_profile')}
                        </Link>
                        <Link to="/orders" onClick={handleMobileLinkNavigate} className="site-header-mobile-account__link">
                          <Package size={16} /> {t('header_orders')}
                        </Link>
                        <Link to="/wishlist" onClick={handleMobileLinkNavigate} className="site-header-mobile-account__link">
                          <Heart size={16} /> {t('wishlist')}
                        </Link>
                        <button type="button" onClick={() => { handleLogout(); setMobileOpen(false); }} className="site-header-mobile-account__link site-header-mobile-account__link--logout">
                          <LogOut size={16} /> {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  );
}
