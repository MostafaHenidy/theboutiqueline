import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import AuthPageShell from '../components/auth/AuthPageShell';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        locale: language,
      });
      if (data?.email_sent === false) {
        toast.error(data?.email_error || (language === 'ar' ? 'تعذر إرسال البريد' : 'Could not send email'));
        return;
      }
      toast.success(language === 'ar' ? 'تم إرسال رمز التحقق لبريدك' : 'Verification code sent to your email');
      navigate('/verify-otp', { state: { email: email.trim().toLowerCase(), mode: 'reset' } });
    } catch (err) {
      toast.error(err.response?.data?.message || (language === 'ar' ? 'تعذر إرسال البريد' : 'Could not send email'));
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet><title>{`${t('forgot_password')} | ${t('brand')}`}</title></Helmet>
      <AuthPageShell
        title={t('forgot_password')}
        subtitle={language === 'ar' ? 'أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين' : "Enter your email and we'll send you a reset code"}
        backLink={(
          <Link to="/login" className="auth-back">
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="auth-label">{t('email')}</label>
            <div className="relative">
              <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-foreground-dim pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input ps-9"
                placeholder="example@email.com"
                required
                dir="ltr"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? '...' : language === 'ar' ? 'إرسال رمز التحقق' : 'Send Reset Code'}
          </button>
        </form>
      </AuthPageShell>
    </>
  );
}
