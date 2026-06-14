import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Truck, Building2, MapPin, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { selectCartTotal, resetCart } from '../store/slices/cartSlice';
import {
  formatPrice,
  resolveMediaUrl,
  SHOP_CURRENCY,
  parseCountryToCode,
  getRegionsForCountry,
  DELIVERY_COUNTRY_META,
  parseDeliveryCountryCodes,
  parsePercentSetting,
} from '../utils/helpers';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { storePurchaseForPixels } from '../utils/marketingClient';
import { trackStoreEvent, getAnalyticsPayloadForOrder } from '../utils/analyticsTracker';

/* ─────────────────── Shared styles ─────────────────────── */
const INPUT = 'input-checkout w-full';

const LABEL = 'checkout-label block font-bold uppercase tracking-widest text-foreground-dim mb-1';

/* ─────────────────── Sub-components ────────────────────── */
function Card({ children }) {
  return <div className="checkout-card">{children}</div>;
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="checkout-section-title flex items-center gap-2 mb-3.5 text-foreground font-bold uppercase">
      {Icon && <Icon size={16} className="text-[var(--color-accent)]" />}
      {children}
    </h3>
  );
}

/* ─────────────────── Payment labels ────────────────────── */
const PM_LABELS = {
  stripe:        { label: 'Credit / Debit Card', icon: CreditCard },
  paymob:        { label: 'Paymob (Card / Wallet)', icon: Wallet   },
  cod:           { label: 'Cash on Delivery',    icon: Truck      },
  bank_transfer: { label: 'Bank Transfer',        icon: Building2  },
};

/* ═══════════════════ Page ═══════════════════════════════ */
export default function Checkout() {
  const navigate    = useNavigate();
  const dispatch    = useDispatch();
  const { items, coupon }       = useSelector((s) => s.cart);
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { language } = useSelector((s) => s.ui);
  const subtotal = useSelector(selectCartTotal);

  const [loading,         setLoading]         = useState(false);
  const [addresses,       setAddresses]       = useState([]);
  const [selectedAddr,    setSelectedAddr]    = useState(null);
  const [paymentMethod,   setPaymentMethod]   = useState('cod');
  const [settings,        setSettings]        = useState({});
  const [guestInfo,       setGuestInfo]       = useState({ name: '', email: '' });
  const [form, setForm] = useState({
    full_name: user?.name  || '',
    phone:     user?.phone || '',
    email:     user?.email || '',
    city:      '',
    district:  '',
    street:    '',
    country:   'EG',
  });

  /* Sync email when user loads */
  useEffect(() => {
    if (user?.email)
      setForm((f) => ({ ...f, email: f.email?.trim() ? f.email : user.email }));
  }, [user?.email]);

  useEffect(() => {
    if (items.length > 0) trackStoreEvent('begin_checkout', { path: '/checkout' });
  }, [items.length]);

  /* Fetch settings + saved addresses */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/shop/settings').then((r) => r.data?.data || {}).catch(() => ({})),
      api.get('/addresses').then((r) => r.data?.data || []).catch(() => []),
    ]).then(([shop, list]) => {
      if (cancelled) return;
      setSettings(shop);
      setAddresses(list);
      const dc  = parseDeliveryCountryCodes(shop.delivery_countries);
      const def = list.find((a) => a.is_default);
      if (!def) return;
      setSelectedAddr(def);
      const co      = parseCountryToCode(def.country);
      const country = dc.includes(co) ? co : dc[0];
      const regions = getRegionsForCountry(country);
      const city    = regions.length === 0 || regions.includes(def.city) ? def.city : '';
      setForm((p) => ({ ...p, full_name: def.full_name, phone: def.phone, city, district: def.district || '', street: def.street || '', country }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ── Pricing ─────────────────────────────────────────── */
  const deliveryCodes      = parseDeliveryCountryCodes(settings.delivery_countries);
  const countryOptions     = DELIVERY_COUNTRY_META.filter((c) => deliveryCodes.includes(c.code));
  const freeShipThreshold  = Math.max(0, Number(settings.free_shipping_threshold) || 5000);
  const baseShipping       = Math.max(0, Number(settings.shipping_cost) || 50);
  const taxPct             = parsePercentSetting(settings.tax_rate, 15);
  const shippingCost       = subtotal >= freeShipThreshold ? 0 : baseShipping;
  const discountAmount     = coupon?.discount || 0;
  const taxableAmount      = subtotal - discountAmount + shippingCost;
  const taxAmount          = taxableAmount * (taxPct / 100);
  const total              = taxableAmount + taxAmount;
  const regionOptions      = getRegionsForCountry(form.country);

  const enabledPayments = Object.entries(PM_LABELS)
    .filter(([id]) => settings[`payment_${id}`] !== 'false')
    .map(([id, meta]) => ({ id, ...meta }));

  /* ── Submit ───────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.city) {
      toast.error('Please fill all required fields'); return;
    }
    if (isAuthenticated && !form.email?.trim()) {
      toast.error('Please enter your email'); return;
    }
    if (!isAuthenticated && (!guestInfo.name || !guestInfo.email)) {
      toast.error('Please enter your name and email'); return;
    }
    setLoading(true);
    try {
      let data;
      if (isAuthenticated) {
        const res = await api.post('/orders', {
          shipping_address: form, billing_address: form,
          payment_method: paymentMethod, coupon_id: coupon?.coupon_id,
          locale: language,
          ...getAnalyticsPayloadForOrder(),
        });
        data = res.data;
      } else {
        const guestItems = items.map((i) => ({
          product_id: i.product_id || i.product?.id,
          quantity: i.quantity, size: i.size, color: i.color,
        }));
        const guestAddr = { ...form, email: guestInfo.email.trim() };
        const res = await api.post('/orders/guest', {
          shipping_address: guestAddr, billing_address: guestAddr,
          payment_method: paymentMethod,
          guest_name: guestInfo.name, guest_email: guestInfo.email.trim(),
          items: guestItems,
          locale: language,
          ...getAnalyticsPayloadForOrder(),
        });
        data = res.data;
      }

      toast.success('Order placed successfully!');

      const lpId = sessionStorage.getItem('landing_page_id');
      const trackedId = data?.data?.order_id ?? data?.data?.id;
      if (lpId && trackedId != null) {
        api.post(`/landing-pages/track-conversion/${lpId}`, { order_id: trackedId }).catch(() => {});
        sessionStorage.removeItem('landing_page_id');
      }

      const payload = data?.data;
      if (payload) {
        storePurchaseForPixels({
          total:      Number(payload.total ?? total),
          currency:   String(settings.currency || SHOP_CURRENCY).toUpperCase(),
          orderId:    payload.order_number || String(payload.order_id),
          productIds: items.map((i) => i.product_id || i.product?.id).filter(Boolean),
        });
      }

      const preview = {
        payment_method: paymentMethod, total, subtotal,
        shipping_cost: shippingCost, tax_amount: taxAmount, discount_amount: discountAmount,
        shipping_address: isAuthenticated ? form : { ...form, email: guestInfo.email.trim() },
        guest_name:  !isAuthenticated ? guestInfo.name  : undefined,
        guest_email: !isAuthenticated ? guestInfo.email : undefined,
        items: items.map((i) => ({
          id:          i.id,
          product_id:  i.product_id || i.product?.id,
          name_ar:     i.product?.name_ar,
          name_en:     i.product?.name_en,
          thumbnail:   i.product?.thumbnail,
          quantity:    i.quantity, size: i.size, color: i.color,
          unit_price:  Number(i.product?.sale_price || i.product?.price || 0),
          total_price: Number(i.product?.sale_price || i.product?.price || 0) * i.quantity,
        })),
      };

      if (payload?.order_number) {
        try {
          if (!isAuthenticated && guestInfo.email) {
            sessionStorage.setItem(`guest_order_${payload.order_number}`, guestInfo.email.trim().toLowerCase());
          }
          if (payload.order_id != null) {
            sessionStorage.setItem(`order_id_${payload.order_number}`, String(payload.order_id));
          }
        } catch (_) { /* noop */ }
      }

      if (paymentMethod === 'paymob' && payload?.order_number) {
        const initBody = {
          order_id: payload.order_id,
          order_number: payload.order_number,
          ...(!isAuthenticated ? { guest_email: guestInfo.email.trim() } : {}),
        };
        const payRes = await api.post('/orders/paymob/init', initBody);
        const iframeUrl = payRes.data?.data?.iframe_url;
        if (!iframeUrl) throw new Error('Paymob payment could not be started');
        dispatch(resetCart());
        toast.success('Redirecting to payment...');
        window.location.href = iframeUrl;
        return;
      }

      dispatch(resetCart());
      navigate(`/order-confirmed/${encodeURIComponent(payload.order_number)}`, {
        replace: false,
        state: {
          orderId:    payload.order_id,
          guestEmail: !isAuthenticated ? guestInfo.email.trim() : undefined,
          isGuest:    !isAuthenticated,
          preview,
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed. Please try again.');
    }
    setLoading(false);
  };

  /* ═══════════════════ Render ═══════════════════════════ */
  return (
    <>
      <Helmet><title>Checkout | Theboutiqueline</title></Helmet>

      <div className="page-checkout page-top-margin" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

        {/* ── Top bar ──────────────────────────────────── */}
        <div style={{ background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-5 flex items-center gap-3">
            <Lock size={15} className="text-[var(--color-accent)]" />
            <h1
              className="text-foreground uppercase font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)',
                letterSpacing: '0.2em',
              }}
            >
              Checkout
            </h1>
            <span className="text-foreground-dim checkout-body-text">—</span>
            <ShieldCheck size={15} className="text-emerald-400" />
            <span className="text-emerald-400 checkout-small-text font-semibold tracking-wider">
              Secure & Encrypted
            </span>
          </div>
        </div>

        <div className="container-custom py-10">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ══ Left: forms ════════════════════════════ */}
              <div className="lg:col-span-2 space-y-4">

                {/* Guest info */}
                {!isAuthenticated && (
                  <Card>
                    <SectionTitle>Your Information</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Full Name *</label>
                        <input
                          value={guestInfo.name}
                          onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                          className={INPUT}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Email Address *</label>
                        <input
                          type="email"
                          value={guestInfo.email}
                          onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                          className={INPUT}
                          dir="ltr"
                          placeholder="you@email.com"
                          required
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Saved addresses */}
                {addresses.length > 0 && (
                  <Card>
                    <SectionTitle icon={MapPin}>Saved Addresses</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {addresses.map((addr) => {
                        const isSelected = selectedAddr?.id === addr.id;
                        return (
                          <button
                            type="button"
                            key={addr.id}
                            onClick={() => {
                              const co      = parseCountryToCode(addr.country);
                              const country = deliveryCodes.includes(co) ? co : deliveryCodes[0];
                              const regions = getRegionsForCountry(country);
                              const city    = regions.length === 0 || regions.includes(addr.city) ? addr.city : '';
                              setSelectedAddr(addr);
                              setForm((p) => ({ ...p, full_name: addr.full_name, phone: addr.phone, city, district: addr.district || '', street: addr.street || '', country }));
                            }}
                            className={`text-start p-4 transition-all select-card ${isSelected ? 'select-card--active' : ''}`}
                          >
                            <p className="font-semibold text-foreground checkout-body-text">{addr.full_name}</p>
                            <p className="text-foreground-dim checkout-small-text mt-1">{[addr.city, addr.district].filter(Boolean).join(', ')}</p>
                            <p className="text-foreground-dim checkout-small-text mt-0.5" dir="ltr">{addr.phone}</p>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Shipping address */}
                <Card>
                  <SectionTitle icon={Truck}>Shipping Address</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Full Name *</label>
                      <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INPUT} required placeholder="Recipient full name" />
                    </div>
                    <div>
                      <label className={LABEL}>Phone *</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT} dir="ltr" required placeholder="+20 1XX XXXX XXX" />
                    </div>

                    {isAuthenticated && (
                      <div className="sm:col-span-2">
                        <label className={LABEL}>Email Address *</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} dir="ltr" required placeholder="you@email.com" />
                      </div>
                    )}

                    <div>
                      <label className={LABEL}>Country *</label>
                      <select
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value, city: '' })}
                        className={INPUT}
                        required
                      >
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>{c.labelEn}</option>
                        ))}
                      </select>
                    </div>

                    <div className={regionOptions.length > 0 ? '' : 'sm:col-span-2'}>
                      <label className={LABEL}>
                        {form.country === 'EG' ? 'Governorate *' : 'City *'}
                      </label>
                      {regionOptions.length > 0 ? (
                        <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={INPUT} required>
                          <option value="">Select governorate</option>
                          {regionOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={INPUT} required placeholder="City" />
                      )}
                    </div>

                    <div>
                      <label className={LABEL}>District / Area</label>
                      <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={INPUT} placeholder="Neighbourhood / district" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Street Address</label>
                      <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={INPUT} placeholder="Street name, building & apartment number" />
                    </div>
                  </div>
                </Card>

                {/* Payment method */}
                <Card>
                  <SectionTitle icon={CreditCard}>Payment Method</SectionTitle>
                  <div className="space-y-3">
                    {enabledPayments.map(({ id, label, icon: Icon }) => {
                      const active = paymentMethod === id;
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-4 p-4 cursor-pointer transition-all select-card ${active ? 'select-card--active' : ''}`}
                        >
                          <input type="radio" name="payment" value={id} checked={active} onChange={() => setPaymentMethod(id)} className="sr-only" />
                          {/* Custom radio dot */}
                          <div
                            className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ borderColor: active ? 'var(--color-accent)' : 'var(--color-border)' }}
                          >
                            {active && <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />}
                          </div>
                          <Icon size={18} className={active ? 'text-foreground' : 'text-foreground-dim'} />
                          <div>
                            <p
                              className={`font-semibold checkout-body-text tracking-wide ${active ? 'text-foreground' : 'text-foreground-muted'}`}
                            >
                              {label}
                            </p>
                            {id === 'bank_transfer' && settings.bank_name && (
                              <p className="checkout-small-text text-foreground-dim mt-0.5">
                                {settings.bank_name}{settings.bank_account ? ` · ${settings.bank_account}` : ''}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </Card>

              </div>{/* end left col */}

              {/* ══ Right: Order summary ════════════════════ */}
              <div>
                <div className="checkout-card lg:sticky" style={{ top: 'calc(var(--site-header-height) + 2rem)' }}>
                  {/* Heading */}
                  <p
                    className="text-foreground font-bold uppercase mb-5"
                    style={{
                      fontFamily:    'var(--font-display)',
                      fontSize:      'clamp(1.0625rem, 2vw, 1.25rem)',
                      letterSpacing: '0.18em',
                    }}
                  >
                    Order Summary
                  </p>

                  {/* Cart items */}
                  <div className="space-y-3 max-h-56 overflow-y-auto mb-5 pr-1">
                    {items.map((item) => {
                      const price = (item.product?.sale_price || item.product?.price || 0) * item.quantity;
                      return (
                        <div key={item.id} className="flex gap-3 items-start">
                          <img
                            src={resolveMediaUrl(item.product?.thumbnail) || ''}
                            alt=""
                            className="w-14 h-14 object-cover flex-shrink-0 border border-line"
                            style={{ background: 'var(--color-bg-surface)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="checkout-body-text font-semibold text-foreground line-clamp-2 leading-snug">
                              {item.product?.name_en || item.product?.name_ar}
                            </p>
                            {(item.size || item.color) && (
                              <p className="checkout-small-text text-foreground-dim mt-0.5">
                                {[item.size && `Size: ${item.size}`, item.color && `${item.color}`].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            <p className="checkout-small-text text-foreground-dim mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className="checkout-body-text font-bold text-foreground whitespace-nowrap">
                            {formatPrice(price, SHOP_CURRENCY, 'en')}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Price rows */}
                  <div className="space-y-2.5 checkout-body-text pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div className="flex justify-between">
                      <span className="text-foreground-dim">Subtotal</span>
                      <span className="text-foreground">{formatPrice(subtotal, SHOP_CURRENCY, 'en')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Discount</span>
                        <span className="text-emerald-400">−{formatPrice(discountAmount, SHOP_CURRENCY, 'en')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-foreground-dim">Shipping</span>
                      <span className={shippingCost === 0 ? 'text-emerald-400' : 'text-foreground'}>
                        {shippingCost === 0 ? 'Free' : formatPrice(shippingCost, SHOP_CURRENCY, 'en')}
                      </span>
                    </div>
                    {taxPct > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-dim">Tax ({taxPct}%)</span>
                        <span className="text-foreground">{formatPrice(taxAmount, SHOP_CURRENCY, 'en')}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div
                      className="flex items-center justify-between pt-3 mt-1"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <span
                        className="text-foreground font-bold uppercase tracking-widest"
                        style={{ fontSize: '0.8125rem' }}
                      >
                        Total
                      </span>
                      <span
                        style={{
                          fontFamily:    'var(--font-display)',
                          fontSize:      'clamp(1.25rem, 2.5vw, 1.5rem)',
                          letterSpacing: '0.05em',
                          color:         'var(--color-accent)',
                        }}
                      >
                        {formatPrice(total, SHOP_CURRENCY, 'en')}
                      </span>
                    </div>
                  </div>

                  {/* Place Order button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.015 }}
                    whileTap={{ scale: loading ? 1 : 0.975 }}
                    className="btn-accent-solid w-full mt-6 py-3.5 flex items-center justify-center gap-2 font-bold uppercase disabled:opacity-50"
                    style={{
                      background:    loading ? 'var(--color-text-dim)' : undefined,
                      color:         'var(--color-on-accent)',
                      fontFamily:    'var(--font-display)',
                      fontSize:      'clamp(0.9375rem, 2vw, 1.0625rem)',
                      letterSpacing: '0.18em',
                      border:        'none',
                    }}
                  >
                    <Lock size={15} />
                    {loading ? 'Processing…' : 'Place Order'}
                  </motion.button>

                  <p className="flex items-center justify-center gap-1.5 checkout-small-text text-foreground-dim mt-3 tracking-wider">
                    <ShieldCheck size={11} className="text-emerald-500/70" />
                    Secured with 256-bit encryption
                  </p>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </>
  );
}
