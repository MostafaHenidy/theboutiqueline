import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Trash2, Plus, Minus, Tag, Truck } from 'lucide-react';
import { updateCartItem, removeFromCart, clearCart, setCoupon, selectCartTotal } from '../store/slices/cartSlice';
import { getProductName, getProductImage, formatPrice, SHOP_CURRENCY, parsePercentSetting } from '../utils/helpers';
import api from '../utils/api';
import toast from 'react-hot-toast';

function SummaryRow({ label, value, highlight, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>{label}</span>
      <span className={`font-mono font-medium ${accent ? 'text-boutique' : highlight ? 'text-emerald-400' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function Cart() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const { items, coupon } = useSelector((s) => s.cart);
  const subtotal = useSelector(selectCartTotal);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [shopSettings, setShopSettings] = useState({});

  useEffect(() => {
    api.get('/shop/settings').then((r) => setShopSettings(r.data?.data || {})).catch(() => {});
  }, []);

  const freeShipThreshold = Math.max(0, Number(shopSettings.free_shipping_threshold) || 5000);
  const baseShipping = Math.max(0, Number(shopSettings.shipping_cost) || 50);
  const taxPct = parsePercentSetting(shopSettings.tax_rate, 15);
  const shippingCost = subtotal >= freeShipThreshold ? 0 : baseShipping;
  const discountAmount = coupon?.discount || 0;
  const taxableAmount = subtotal - discountAmount + shippingCost;
  const taxAmount = taxableAmount * (taxPct / 100);
  const total = taxableAmount + taxAmount;
  const pageTitle = t('cart').toUpperCase();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/cart/coupon', { code: couponCode, subtotal });
      dispatch(setCoupon(data.data));
      toast.success(ar ? `تم تطبيق الكوبون! خصم ${data.data.discount} ج.م` : `Coupon applied! ${data.data.discount} EGP off`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    }
    setCouponLoading(false);
  };

  if (items.length === 0) {
    return (
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Helmet><title>{`${t('cart')} | ${t('brand')}`}</title></Helmet>
        <div className="container-custom py-20 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <ShoppingBag size={64} strokeWidth={1} className="mx-auto text-foreground-dim mb-5 opacity-40" />
            <p className="font-mono text-foreground-muted uppercase text-sm tracking-widest mb-2" style={{ letterSpacing: '0.12em' }}>
              {t('empty_cart')}
            </p>
            <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mb-8" style={{ letterSpacing: '0.1em' }}>
              {ar ? 'أضف منتجات لسلتك وابدأ التسوق' : 'Add products to your cart and start shopping'}
            </p>
            <Link to="/products" className="btn-accent-solid inline-flex px-8 py-3 text-[11px]">
              {t('continue_shopping')}
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{`${t('cart')} | ${t('brand')}`}</title></Helmet>
      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <nav className="flex items-center gap-2 mb-3">
              <Link
                to="/"
                className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                {ar ? 'الرئيسية' : 'Home'}
              </Link>
              <span className="text-foreground-dim text-[10px]">/</span>
              <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {pageTitle}
              </span>
            </nav>
            <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{pageTitle}</h1>
            <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
              {items.length} {ar ? 'منتجات' : 'items'}
            </p>
          </div>
        </div>

        <div className="container-custom py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="account-card flex gap-5"
                >
                  <Link to={`/products/${item.product?.slug}`}>
                    <img
                      src={getProductImage(item.product)}
                      alt={getProductName(item.product, language)}
                      className="w-24 h-28 object-cover flex-shrink-0 border border-line"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/products/${item.product?.slug}`}>
                        <h3 className="font-mono font-bold text-foreground uppercase text-sm tracking-wide hover:text-boutique transition-colors line-clamp-2">
                          {getProductName(item.product, language)}
                        </h3>
                      </Link>
                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCart(item.id))}
                        className="p-1.5 text-foreground-dim hover:text-boutique transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {(item.size || item.color) && (
                      <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                        {item.size && <span className="me-2">{t('size')}: {item.size}</span>}
                        {item.color && <span>{t('color')}: {item.color}</span>}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                      <div className="flex items-center border border-line overflow-hidden">
                        <button
                          type="button"
                          onClick={() => dispatch(updateCartItem({ id: item.id, quantity: item.quantity - 1 }))}
                          className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-4 py-2 font-mono font-bold text-foreground text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => dispatch(updateCartItem({ id: item.id, quantity: item.quantity + 1 }))}
                          className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="text-end">
                        {item.product?.sale_price && (
                          <p className="font-mono text-foreground-dim text-xs line-through">
                            {formatPrice(item.product.price * item.quantity, SHOP_CURRENCY, language)}
                          </p>
                        )}
                        <p className="font-mono font-bold text-boutique text-lg">
                          {formatPrice((item.product?.sale_price || item.product?.price || 0) * item.quantity, SHOP_CURRENCY, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              <button
                type="button"
                onClick={() => dispatch(clearCart())}
                className="font-mono text-foreground-dim hover:text-boutique text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors"
                style={{ letterSpacing: '0.12em' }}
              >
                <Trash2 size={14} /> {ar ? 'تفريغ السلة' : 'Clear Cart'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="account-card">
                <h3 className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2" style={{ letterSpacing: '0.12em' }}>
                  <Tag size={14} className="text-boutique" /> {t('coupon')}
                </h3>
                {coupon ? (
                  <div
                    className="flex items-center justify-between p-3"
                    style={{ backgroundColor: 'var(--color-accent-dim)', border: '1px solid var(--color-accent)' }}
                  >
                    <div>
                      <p className="font-mono font-bold text-boutique uppercase text-xs tracking-widest">{coupon.code}</p>
                      <p className="font-mono text-foreground text-sm">-{formatPrice(coupon.discount, SHOP_CURRENCY, language)}</p>
                    </div>
                    <button type="button" onClick={() => dispatch(setCoupon(null))} className="text-foreground-dim hover:text-boutique transition-colors">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={ar ? 'كود الخصم' : 'Coupon code'}
                      className="input-boutique flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="btn-accent-solid px-4 py-3 text-[10px] whitespace-nowrap disabled:opacity-50"
                    >
                      {couponLoading ? '...' : t('apply')}
                    </button>
                  </div>
                )}
              </div>

              <div className="account-card">
                <h3 className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2" style={{ letterSpacing: '0.12em' }}>
                  <Truck size={14} className="text-boutique" /> {t('shipping')}
                </h3>
                <div
                  className="flex items-center justify-between p-3"
                  style={{
                    border: `1px solid ${shippingCost === 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: shippingCost === 0 ? 'var(--color-accent-dim)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="font-mono font-bold text-foreground uppercase text-[10px] tracking-widest" style={{ letterSpacing: '0.1em' }}>
                      {shippingCost === 0 ? t('free_shipping') : ar ? 'شحن عادي' : 'Standard Shipping'}
                    </p>
                    <p className="font-mono text-foreground-dim text-[9px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.1em' }}>
                      {ar ? '3-5 أيام عمل' : '3-5 business days'}
                    </p>
                  </div>
                  <span className={`font-mono font-bold ${shippingCost === 0 ? 'text-boutique' : 'text-foreground'}`}>
                    {shippingCost === 0 ? t('free') : formatPrice(shippingCost, SHOP_CURRENCY, language)}
                  </span>
                </div>
                {shippingCost > 0 && (
                  <p className="font-mono text-foreground-dim text-[9px] uppercase tracking-widest mt-2 text-center" style={{ letterSpacing: '0.08em' }}>
                    {ar
                      ? `أضف ${formatPrice(5000 - subtotal, 'EGP', language)} للحصول على توصيل مجاني داخل القاهرة`
                      : `Add ${formatPrice(5000 - subtotal, 'EGP', language)} more for free Cairo delivery`}
                  </p>
                )}
              </div>

              <div className="account-card">
                <h3
                  className="text-foreground font-bold uppercase tracking-widest text-sm mb-5"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
                >
                  {ar ? 'ملخص الطلب' : 'Order Summary'}
                </h3>
                <div className="space-y-3">
                  <SummaryRow label={t('subtotal')} value={formatPrice(subtotal, SHOP_CURRENCY, language)} />
                  {discountAmount > 0 && (
                    <SummaryRow label={t('discount')} value={`-${formatPrice(discountAmount, SHOP_CURRENCY, language)}`} highlight />
                  )}
                  <SummaryRow
                    label={t('shipping')}
                    value={shippingCost === 0 ? t('free') : formatPrice(shippingCost, SHOP_CURRENCY, language)}
                    highlight={shippingCost === 0}
                  />
                  {taxPct > 0 && (
                    <SummaryRow label={t('tax')} value={formatPrice(taxAmount, SHOP_CURRENCY, language)} />
                  )}
                  <div
                    className="flex justify-between font-bold pt-4 mt-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span className="font-mono text-foreground text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>{t('total')}</span>
                    <span className="text-boutique" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', letterSpacing: '0.05em' }}>
                      {formatPrice(total, SHOP_CURRENCY, language)}
                    </span>
                  </div>
                </div>
                <Link to="/checkout">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-accent-solid w-full py-4 text-[11px] mt-5"
                  >
                    {t('checkout')}
                  </motion.button>
                </Link>
                <Link
                  to="/products"
                  className="block text-center font-mono text-foreground-dim hover:text-boutique text-[10px] uppercase tracking-widest mt-3 transition-colors"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {t('continue_shopping')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
