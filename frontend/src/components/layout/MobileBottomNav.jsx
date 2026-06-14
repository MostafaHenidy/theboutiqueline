import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Home, Store, ShoppingBag, Heart } from 'lucide-react';
import { toggleCartDrawer } from '../../store/slices/uiSlice';
import { selectCartCount } from '../../store/slices/cartSlice';

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const dispatch   = useDispatch();
  const cartCount  = useSelector(selectCartCount);
  const { items: wishlistItems } = useSelector((s) => s.wishlist);
  const { isAuthenticated }      = useSelector((s) => s.auth);
  const cartDrawerOpen           = useSelector((s) => s.ui.cartDrawerOpen);

  const base = 'flex flex-col items-center justify-center gap-1 flex-1 py-2 font-mono uppercase text-[9px] tracking-widest transition-colors';
  const navClass = (active) => `${base} ${active ? 'text-foreground' : 'text-foreground-dim'}`;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-theme border-t border-line"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-between px-2 min-h-[3.25rem]">

        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          {({ isActive }) => (
            <>
              <Home size={19} strokeWidth={isActive ? 2 : 1.5} />
              <span style={{ letterSpacing: '0.12em' }}>{t('nav_home')}</span>
            </>
          )}
        </NavLink>

        <NavLink to="/products" className={({ isActive }) => navClass(isActive)}>
          {({ isActive }) => (
            <>
              <Store size={19} strokeWidth={isActive ? 2 : 1.5} />
              <span style={{ letterSpacing: '0.12em' }}>{t('nav_shop_short')}</span>
            </>
          )}
        </NavLink>

        <button type="button" onClick={() => dispatch(toggleCartDrawer())}
          className={navClass(cartDrawerOpen)}>
          <span className="relative">
            <ShoppingBag size={19} strokeWidth={cartDrawerOpen ? 2 : 1.5} />
            {cartCount > 0 && (
              <span className="cart-count-badge absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </span>
          <span style={{ letterSpacing: '0.12em' }}>{t('nav_cart')}</span>
        </button>

        <NavLink to="/wishlist" className={({ isActive }) => navClass(isActive)}>
          {({ isActive }) => (
            <>
              <span className="relative">
                <Heart
                  size={19}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? 'text-foreground' : ''}
                  style={{ fill: isActive ? 'var(--color-accent-dim)' : 'none', color: isActive ? 'var(--color-accent)' : undefined }}
                />
                {isAuthenticated && wishlistItems.length > 0 && (
                  <span className="cart-count-badge absolute -top-1.5 -right-1.5 w-3.5 h-3.5 min-w-0 p-0" />
                )}
              </span>
              <span style={{ letterSpacing: '0.12em' }}>{t('nav_saved')}</span>
            </>
          )}
        </NavLink>

      </div>
    </nav>
  );
}
