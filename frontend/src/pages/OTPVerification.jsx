import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import toast from 'react-hot-toast';
import AuthPageShell from '../components/auth/AuthPageShell';

const OTP_EMAIL_KEY = 'otp_verify_email';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function extractOtpDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6);
}

export default function OTPVerification() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const authUser = useSelector((s) => s.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const routeEmail = normalizeEmail(location.state?.email);
  const mode = location.state?.mode;
  const email = useMemo(() => {
    if (routeEmail) return routeEmail;
    const stored = normalizeEmail(sessionStorage.getItem(OTP_EMAIL_KEY));
    if (stored) return stored;
    return normalizeEmail(authUser?.email);
  }, [routeEmail, authUser?.email]);

  useEffect(() => {
    if (email) sessionStorage.setItem(OTP_EMAIL_KEY, email);
  }, [email]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, val) => {
    const digits = extractOtpDigits(val);
    if (!digits) {
      const newOtp = [...otp];
      newOtp[i] = '';
      setOtp(newOtp);
      return;
    }
    if (digits.length === 1) {
      const newOtp = [...otp];
      newOtp[i] = digits;
      setOtp(newOtp);
      if (i < 5) refs[i + 1].current?.focus();
      return;
    }
    const newOtp = [...otp];
    digits.split('').forEach((digit, offset) => {
      if (i + offset < 6) newOtp[i + offset] = digit;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(i + digits.length, 5);
    refs[nextIndex].current?.focus();
  };

  const handlePaste = (i, e) => {
    const pasted = extractOtpDigits(e.clipboardData.getData('text'));
    if (!pasted) return;
    e.preventDefault();
    handleChange(i, pasted);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handleResend = async () => {
    if (!email) {
      toast.error(language === 'ar' ? 'البريد غير متوفر' : 'Email not available');
      return;
    }
    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-otp', { email, locale: language });
      if (data?.email_sent === false) {
        toast.error(data?.message || (language === 'ar' ? 'تعذر إرسال البريد' : 'Could not send email'));
        return;
      }
      toast.success(language === 'ar' ? 'تم إرسال رمز جديد' : 'New code sent');
      setOtp(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || (language === 'ar' ? 'تعذر إرسال البريد' : 'Could not send email'));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error(language === 'ar' ? 'أدخل الرمز كاملاً' : 'Please enter complete code');
      return;
    }
    if (!email) {
      toast.error(language === 'ar' ? 'البريد غير متوفر. سجّل من جديد أو اطلب رمزاً جديداً.' : 'Email not available. Register again or request a new code.');
      return;
    }
    setLoading(true);
    try {
      const payload = { email, otp: String(code) };
      if (mode === 'reset') {
        await api.post('/auth/reset-password', { ...payload, password: newPassword });
        toast.success(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password reset successfully');
        sessionStorage.removeItem(OTP_EMAIL_KEY);
        navigate('/login');
      } else {
        await api.post('/auth/verify-otp', payload);
        toast.success(language === 'ar' ? 'تم التحقق من بريدك بنجاح' : 'Email verified successfully');
        sessionStorage.removeItem(OTP_EMAIL_KEY);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (language === 'ar' ? 'رمز غير صحيح' : 'Invalid code'));
    }
    setLoading(false);
  };

  return (
    <>
      <Helmet><title>{`${t('otp_verification')} | ${t('brand')}`}</title></Helmet>
      <AuthPageShell
        title={t('otp_verification')}
        subtitle={t('enter_otp')}
        email={email}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2 justify-center" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onPaste={(e) => handlePaste(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`auth-otp-digit ${digit ? 'auth-otp-digit--filled' : ''}`}
              />
            ))}
          </div>

          {mode === 'reset' && (
            <div>
              <label className="auth-label">{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="auth-input"
                required
                minLength={8}
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? '...' : language === 'ar' ? 'تحقق' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full text-xs text-foreground-dim hover:text-foreground transition-colors disabled:opacity-50"
          >
            {resending
              ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
              : (language === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
          </button>
        </form>
      </AuthPageShell>
    </>
  );
}
