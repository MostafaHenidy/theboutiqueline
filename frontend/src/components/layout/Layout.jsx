import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';
import MarketingPixels from '../marketing/MarketingPixels';
import AnalyticsTracker from '../analytics/AnalyticsTracker';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col w-full max-w-[100vw] bg-theme">
      <MarketingPixels />
      <AnalyticsTracker />
      <Header />
      <div className="site-header-spacer" aria-hidden="true" />
      <CartDrawer />
      <motion.main
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}
