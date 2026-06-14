import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Camera, User, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { updateProfile } from '../store/slices/authSlice';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../utils/helpers';

const LABEL = 'block font-mono text-foreground-dim text-[10px] uppercase tracking-widest mb-1.5';
const LABEL_STYLE = { letterSpacing: '0.12em' };

export default function Profile() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageTitle = t('profile').toUpperCase();

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dispatch(updateProfile(profileForm)).unwrap();
      toast.success(ar ? 'تم تحديث البيانات' : 'Profile updated');
    } catch (err) { toast.error(err); }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(ar ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success(ar ? 'تم تغيير كلمة المرور' : 'Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setLoading(false);
  };

  return (
    <>
      <Helmet><title>{`${t('profile')} | ${t('brand')}`}</title></Helmet>
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <nav className="flex items-center gap-2 mb-3">
              <Link
                to="/dashboard"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                {ar ? 'حسابي' : 'Account'}
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {pageTitle}
              </span>
            </nav>
            <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
          </div>
        </div>

        <div className="container-custom py-10 max-w-2xl">
          <div className="account-card mb-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {user?.avatar ? (
                  <img
                    src={resolveMediaUrl(user.avatar)}
                    alt={user.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover"
                    style={{ border: '2px solid var(--color-accent)' }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center font-mono font-bold text-2xl md:text-3xl"
                    style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)', border: '2px solid var(--color-accent)' }}
                  >
                    {user?.name?.[0]}
                  </div>
                )}
                <button
                  type="button"
                  className="absolute bottom-0 end-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                >
                  <Camera size={14} />
                </button>
              </div>
              <div>
                <p className="font-mono font-bold text-foreground uppercase text-lg tracking-tight">{user?.name}</p>
                <p className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                  {user?.email}
                </p>
                {user?.email_verified && (
                  <span className="font-mono text-boutique text-[9px] uppercase tracking-widest mt-2 inline-block" style={{ letterSpacing: '0.12em' }}>
                    ✓ {ar ? 'موثق' : 'Verified'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="account-card mb-6">
            <h3 className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest mb-5" style={{ letterSpacing: '0.12em' }}>
              {ar ? 'البيانات الشخصية' : 'Personal Info'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className={LABEL} style={LABEL_STYLE}>{ar ? 'الاسم الكامل' : 'Full Name'}</label>
                <div className="relative">
                  <User size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-foreground-dim" />
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-boutique ps-10" />
                </div>
              </div>
              <div>
                <label className={LABEL} style={LABEL_STYLE}>{t('phone')}</label>
                <div className="relative">
                  <Phone size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-foreground-dim" />
                  <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-boutique ps-10" dir="ltr" />
                </div>
              </div>
              <div>
                <label className={LABEL} style={LABEL_STYLE}>{t('email')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-foreground-dim" />
                  <input
                    value={user?.email}
                    className="input-boutique ps-10 opacity-60 cursor-not-allowed"
                    disabled
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-accent-solid px-8 py-3 text-[10px] mt-5 disabled:opacity-50">
              {loading ? '...' : t('save')}
            </button>
          </form>

          <form onSubmit={handlePasswordChange} className="account-card">
            <h3 className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest mb-5" style={{ letterSpacing: '0.12em' }}>
              {ar ? 'تغيير كلمة المرور' : 'Change Password'}
            </h3>
            <div className="space-y-4">
              {[
                { field: 'currentPassword', label: ar ? 'كلمة المرور الحالية' : 'Current Password' },
                { field: 'newPassword', label: ar ? 'كلمة المرور الجديدة' : 'New Password' },
                { field: 'confirmPassword', label: t('confirm_password') },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className={LABEL} style={LABEL_STYLE}>{label}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-foreground-dim" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                      className="input-boutique ps-10 pe-10"
                      required={field === 'currentPassword'}
                    />
                    {field === 'currentPassword' && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute end-3.5 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground transition-colors"
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-accent-solid px-8 py-3 text-[10px] mt-5 disabled:opacity-50">
              {loading ? '...' : ar ? 'تغيير كلمة المرور' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
