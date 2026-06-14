import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Plus, MapPin, Trash2, Edit } from 'lucide-react';
import api from '../utils/api';
import {
  DELIVERY_COUNTRY_META,
  getRegionsForCountry,
  parseCountryToCode,
  parseDeliveryCountryCodes,
  getCountryLabel,
} from '../utils/helpers';
import toast from 'react-hot-toast';

const LABEL = 'block font-mono text-foreground-dim text-[10px] uppercase tracking-widest mb-1.5';
const LABEL_STYLE = { letterSpacing: '0.12em' };

const buildEmptyForm = (countryCode = 'EG') => ({
  full_name: '',
  phone: '',
  city: '',
  district: '',
  street: '',
  postal_code: '',
  country: countryCode,
  label: '',
  is_default: false,
});

export default function Addresses() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(buildEmptyForm('EG'));
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shopDeliveryCodes, setShopDeliveryCodes] = useState(['EG']);

  const pageTitle = t('addresses').toUpperCase();

  const fetchAddresses = () => {
    api.get('/addresses').then(({ data }) => setAddresses(data.data)).catch(() => {});
  };

  useEffect(() => {
    fetchAddresses();
    api.get('/shop/settings').then(({ data }) => {
      setShopDeliveryCodes(parseDeliveryCountryCodes(data.data?.delivery_countries));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) { await api.put(`/addresses/${editId}`, form); toast.success(ar ? 'تم تحديث العنوان' : 'Address updated'); }
      else { await api.post('/addresses', form); toast.success(ar ? 'تمت إضافة العنوان' : 'Address added'); }
      fetchAddresses();
      setShowForm(false);
      setForm(buildEmptyForm(shopDeliveryCodes[0] || 'EG'));
      setEditId(null);
    } catch { toast.error('Error'); }
    setLoading(false);
  };

  const handleEdit = (addr) => {
    const co = parseCountryToCode(addr.country);
    const country = shopDeliveryCodes.includes(co) ? co : shopDeliveryCodes[0];
    const regions = getRegionsForCountry(country);
    const city = regions.length === 0 || regions.includes(addr.city) ? addr.city : '';
    setForm({ ...addr, country, city });
    setEditId(addr.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(ar ? 'حذف العنوان؟' : 'Delete address?')) return;
    await api.delete(`/addresses/${id}`);
    fetchAddresses();
    toast.success(ar ? 'تم الحذف' : 'Deleted');
  };

  const regionOptions = getRegionsForCountry(form.country);
  const enabledCountryOptions = DELIVERY_COUNTRY_META.filter((c) => shopDeliveryCodes.includes(c.code));

  return (
    <>
      <Helmet><title>{`${t('addresses')} | ${t('brand')}`}</title></Helmet>
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
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
              <button
                type="button"
                onClick={() => { setShowForm(true); setForm(buildEmptyForm(shopDeliveryCodes[0] || 'EG')); setEditId(null); }}
                className="btn-accent-solid px-5 py-3 flex items-center gap-2 text-[10px]"
              >
                <Plus size={14} /> {ar ? 'إضافة عنوان' : 'Add Address'}
              </button>
            </div>
          </div>
        </div>

        <div className="container-custom py-10 max-w-3xl">
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleSubmit}
                className="account-card mb-6"
              >
                <h3
                  className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest mb-5"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {editId ? (ar ? 'تعديل العنوان' : 'Edit Address') : (ar ? 'عنوان جديد' : 'New Address')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { field: 'label', label: ar ? 'التسمية (منزل، عمل...)' : 'Label (Home, Work...)', type: 'text', dir: '' },
                    { field: 'full_name', label: t('full_name'), type: 'text', dir: '' },
                    { field: 'phone', label: t('phone'), type: 'tel', dir: 'ltr' },
                    { field: 'postal_code', label: t('postal_code'), type: 'text', dir: 'ltr' },
                    { field: 'district', label: t('district'), type: 'text', dir: '' },
                    { field: 'street', label: t('street'), type: 'text', dir: '' },
                  ].map(({ field, label, type, dir }) => (
                    <div key={field}>
                      <label className={LABEL} style={LABEL_STYLE}>{label}</label>
                      <input type={type} value={form[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="input-boutique" dir={dir} />
                    </div>
                  ))}
                  <div>
                    <label className={LABEL} style={LABEL_STYLE}>{t('country')} *</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value, city: '' })}
                      className="input-boutique"
                      required
                    >
                      {enabledCountryOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                          {ar ? c.labelAr : c.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL} style={LABEL_STYLE}>
                      {form.country === 'EG' ? (ar ? 'المحافظة *' : 'Governorate *') : `${t('city')} *`}
                    </label>
                    {regionOptions.length > 0 ? (
                      <select
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="input-boutique"
                        required
                      >
                        <option value="">{ar ? 'اختر من القائمة' : 'Select from list'}</option>
                        {regionOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={form.city || ''}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="input-boutique"
                        required
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={form.is_default}
                      onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      className="rounded border-line text-boutique"
                    />
                    <label htmlFor="is_default" className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest cursor-pointer" style={{ letterSpacing: '0.1em' }}>
                      {ar ? 'العنوان الافتراضي' : 'Set as default'}
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-5 flex-wrap">
                  <button type="submit" disabled={loading} className="btn-accent-solid px-6 py-3 text-[10px] disabled:opacity-50">
                    {loading ? '...' : t('save')}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline-boutique px-6 py-3 text-[10px]">
                    {t('cancel')}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {addresses.length === 0 && !showForm ? (
            <div className="text-center py-20">
              <MapPin size={64} strokeWidth={1} className="mx-auto text-foreground-dim mb-5 opacity-40" />
              <p className="font-mono text-foreground-muted uppercase text-sm tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {ar ? 'لا توجد عناوين محفوظة' : 'No saved addresses'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="account-card"
                  style={{ borderColor: addr.is_default ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {addr.label && (
                        <span
                          className="font-mono uppercase text-[9px] tracking-widest px-2 py-0.5"
                          style={{ letterSpacing: '0.1em', backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
                        >
                          {addr.label}
                        </span>
                      )}
                      {addr.is_default && (
                        <span
                          className="ms-2 font-mono uppercase text-[9px] tracking-widest px-2 py-0.5"
                          style={{ letterSpacing: '0.1em', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                        >
                          {ar ? 'افتراضي' : 'Default'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => handleEdit(addr)} className="p-1.5 text-foreground-dim hover:text-boutique transition-colors">
                        <Edit size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(addr.id)} className="p-1.5 text-foreground-dim hover:text-boutique transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono font-bold text-foreground uppercase text-sm tracking-wide mt-3">{addr.full_name}</p>
                  <p className="font-mono text-foreground-muted text-[11px] mt-1">{addr.city}{addr.district ? `, ${addr.district}` : ''}</p>
                  <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                    {getCountryLabel(parseCountryToCode(addr.country), language)}
                  </p>
                  {addr.street && <p className="font-mono text-foreground-dim text-[11px] mt-1">{addr.street}</p>}
                  <p className="font-mono text-foreground text-[11px] mt-1" dir="ltr">{addr.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
