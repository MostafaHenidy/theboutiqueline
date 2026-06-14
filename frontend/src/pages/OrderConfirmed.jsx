import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Package, ArrowRight, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { formatPrice, formatDate, resolveMediaUrl } from '../utils/helpers';

function parseStoredAddress(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : {}; }
    catch { return {}; }
  }
  return {};
}

/* ── Card ────────────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {children}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────── */
function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 mb-5 text-foreground font-bold text-sm uppercase tracking-widest">
      {Icon && <Icon size={15} className="text-boutique" />}
      {children}
    </h3>
  );
}

/* ── Row in summary ──────────────────────────────────────── */
function SummaryRow({ label, value, highlight, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className={accent ? 'text-boutique' : highlight ? 'text-green-500' : 'text-foreground'}>{value}</span>
    </div>
  );
}

export default function OrderConfirmed() {
  const { orderNumber: orderNumberParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const { isAuthenticated } = useSelector((s) => s.auth);

  const state = location.state || {};
  const { orderId, guestEmail, isGuest: stateIsGuest, preview } = state;
  const isGuest = Boolean(stateIsGuest ?? !isAuthenticated);
  const ar = language === 'ar';
  const paymobStatus = new URLSearchParams(location.search).get('paymob');

  const orderNumber = orderNumberParam ? decodeURIComponent(orderNumberParam) : '';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) { navigate('/', { replace: true }); return; }
    let cancelled = false;

    async function load() {
      try {
        let resolvedOrderId = orderId;
        if (!resolvedOrderId && orderNumber) {
          try { resolvedOrderId = sessionStorage.getItem(`order_id_${orderNumber}`); } catch (_) { /* noop */ }
        }
        if (isAuthenticated && resolvedOrderId) {
          const { data } = await api.get(`/orders/${resolvedOrderId}`);
          if (!cancelled) setOrder(data.data);
          return;
        }
        let email = guestEmail;
        try { if (!email) email = sessionStorage.getItem(`guest_order_${orderNumber}`); } catch (_) { /* noop */ }
        if (email) {
          const { data } = await api.get(`/orders/guest/summary/${encodeURIComponent(orderNumber)}`, { params: { email: email.trim() } });
          if (!cancelled) setOrder(data.data);
          return;
        }
        if (preview?.items?.length) { if (!cancelled) setOrder(null); return; }
        navigate('/', { replace: true });
      } catch {
        if (!cancelled && preview?.items?.length) setOrder(null);
        else if (!cancelled) navigate('/', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orderNumber, orderId, guestEmail, isAuthenticated, navigate, preview, location.search]);

  const resolved = useMemo(() => {
    if (order) return order;
    const sa = preview?.shipping_address || {};
    const lineSubtotal = (preview?.items || []).reduce((sum, li) => sum + Number(li.total_price ?? 0), 0);
    return orderNumber && preview?.items?.length
      ? {
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          payment_method: preview.payment_method,
          total: preview.total,
          subtotal: preview.subtotal ?? lineSubtotal,
          discount_amount: preview.discount_amount ?? 0,
          shipping_cost: preview.shipping_cost ?? null,
          tax_amount: preview.tax_amount ?? null,
          created_at: new Date().toISOString(),
          guest_name: preview.guest_name,
          guest_email: preview.guest_email,
          shipping_address: sa,
          billing_address: sa,
          items: preview.items.map((li, idx) => ({
            id: li.id ?? `prev-${idx}`,
            name_ar: li.name_ar, name_en: li.name_en,
            image: li.thumbnail,
            quantity: li.quantity, size: li.size, color: li.color,
            total_price: li.total_price,
          })),
        }
      : null;
  }, [order, preview, orderNumber]);

  const shipAd = resolved ? parseStoredAddress(resolved.shipping_address) : {};

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-top-margin" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <div className="container-custom py-16 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-[#eb301e] border-t-transparent animate-spin" />
          <p className="text-foreground-dim text-sm tracking-wider uppercase">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!resolved) return null;

  /* ── Main ──────────────────────────────────────────────────── */
  return (
    <>
      <Helmet>
        <title>{`${ar ? `تم تأكيد الطلب #${resolved.order_number}` : `Order Confirmed #${resolved.order_number}`} | ${t('brand')}`}</title>
      </Helmet>

      <div className="page-top-margin" style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

        {paymobStatus && paymobStatus !== 'return' && (
          <div className={`container-custom pt-6 ${paymobStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium text-center"
              style={{
                background: paymobStatus === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${paymobStatus === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
              }}
            >
              {paymobStatus === 'success'
                ? (ar ? 'تم الدفع بنجاح عبر Paymob' : 'Payment completed successfully via Paymob')
                : paymobStatus === 'invalid'
                  ? (ar ? 'تعذّر التحقق من الدفع — تواصل مع الدعم إن تم الخصم' : 'Payment verification failed — contact support if you were charged')
                  : (ar ? 'فشل الدفع عبر Paymob — يمكنك المحاولة مرة أخرى' : 'Paymob payment failed — you can try again')}
            </div>
          </div>
        )}

        {/* ── Hero confirmation banner ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-14 text-center bg-surface-elevated border-b border-line dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:via-[#1a0a08] dark:to-[#0f0f0f] dark:border-boutique/30"
        >
          {/* Check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ background: 'rgba(235,48,30,0.15)', border: '2px solid rgba(235,48,30,0.4)' }}
          >
            <CheckCircle size={38} className="text-boutique" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45 }}
            className="text-foreground mb-3 px-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 7vw, 3.2rem)',
              letterSpacing: '0.08em',
            }}
          >
            {ar ? 'شكراً لك! تم تأكيد طلبك' : 'Thank You! Order Confirmed'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-foreground-muted text-sm mb-1"
          >
            {ar ? 'رقم الطلب:' : 'Order number:'}
            {' '}
            <span className="font-bold tracking-wider text-foreground" dir="ltr">
              #{resolved.order_number}
            </span>
          </motion.p>

          {resolved.created_at && (
            <p className="text-foreground-dim text-xs">{formatDate(resolved.created_at, language)}</p>
          )}

          {!isGuest && orderId ? (
            <Link
              to={`/orders/${orderId}`}
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold uppercase tracking-wider text-boutique transition-opacity hover:opacity-70"
            >
              <Package size={15} />
              {ar ? 'تفاصيل الطلب في حسابك' : 'View order in account'}
              <ArrowRight size={13} className={ar ? 'rotate-180' : ''} />
            </Link>
          ) : (
            <p className="text-foreground-dim text-xs mt-5 max-w-xs mx-auto leading-relaxed">
              {ar
                ? 'سنرسل تحديثات الطلب عبر الواتساب عند تغيير الحالة.'
                : 'Order updates will be sent to the WhatsApp number you provided.'}
            </p>
          )}
        </motion.div>

        {/* ── Content ───────────────────────────────────── */}
        <div className="container-custom py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column ───────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Items */}
              <Card>
                <SectionTitle icon={ShoppingBag}>{ar ? 'المنتجات' : 'Items'}</SectionTitle>
                <div className="space-y-4">
                  {(resolved.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 last:pb-0 last:border-0 border-b border-line"
                    >
                      <img
                        src={resolveMediaUrl(item.image) || ''}
                        alt=""
                        className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-surface-elevated"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-snug">
                          {item.name_en || item.name_ar}
                        </p>
                        {(item.size || item.color) && (
                          <p className="text-foreground-dim text-xs mt-1">
                            {item.size && `${t('size')}: ${item.size}`}
                            {item.size && item.color && ' · '}
                            {item.color && `${t('color')}: ${item.color}`}
                          </p>
                        )}
                        <p className="text-foreground-dim text-xs mt-1">{t('quantity')}: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-foreground text-sm whitespace-nowrap">
                        {formatPrice(item.total_price, 'EGP', language)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Customer info (guest) */}
              {(resolved.guest_name || resolved.guest_email) && (
                <Card>
                  <SectionTitle>{ar ? 'بيانات العميل' : 'Customer'}</SectionTitle>
                  {resolved.guest_name && (
                    <p className="text-sm font-semibold text-foreground">{resolved.guest_name}</p>
                  )}
                  {resolved.guest_email && (
                    <p className="text-sm text-foreground-dim mt-1" dir="ltr">{resolved.guest_email}</p>
                  )}
                </Card>
              )}

              {/* Shipping address */}
              {shipAd?.full_name && (
                <Card>
                  <SectionTitle icon={MapPin}>{t('shipping_address')}</SectionTitle>
                  <div className="text-sm text-foreground-muted space-y-1.5">
                    <p className="font-semibold text-foreground">{shipAd.full_name}</p>
                    {[shipAd.city, shipAd.district].filter(Boolean).join(', ') && (
                      <p>{[shipAd.city, shipAd.district].filter(Boolean).join(', ')}</p>
                    )}
                    {shipAd.street && <p>{shipAd.street}</p>}
                    {shipAd.phone && (
                      <p dir="ltr" className="font-medium text-foreground">{shipAd.phone}</p>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* ── Right: Order summary ──────────────────── */}
            <div>
              <div
                className="rounded-2xl p-6 lg:sticky lg:top-32"
                style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
              >
                <h3
                  className="text-foreground font-bold uppercase tracking-widest text-sm mb-5"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
                >
                  {ar ? 'ملخص الطلب' : 'Order Summary'}
                </h3>

                <div className="space-y-3">
                  {/* Payment */}
                  <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <CreditCard size={14} className="text-foreground-dim flex-shrink-0" />
                    <span className="text-xs text-foreground-dim">{t('payment_method')}:</span>
                    <span className="text-xs font-semibold text-foreground capitalize">{t(resolved.payment_method)}</span>
                  </div>

                  {resolved.subtotal != null && (
                    <SummaryRow label={t('subtotal')} value={formatPrice(resolved.subtotal, 'EGP', language)} />
                  )}
                  {Number(resolved.discount_amount || 0) > 0 && (
                    <SummaryRow label={t('discount')} value={`-${formatPrice(resolved.discount_amount, 'EGP', language)}`} highlight />
                  )}
                  {resolved.shipping_cost != null && (
                    <SummaryRow
                      label={t('shipping')}
                      value={Number(resolved.shipping_cost) === 0 ? (ar ? 'مجاناً' : 'Free') : formatPrice(resolved.shipping_cost, 'EGP', language)}
                      highlight={Number(resolved.shipping_cost) === 0}
                    />
                  )}
                  {resolved.tax_amount != null && (
                    <SummaryRow label={t('tax')} value={formatPrice(resolved.tax_amount, 'EGP', language)} />
                  )}

                  {/* Total */}
                  <div
                    className="flex justify-between font-bold pt-4 mt-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span className="text-foreground text-xs uppercase tracking-widest">{t('total')}</span>
                    <span
                      className="text-boutique"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.35rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {formatPrice(resolved.total, 'EGP', language)}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  to="/products"
                  className="btn-outline-boutique w-full mt-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
                >
                  <ShoppingBag size={15} />
                  {ar ? 'متابعة التسوق' : 'Continue Shopping'}
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
