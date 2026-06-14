import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Package, ChevronRight } from 'lucide-react';
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

export default function Orders() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then(({ data }) => setOrders(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pageTitle = t('orders').toUpperCase();

  return (
    <>
      <Helmet><title>{`${t('orders')} | ${t('brand')}`}</title></Helmet>
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <nav className="flex items-center gap-2 mb-3">
              <Link
                to="/dashboard"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                {language === 'ar' ? 'حسابي' : 'Account'}
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {pageTitle}
              </span>
            </nav>
            <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
          </div>
        </div>

        <div className="container-custom py-10">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-28" style={{ backgroundColor: 'var(--color-bg-card)' }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <Package size={64} strokeWidth={1} className="mx-auto text-foreground-dim mb-5 opacity-40" />
              <p className="font-mono text-foreground-muted uppercase text-sm tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {language === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}
              </p>
              <Link to="/products" className="btn-accent-solid inline-flex mt-6 px-8 py-3 text-[11px]">
                {language === 'ar' ? 'ابدأ التسوق' : 'Start Shopping'}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="account-card"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-mono font-bold text-foreground uppercase text-sm tracking-wide">
                        {t('order_number')}{order.order_number}
                      </p>
                      <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                        {formatDate(order.created_at, language)}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span
                          className="font-mono uppercase text-[9px] tracking-widest px-2.5 py-1 border"
                          style={{
                            letterSpacing: '0.12em',
                            borderColor: 'var(--color-accent)',
                            color: 'var(--color-accent)',
                            backgroundColor: 'var(--color-accent-dim)',
                          }}
                        >
                          {language === 'ar' ? STATUS_AR[order.status] : t(order.status)}
                        </span>
                        <span className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>
                          {order.items?.length} {language === 'ar' ? 'منتجات' : 'items'}
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="font-mono font-bold text-[var(--color-accent)] text-xl">
                        {formatPrice(order.total, 'EGP', language)}
                      </p>
                      <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                        {language === 'ar'
                          ? `طريقة الدفع: ${order.payment_method === 'cod' ? 'عند الاستلام' : order.payment_method === 'stripe' ? 'بطاقة ائتمانية' : 'تحويل بنكي'}`
                          : `Payment: ${order.payment_method}`}
                      </p>
                    </div>
                  </div>

                  {order.items?.length > 0 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar">
                      {order.items.slice(0, 4).map((item) => (
                        <img
                          key={item.id}
                          src={resolveMediaUrl(item.image) || 'https://via.placeholder.com/60'}
                          alt={item.name_en || item.name_ar}
                          className="w-14 h-14 object-cover flex-shrink-0 border border-line"
                        />
                      ))}
                      {order.items.length > 4 && (
                        <div
                          className="w-14 h-14 flex items-center justify-center flex-shrink-0 border border-line font-mono font-bold text-foreground-muted text-xs"
                          style={{ backgroundColor: 'var(--color-bg-surface)' }}
                        >
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Link
                      to={`/orders/${order.id}`}
                      className="flex items-center gap-1 font-mono uppercase text-[10px] tracking-widest text-foreground-muted hover:text-[var(--color-accent)] transition-colors"
                      style={{ letterSpacing: '0.12em' }}
                    >
                      {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      <ChevronRight size={14} className="rtl:rotate-180" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
