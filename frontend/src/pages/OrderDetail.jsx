import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { Package, CheckCircle, Clock, ShoppingBag, MapPin, CreditCard, Truck } from 'lucide-react';
import api from '../utils/api';
import { formatPrice, formatDate, resolveMediaUrl } from '../utils/helpers';

const STATUS_AR = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

function parseStoredAddr(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`p-6 ${className}`}
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 mb-5 font-mono font-bold text-foreground uppercase text-[10px] tracking-widest" style={{ letterSpacing: '0.12em' }}>
      {Icon && <Icon size={14} className="text-boutique" />}
      {children}
    </h3>
  );
}

function SummaryRow({ label, value, highlight, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>{label}</span>
      <span className={`font-mono font-medium ${accent ? 'text-boutique' : highlight ? 'text-emerald-400' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="container-custom py-10 space-y-4">
          <div className="skeleton h-24" style={{ backgroundColor: 'var(--color-bg-card)' }} />
          <div className="skeleton h-48" style={{ backgroundColor: 'var(--color-bg-card)' }} />
          <div className="skeleton h-64" style={{ backgroundColor: 'var(--color-bg-card)' }} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="container-custom py-20 text-center">
          <Package size={64} strokeWidth={1} className="mx-auto text-foreground-dim mb-5 opacity-40" />
          <p className="font-mono text-foreground-muted uppercase text-sm tracking-widest" style={{ letterSpacing: '0.12em' }}>
            {ar ? 'الطلب غير موجود' : 'Order not found'}
          </p>
          <Link to="/orders" className="btn-accent-solid inline-flex mt-6 px-8 py-3 text-[11px]">
            {ar ? 'العودة للطلبات' : 'Back to Orders'}
          </Link>
        </div>
      </div>
    );
  }

  const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const currentStep = steps.indexOf(order.status);
  const pageTitle = ar ? `طلب #${order.order_number}` : `ORDER #${order.order_number}`;

  return (
    <>
      <Helmet><title>{`${pageTitle} | ${t('brand')}`}</title></Helmet>
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <nav className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                to="/dashboard"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                {ar ? 'حسابي' : 'Account'}
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <Link
                to="/orders"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                {t('orders').toUpperCase()}
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                #{order.order_number}
              </span>
            </nav>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
                <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-2" style={{ letterSpacing: '0.1em' }}>
                  {formatDate(order.created_at, language)}
                </p>
              </div>
              <span
                className="font-mono uppercase text-[9px] tracking-widest px-2.5 py-1 border flex-shrink-0"
                style={{
                  letterSpacing: '0.12em',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                  backgroundColor: 'var(--color-accent-dim)',
                }}
              >
                {ar ? STATUS_AR[order.status] : t(order.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="container-custom py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {order.status !== 'cancelled' && (
                <Card>
                  <SectionTitle icon={Truck}>{ar ? 'حالة الطلب' : 'Order Status'}</SectionTitle>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-5 start-0 end-0 h-px z-0" style={{ backgroundColor: 'var(--color-border)' }} />
                    <div
                      className="absolute top-5 start-0 h-px z-0 transition-all duration-500"
                      style={{
                        width: `${currentStep >= 0 ? (currentStep / (steps.length - 1)) * 100 : 0}%`,
                        backgroundColor: 'var(--color-accent)',
                      }}
                    />
                    {steps.map((step, i) => (
                      <div key={step} className="flex flex-col items-center relative z-10">
                        <div
                          className="w-10 h-10 flex items-center justify-center border-2 transition-all"
                          style={{
                            backgroundColor: i <= currentStep ? 'var(--color-accent)' : 'var(--color-bg-card)',
                            borderColor: i <= currentStep ? 'var(--color-accent)' : 'var(--color-border)',
                            color: i <= currentStep ? 'var(--color-on-accent)' : 'var(--color-foreground-dim)',
                          }}
                        >
                          {i < currentStep ? <CheckCircle size={18} /> : i === currentStep ? <Clock size={18} /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                        </div>
                        <p
                          className="font-mono text-[8px] mt-2 uppercase tracking-widest text-center max-w-[4.5rem]"
                          style={{
                            letterSpacing: '0.08em',
                            color: i <= currentStep ? 'var(--color-accent)' : 'var(--color-foreground-dim)',
                          }}
                        >
                          {ar ? STATUS_AR[step] : t(step)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {order.tracking_number && (
                    <div
                      className="mt-5 px-4 py-3 text-sm"
                      style={{
                        backgroundColor: 'var(--color-accent-dim)',
                        border: '1px solid var(--color-accent)',
                      }}
                    >
                      <span className="font-mono font-bold text-boutique uppercase text-[10px] tracking-widest" style={{ letterSpacing: '0.1em' }}>
                        {ar ? 'رقم الشحن: ' : 'Tracking: '}
                      </span>
                      <span className="font-mono text-foreground" dir="ltr">{order.tracking_number}</span>
                    </div>
                  )}
                </Card>
              )}

              <Card>
                <SectionTitle icon={ShoppingBag}>{ar ? 'المنتجات' : 'Items'}</SectionTitle>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 last:pb-0 last:border-0 border-b border-line">
                      <img
                        src={resolveMediaUrl(item.image) || 'https://via.placeholder.com/80'}
                        alt={item.name_en || item.name_ar}
                        className="w-20 h-20 object-cover flex-shrink-0 border border-line"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-foreground text-sm uppercase tracking-wide">
                          {item.name_en || item.name_ar}
                        </p>
                        {(item.size || item.color) && (
                          <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                            {item.size && `${t('size')}: ${item.size}`}
                            {item.size && item.color && ' · '}
                            {item.color && `${t('color')}: ${item.color}`}
                          </p>
                        )}
                        <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                          {t('quantity')}: {item.quantity}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-foreground whitespace-nowrap">
                        {formatPrice(item.total_price, 'EGP', language)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: t('shipping_address'), addr: parseStoredAddr(order.shipping_address) },
                  { title: t('billing_address'), addr: parseStoredAddr(order.billing_address) },
                ].map(({ title, addr }) => (
                  <Card key={title}>
                    <SectionTitle icon={MapPin}>{title}</SectionTitle>
                    {addr?.full_name ? (
                      <div className="font-mono text-sm text-foreground-muted space-y-1.5">
                        <p className="font-bold text-foreground uppercase text-xs tracking-wide">{addr.full_name}</p>
                        {[addr.city, addr.district].filter(Boolean).length > 0 && (
                          <p className="text-[11px]">{[addr.city, addr.district].filter(Boolean).join(', ')}</p>
                        )}
                        {addr.street && <p className="text-[11px]">{addr.street}</p>}
                        {addr.phone && <p className="text-[11px] text-foreground" dir="ltr">{addr.phone}</p>}
                      </div>
                    ) : (
                      <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>
                        {ar ? 'غير متوفر' : 'Not available'}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div
                className="p-6 lg:sticky lg:top-32"
                style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
              >
                <h3
                  className="text-foreground font-bold uppercase tracking-widest text-sm mb-5"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
                >
                  {ar ? 'ملخص الطلب' : 'Order Summary'}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <CreditCard size={14} className="text-foreground-dim flex-shrink-0" />
                    <span className="font-mono text-[10px] text-foreground-dim uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>{t('payment_method')}:</span>
                    <span className="font-mono text-[10px] font-bold text-foreground uppercase tracking-widest capitalize" style={{ letterSpacing: '0.1em' }}>
                      {t(order.payment_method)}
                    </span>
                  </div>

                  <SummaryRow label={t('subtotal')} value={formatPrice(order.subtotal, 'EGP', language)} />
                  {Number(order.discount_amount) > 0 && (
                    <SummaryRow label={t('discount')} value={`-${formatPrice(order.discount_amount, 'EGP', language)}`} highlight />
                  )}
                  <SummaryRow
                    label={t('shipping')}
                    value={order.shipping_cost === 0 ? t('free') : formatPrice(order.shipping_cost, 'EGP', language)}
                    highlight={order.shipping_cost === 0}
                  />
                  <SummaryRow label={t('tax')} value={formatPrice(order.tax_amount, 'EGP', language)} />

                  <div
                    className="flex justify-between font-bold pt-4 mt-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span className="font-mono text-foreground text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>{t('total')}</span>
                    <span
                      className="text-boutique"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', letterSpacing: '0.05em' }}
                    >
                      {formatPrice(order.total, 'EGP', language)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="font-mono text-[10px] text-foreground-dim uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>
                    {ar ? 'حالة الدفع' : 'Payment Status'}
                  </p>
                  <p
                    className="font-mono font-bold text-[10px] uppercase tracking-widest mt-1"
                    style={{
                      letterSpacing: '0.12em',
                      color: order.payment_status === 'paid' ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                    }}
                  >
                    {order.payment_status === 'paid' ? (ar ? 'تم الدفع' : 'Paid') : (ar ? 'معلق' : 'Pending')}
                  </p>
                </div>

                <Link
                  to="/orders"
                  className="btn-outline-boutique w-full mt-6 py-4 flex items-center justify-center gap-2 font-bold text-[11px]"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
                >
                  <Package size={15} />
                  {ar ? 'العودة للطلبات' : 'Back to Orders'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
