import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { closeCartDrawer } from '../../store/slices/uiSlice';
import { updateCartItem, removeFromCart, selectCartTotal } from '../../store/slices/cartSlice';
import { getProductName, getProductImage, formatPrice } from '../../utils/helpers';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export default function CartDrawer() {
  const dispatch = useDispatch();
  const { cartDrawerOpen } = useSelector((s) => s.ui);
  const { language }       = useSelector((s) => s.ui);
  const { items }          = useSelector((s) => s.cart);
  const total              = useSelector(selectCartTotal);

  const mono = { fontFamily: 'var(--font-mono)' };

  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobileViewport(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useBodyScrollLock(cartDrawerOpen && isMobileViewport);

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closeCartDrawer())}
            className="fixed inset-0 bg-black/70 z-50 touch-none overscroll-none"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] z-50 flex flex-col bg-surface-elevated border-l border-line"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-line">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} strokeWidth={1.5} className="text-foreground-muted" />
                <span style={{ ...mono, color: 'var(--color-text)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                  YOUR BAG
                </span>
                {items.length > 0 && (
                  <span
                    style={{
                      ...mono,
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      padding: '2px 7px',
                    }}
                  >
                    {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => dispatch(closeCartDrawer())}
                className="text-foreground-dim hover:text-foreground transition-colors p-1"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                  <ShoppingBag size={48} strokeWidth={1} className="text-foreground-dim mb-5 opacity-40" />
                  <p style={{ ...mono, color: 'var(--color-text-dim)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    YOUR BAG IS EMPTY
                  </p>
                  <button
                    onClick={() => dispatch(closeCartDrawer())}
                    className="mt-6 border border-line text-foreground-muted hover:text-foreground hover:border-foreground/30 transition-colors px-6 py-2"
                    style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              ) : (
                <div className="px-6 space-y-0">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-4 py-5 border-b border-line"
                    >
                      {/* Image */}
                      <div className="w-16 h-20 flex-shrink-0 overflow-hidden bg-surface-card">
                        <img
                          src={getProductImage(item.product)}
                          alt={getProductName(item.product, language)}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-bold line-clamp-2 mb-1" style={{ ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {getProductName(item.product, language)}
                        </p>
                        {(item.size || item.color) && (
                          <p className="mb-1 text-foreground-dim" style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {item.size && `SIZE: ${item.size}`}
                            {item.size && item.color && '  ·  '}
                            {item.color && `COLOR: ${item.color}`}
                          </p>
                        )}
                        <p className="font-bold mb-3 text-[var(--color-accent)]" style={{ ...mono, fontSize: 12 }}>
                          {formatPrice(item.product?.sale_price || item.product?.price, 'EGP', language)}
                        </p>

                        {/* Qty + delete */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-line">
                            <button
                              onClick={() => dispatch(updateCartItem({ id: item.id, quantity: item.quantity - 1 }))}
                              className="w-8 h-8 flex items-center justify-center text-foreground-dim hover:text-foreground transition-colors border-r border-line"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-8 text-center text-foreground" style={{ ...mono, fontSize: 11, fontWeight: 700 }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => dispatch(updateCartItem({ id: item.id, quantity: item.quantity + 1 }))}
                              className="w-8 h-8 flex items-center justify-center text-foreground-dim hover:text-foreground transition-colors border-l border-line"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                          <button
                            onClick={() => dispatch(removeFromCart(item.id))}
                            className="text-foreground-dim hover:text-foreground-muted transition-colors p-1"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 space-y-3 border-t border-line">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-foreground-dim" style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    SUBTOTAL
                  </span>
                  <span className="text-foreground" style={{ ...mono, fontSize: 14, fontWeight: 700 }}>
                    {formatPrice(total, 'EGP', language)}
                  </span>
                </div>

                <Link to="/checkout" onClick={() => dispatch(closeCartDrawer())} className="block">
                  <button
                    className="btn-accent-solid w-full py-4 text-sm hover:opacity-85"
                    style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}
                  >
                    CHECKOUT ↗
                  </button>
                </Link>

                <Link to="/cart" onClick={() => dispatch(closeCartDrawer())} className="block">
                  <button
                    className="w-full py-3 text-foreground-muted hover:text-foreground border border-line hover:border-foreground/30 transition-colors"
                    style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}
                  >
                    VIEW FULL CART
                  </button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
