import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Package, Heart, MapPin, User, ChevronRight, ShoppingBag } from 'lucide-react';
import { resolveMediaUrl } from '../utils/helpers';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { language } = useSelector((s) => s.ui);
  const { items: wishlistItems } = useSelector((s) => s.wishlist);
  const { items: cartItems } = useSelector((s) => s.cart);

  const pageTitle = language === 'ar' ? 'حسابي' : 'MY ACCOUNT';

  const menuItems = [
    { to: '/orders', icon: Package, label: t('orders'), desc: language === 'ar' ? 'تتبع طلباتك' : 'Track your orders' },
    { to: '/wishlist', icon: Heart, label: t('wishlist'), desc: language === 'ar' ? `${wishlistItems.length} منتج` : `${wishlistItems.length} items` },
    { to: '/cart', icon: ShoppingBag, label: t('cart'), desc: language === 'ar' ? `${cartItems.length} منتج` : `${cartItems.length} items` },
    { to: '/addresses', icon: MapPin, label: t('addresses'), desc: language === 'ar' ? 'إدارة عناوينك' : 'Manage addresses' },
    { to: '/profile', icon: User, label: t('profile'), desc: language === 'ar' ? 'تعديل بيانات حسابك' : 'Edit account info' },
  ];

  return (
    <>
      <Helmet><title>{`${pageTitle} | ${t('brand')}`}</title></Helmet>
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <nav className="flex items-center gap-2 mb-3">
              <Link
                to="/"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                Home
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {pageTitle}
              </span>
            </nav>
            <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 flex items-center gap-5">
            {user?.avatar ? (
              <img
                src={resolveMediaUrl(user.avatar)}
                alt={user.name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
                style={{ border: '2px solid var(--color-accent)' }}
              />
            ) : (
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-mono font-bold text-2xl md:text-3xl"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)', border: '2px solid var(--color-accent)' }}
              >
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <h2 className="font-mono font-bold text-foreground uppercase text-lg md:text-xl tracking-tight">
                {language === 'ar' ? `مرحباً، ${user?.name}!` : `Welcome, ${user?.name}!`}
              </h2>
              <p className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="container-custom py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {menuItems.map(({ to, icon: Icon, label, desc }) => (
              <motion.div key={to} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                <Link to={to} className="account-card block group">
                  <div
                    className="w-12 h-12 flex items-center justify-center mb-4 border border-line group-hover:border-[var(--color-accent)] transition-colors"
                    style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-mono font-bold text-foreground uppercase text-sm tracking-wide">{label}</h3>
                  <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1.5" style={{ letterSpacing: '0.1em' }}>
                    {desc}
                  </p>
                  <div className="flex items-center justify-end mt-4">
                    <ChevronRight size={16} className="text-foreground-dim group-hover:text-[var(--color-accent)] transition-colors rtl:rotate-180" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
