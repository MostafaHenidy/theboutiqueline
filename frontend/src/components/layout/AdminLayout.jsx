import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, ShoppingCart, Tags, TicketPercent, Image, Users, Star, Settings, LogOut, Menu, Bell, FileText, Megaphone, MessageCircle, Navigation, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import BrandLogo from '../common/BrandLogo';

const analyticsNavChildren = [
  { to: '/admin/analytics', label: 'Overview', label_ar: 'نظرة عامة', exact: true },
  { to: '/admin/analytics/reports', label: 'Reports', label_ar: 'التقارير' },
  { to: '/admin/analytics/live', label: 'Live View', label_ar: 'العرض المباشر' },
];

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', label_ar: 'الرئيسية', exact: true },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', label_ar: 'الطلبات' },
  { to: '/admin/products', icon: Package, label: 'Products', label_ar: 'المنتجات' },
  { to: '/admin/categories', icon: Tags, label: 'Categories', label_ar: 'الفئات' },
  { to: '/admin/coupons', icon: TicketPercent, label: 'Coupons', label_ar: 'الكوبونات' },
  { to: '/admin/banners', icon: Image, label: 'Banners', label_ar: 'البانرات' },
  { to: '/admin/nav-links', icon: Navigation, label: 'Navigation', label_ar: 'القائمة' },
  { to: '/admin/customers', icon: Users, label: 'Customers', label_ar: 'العملاء' },
  { to: '/admin/reviews', icon: Star, label: 'Reviews', label_ar: 'التقييمات' },
  { to: '/admin/landing-pages', icon: FileText, label: 'Landing Pages', label_ar: 'صفحات الهبوط' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', label_ar: 'الإعدادات' },
  { to: '/admin/marketing', icon: Megaphone, label: 'Marketing', label_ar: 'التسويق' },
  { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp', label_ar: 'واتساب' },
];

const ORDERS_ONLY_NAV = ['/admin/orders'];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { language } = useSelector((s) => s.ui);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(() => location.pathname.startsWith('/admin/analytics'));

  const handleLogout = () => { dispatch(logout()); navigate('/'); };
  const isOrdersOnlyAdmin = user?.role === 'orders_admin';
  const visibleNavItems = isOrdersOnlyAdmin
    ? navItems.filter((item) => ORDERS_ONLY_NAV.includes(item.to))
    : navItems;

  useEffect(() => {
    if (isOrdersOnlyAdmin && !location.pathname.startsWith('/admin/orders')) {
      navigate('/admin/orders', { replace: true });
    }
  }, [isOrdersOnlyAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/analytics')) {
      setAnalyticsOpen(true);
    }
  }, [location.pathname]);

  const isActive = (item) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  const isAnalyticsActive = location.pathname.startsWith('/admin/analytics');

  const navLinkClass = (active) => `admin-nav-link flex items-center gap-3 px-3 py-2.5 transition-all ${active ? 'admin-nav-link--active' : ''}`;

  const Sidebar = ({ mobile = false }) => (
    <aside className={`admin-sidebar h-full flex flex-col border-e ${mobile ? 'w-72' : sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
      <div className="p-5 border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo
            variant={sidebarOpen || mobile ? 'admin' : 'adminCompact'}
            withLink={false}
            className="flex-shrink-0"
          />
          {(sidebarOpen || mobile) && (
            <p className="text-foreground-dim text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ letterSpacing: '0.14em' }}>
              Admin Panel
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleNavItems.map(({ to, icon: Icon, label, label_ar }, index) => (
          <div key={to}>
            <Link to={to} onClick={() => setMobileSidebar(false)} className={navLinkClass(isActive({ to, exact: to === '/admin' }))}>
              <Icon size={20} className="flex-shrink-0" />
              {(sidebarOpen || mobile) && (
                <span className="text-xs font-bold uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>
                  {language === 'ar' ? label_ar : label}
                </span>
              )}
            </Link>

            {index === 0 && !isOrdersOnlyAdmin && (
              <div className="mt-1">
                {sidebarOpen || mobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAnalyticsOpen((o) => !o)}
                      className={`${navLinkClass(isAnalyticsActive)} w-full`}
                    >
                      <BarChart3 size={20} className="flex-shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-widest flex-1 text-start" style={{ letterSpacing: '0.1em' }}>
                        {language === 'ar' ? 'التحليلات' : 'Analytics'}
                      </span>
                      {analyticsOpen
                        ? <ChevronDown size={16} className="flex-shrink-0 opacity-70" />
                        : <ChevronRight size={16} className="flex-shrink-0 opacity-70" />}
                    </button>
                    {analyticsOpen && (
                      <div className="mt-1 ms-3 space-y-0.5 border-s border-line ps-2">
                        {analyticsNavChildren.map(({ to: childTo, label: childLabel, label_ar: childLabelAr, exact }) => {
                          const childActive = exact ? location.pathname === childTo : location.pathname.startsWith(childTo);
                          return (
                            <Link
                              key={childTo}
                              to={childTo}
                              onClick={() => setMobileSidebar(false)}
                              className={`admin-nav-sublink block px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all ${childActive ? 'admin-nav-sublink--active' : ''}`}
                              style={{ letterSpacing: '0.08em' }}
                            >
                              {language === 'ar' ? childLabelAr : childLabel}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to="/admin/analytics"
                    onClick={() => setMobileSidebar(false)}
                    className={`${navLinkClass(isAnalyticsActive)} justify-center`}
                    title={language === 'ar' ? 'التحليلات' : 'Analytics'}
                  >
                    <BarChart3 size={20} />
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-line">
        {(sidebarOpen || mobile) && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-bold truncate">{user?.name}</p>
              <p className="text-foreground-dim text-xs truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="admin-nav-link flex items-center gap-2 text-xs font-bold uppercase tracking-widest w-full px-3 py-2"
          style={{ letterSpacing: '0.1em' }}
        >
          <LogOut size={18} /> {(sidebarOpen || mobile) && (language === 'ar' ? 'تسجيل الخروج' : 'Logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-shell flex h-screen overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="hidden lg:block flex-shrink-0 h-full">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: language === 'ar' ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: language === 'ar' ? 280 : -280 }}
              className={`fixed ${language === 'ar' ? 'right-0' : 'left-0'} top-0 bottom-0 z-50 lg:hidden`}
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="admin-header h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setSidebarOpen(!sidebarOpen); setMobileSidebar(!mobileSidebar); }}
              className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <Menu size={22} />
            </button>
            <Link
              to="/"
              className="text-[10px] font-bold uppercase tracking-widest text-foreground-dim hover:text-boutique transition-colors"
              style={{ letterSpacing: '0.12em' }}
            >
              {language === 'ar' ? '→ العودة للموقع' : '← Back to Store'}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors relative">
              <Bell size={20} />
            </button>
            <div
              className="w-9 h-9 flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
