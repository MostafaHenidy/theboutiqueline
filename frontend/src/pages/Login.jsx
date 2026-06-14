import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { loginUser, clearError } from '../store/slices/authSlice';
import AuthPageShell from '../components/auth/AuthPageShell';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
    return () => dispatch(clearError());
  }, [isAuthenticated]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = typeof form.email === 'string' ? form.email.trim().toLowerCase() : form.email;
    dispatch(loginUser({ ...form, email }));
  };

  return (
    <>
      <Helmet><title>{`${t('login')} | ${t('brand')}`}</title></Helmet>
      <AuthPageShell
        title={t('login')}
        subtitle={language === 'ar' ? 'مرحباً بعودتك!' : 'Welcome back!'}
      >
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="auth-label">{t('email')}</label>
            <div className="relative">
              <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-foreground-dim pointer-events-none" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="auth-input ps-9"
                placeholder="example@email.com"
                required
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="auth-label">{t('password')}</label>
            <div className="relative">
              <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-foreground-dim pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="auth-input ps-9 pe-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="auth-check rounded-sm" />
              <span className="text-xs text-foreground-dim">{language === 'ar' ? 'تذكرني' : 'Remember me'}</span>
            </label>
            <Link to="/forgot-password" className="auth-link text-xs">{t('forgot_password')}</Link>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="auth-btn mt-2"
          >
            {loading ? (language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...') : t('login')}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-foreground-dim text-xs">
            {language === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
            <Link to="/register" className="auth-link">{t('register')}</Link>
          </p>
        </div>
      </AuthPageShell>
    </>
  );
}
