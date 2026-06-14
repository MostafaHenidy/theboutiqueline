import React, { useEffect, lazy, Suspense, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import { fetchUser } from './store/slices/authSlice';
import { hydrateGuestCart, bootstrapAuthCart } from './store/slices/cartSlice';
import { fetchWishlist, clearWishlist } from './store/slices/wishlistSlice';
import { setLanguage } from './store/slices/uiSlice';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import PageLoader from './components/common/PageLoader';
import { syncLanguageFromSiteSettings } from './utils/language';
import { scrollToTop } from './utils/scrollToTop';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmed = lazy(() => import('./pages/OrderConfirmed'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const OTPVerification = lazy(() => import('./pages/OTPVerification'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Profile = lazy(() => import('./pages/Profile'));
const Addresses = lazy(() => import('./pages/Addresses'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminReportView = lazy(() => import('./pages/admin/AdminReportView'));
const AdminLiveView = lazy(() => import('./pages/admin/AdminLiveView'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminNavLinks = lazy(() => import('./pages/admin/AdminNavLinks'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminLandingPages = lazy(() => import('./pages/admin/AdminLandingPages'));
const AdminLandingPageBuilder = lazy(() => import('./pages/admin/AdminLandingPageBuilder'));
const AdminLandingPageAnalytics = lazy(() => import('./pages/admin/AdminLandingPageAnalytics'));
const AdminMarketingIntegrations = lazy(() => import('./pages/admin/AdminMarketingIntegrations'));
const AdminWhatsApp = lazy(() => import('./pages/admin/AdminWhatsApp'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const location = useLocation();
  const authCartBootstrapped = useRef(false);

  /** Re-read admin default_language unless the visitor chose a language in the header. */
  useEffect(() => {
    syncLanguageFromSiteSettings(dispatch, setLanguage);
  }, [dispatch]);

  useEffect(() => {
    dispatch(hydrateGuestCart());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      authCartBootstrapped.current = false;
      dispatch(clearWishlist());
      return;
    }
    if (authCartBootstrapped.current) return;
    authCartBootstrapped.current = true;
    dispatch(fetchUser());
    dispatch(bootstrapAuthCart());
    dispatch(fetchWishlist());
  }, [isAuthenticated, dispatch]);

  /** SPA: scroll to top on every route change (including after scroll-lock unlock on mobile nav). */
  useEffect(() => {
    scrollToTop();
    const raf = requestAnimationFrame(() => scrollToTop());
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.search, location.key]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="analytics/reports" element={<AdminReports />} />
            <Route path="analytics/reports/:slug" element={<AdminReportView />} />
            <Route path="analytics/live" element={<AdminLiveView />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="nav-links" element={<AdminNavLinks />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="marketing" element={<AdminMarketingIntegrations />} />
            <Route path="whatsapp" element={<AdminWhatsApp />} />
            <Route path="landing-pages" element={<AdminLandingPages />} />
            <Route path="landing-pages/:id" element={<AdminLandingPageBuilder />} />
            <Route path="landing-pages/:id/analytics" element={<AdminLandingPageAnalytics />} />
          </Route>

          {/* Public & Customer Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/category/:slug" element={<Products />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmed/:orderNumber" element={<OrderConfirmed />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
            <Route path="/lp/:slug" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
