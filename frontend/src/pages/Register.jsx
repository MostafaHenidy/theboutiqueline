import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser, clearError } from '../store/slices/authSlice';
import AuthPageShell from '../components/auth/AuthPageShell';

function AuthField({ label, icon: Icon, type, value, onChange, dir = '', minLength }) {
  return (
    <div>
      <label className="auth-label">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-foreground-dim pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="auth-input ps-9"
          required
          dir={dir}
          minLength={minLength}
        />
      </div>
    </div>
  );
}

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    const email = form.email.trim().toLowerCase();
    navigate('/verify-otp', { state: { email } });
    return () => dispatch(clearError());
  }, [isAuthenticated, form.email, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setValidationError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    setValidationError('');
    try {
      const data = await dispatch(registerUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        locale: language,
      })).unwrap();
      if (data?.email_sent === false) {
        toast.error(
          data?.email_error
            || (language === 'ar' ? 'تم إنشاء الحساب لكن تعذر إرسال رمز التحقق' : 'Account created, but verification email could not be sent'),
        );
      }
    } catch {
      /* error shown via auth slice */
    }
  };

  return (
    <>
      <Helmet><title>{`${t('register')} | ${t('brand')}`}</title></Helmet>
      <AuthPageShell
        title={t('register')}
        subtitle={language === 'ar' ? 'أنشئ حسابك الجديد' : 'Create your new account'}
      >
        {(error || validationError) && (
          <div className="auth-error">{error || validationError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthField
            label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
            icon={User}
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <AuthField
            label={t('email')}
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            dir="ltr"
          />
          <AuthField
            label={t('phone')}
            icon={Phone}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
          />

          {[
            { field: 'password', label: t('password') },
            { field: 'confirmPassword', label: t('confirm_password') },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="auth-label">{label}</label>
              <div className="relative">
                <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-foreground-dim pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="auth-input ps-9 pe-9"
                  required
                  minLength={8}
                />
                {field === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input type="checkbox" className="auth-check rounded-sm mt-0.5" required />
            <span className="text-xs text-foreground-dim leading-relaxed">
              {language === 'ar' ? 'أوافق على ' : 'I agree to the '}
              <Link to="/terms" className="auth-link">{t('terms')}</Link>
              {language === 'ar' ? ' و' : ' and '}
              <Link to="/privacy" className="auth-link">{t('privacy')}</Link>
            </span>
          </label>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="auth-btn"
          >
            {loading ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : t('register')}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-foreground-dim text-xs">
            {language === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
            <Link to="/login" className="auth-link">{t('login')}</Link>
          </p>
        </div>
      </AuthPageShell>
    </>
  );
}
