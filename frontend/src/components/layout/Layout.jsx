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
        initial={false}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}
