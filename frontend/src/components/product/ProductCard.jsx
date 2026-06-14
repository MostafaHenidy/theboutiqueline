import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingBag } from 'lucide-react';
import { addToCart } from '../../store/slices/cartSlice';
import { toggleWishlist, selectIsInWishlist } from '../../store/slices/wishlistSlice';
import {
  getProductName,
  getProductImage,
  getProductCardImages,
  formatPrice,
  getDiscountPercent,
} from '../../utils/helpers';
import toast from 'react-hot-toast';

/**
 * Theboutiqueline ProductCard
 * Dark editorial style — mono typography, boutique accent, image switcher.
 */
export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { language }       = useSelector((s) => s.ui);
  const { isAuthenticated }= useSelector((s) => s.auth);
  const isInWishlist       = useSelector(selectIsInWishlist(product?.id));
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const cardMediaRef = useRef(null);
  const cardTouchRef = useRef({ x: 0, y: 0, locked: null });
  const didSwipeRef = useRef(false);

  const cardImages = useMemo(() => getProductCardImages(product), [product]);

  useEffect(() => {
    setImageIndex(0);
  }, [product?.id]);

  const stepImage = useCallback((dir) => {
    setImageIndex((i) => {
      const len = cardImages.length;
      if (len <= 1) return i;
      return (i + dir + len) % len;
    });
  }, [cardImages.length]);

  useEffect(() => {
    const el = cardMediaRef.current;
    if (!el || cardImages.length <= 1) return undefined;

    const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

    const onTouchStart = (e) => {
      if (!isMobile()) return;
      didSwipeRef.current = false;
      cardTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        locked: null,
      };
    };

    const onTouchMove = (e) => {
      if (!isMobile()) return;
      const ref = cardTouchRef.current;
      const dx = e.touches[0].clientX - ref.x;
      const dy = e.touches[0].clientY - ref.y;

      if (ref.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        ref.locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }

      if (ref.locked === 'h') {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e) => {
      if (!isMobile()) return;
      const ref = cardTouchRef.current;
      if (ref.locked !== 'h') {
        ref.locked = null;
        return;
      }

      const dx = e.changedTouches[0].clientX - ref.x;
      if (Math.abs(dx) > 40) {
        didSwipeRef.current = true;
        stepImage(dx < 0 ? 1 : -1);
      }
      ref.locked = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [cardImages.length, product?.id, stepImage]);

  if (!product) return null;

  const name      = getProductName(product, language);
  const activeImage = cardImages[imageIndex]?.url || getProductImage(product);
  const discount  = getDiscountPercent(product.price, product.sale_price);
  const isOutOfStock = product.stock === 0;
  const hasMultipleImages = cardImages.length > 1;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    setLoading(true);
    try {
      await dispatch(addToCart({ product_id: product.id, quantity: 1, product })).unwrap();
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to save items');
      return;
    }
    await dispatch(toggleWishlist({ product_id: product.id, product }));
  };

  const handleImageSwitch = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndex(index);
  };

  const handleCardClick = (e) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      didSwipeRef.current = false;
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block h-full"
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="product-card-boutique">
        {/* ── Image container ── */}
        <div className="product-card-boutique__media" ref={cardMediaRef}>

          <img
            src={activeImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out"
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
          />

          {/* Dark overlay on hover */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: hovered ? 0.2 : 0 }}
          />

          {/* ── Wishlist icon — top left ── */}
          <button
            type="button"
            onClick={handleWishlist}
            className={`product-card-boutique__wishlist-btn${isInWishlist ? ' is-saved' : ''}`}
            aria-label="Save to wishlist"
            aria-pressed={isInWishlist}
            style={
              isInWishlist
                ? undefined
                : {
                    backgroundColor: 'rgba(10, 10, 10, 0.78)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                  }
            }
          >
            <Heart
              size={14}
              strokeWidth={2}
              className="product-card-boutique__wishlist-icon"
              color="#ffffff"
            />
          </button>

          {/* ── Sale badge — top right ── */}
          {discount > 0 && (
            <span className="badge-sale-boutique absolute top-3 right-3 z-10">
              -{discount}%
            </span>
          )}

          {/* ── NEW badge ── */}
          {product.is_new_arrival && !discount && (
            <span className="product-card-media-chip absolute top-3 right-3 z-10">
              NEW
            </span>
          )}

          {/* ── Out of stock overlay ── */}
          {isOutOfStock && (
            <div className="product-card-boutique__sold-out-overlay">
              <span
                className="product-card-boutique__sold-out-label !text-white"
                style={{ color: '#ffffff' }}
              >
                OUT OF STOCK
              </span>
            </div>
          )}

          {/* ── Gallery dots (same as product detail) + card body ── */}
          <div className="product-card-boutique__info-stack">
            {hasMultipleImages && (
              <div
                className="pd-gallery__dots product-card-boutique__gallery-dots"
                role="tablist"
                aria-label={`${name} images`}
              >
                {cardImages.map((img, i) => (
                  <button
                    key={img.key}
                    type="button"
                    role="tab"
                    aria-selected={imageIndex === i}
                    aria-label={`Show image ${i + 1} of ${cardImages.length}`}
                    className={`pd-gallery__dot${imageIndex === i ? ' is-active' : ''}`}
                    onClick={(e) => handleImageSwitch(e, i)}
                  />
                ))}
              </div>
            )}

            <div className="product-card-boutique__body">
              <h3 className="product-card-boutique__title" lang={language} dir="auto">
                {name}
              </h3>

              <div className="product-card-boutique__prices">
                {product.sale_price ? (
                  <>
                    <span className="product-card-boutique__price product-card-boutique__price--sale font-mono font-bold">
                      {formatPrice(product.sale_price, 'EGP', language)}
                    </span>
                    <span className="product-card-boutique__price product-card-boutique__price--was font-mono line-through">
                      {formatPrice(product.price, 'EGP', language)}
                    </span>
                  </>
                ) : (
                  <span className="product-card-boutique__price font-mono font-bold">
                    {formatPrice(product.price, 'EGP', language)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick add — bottom slide ── */}
          <div
            className="product-card-boutique__quick-add"
            style={{ transform: hovered ? 'translateY(0)' : 'translateY(100%)' }}
          >
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || loading}
              className="w-full flex items-center justify-center gap-2 font-mono uppercase text-xs md:text-sm tracking-widest text-white py-3 transition-all duration-200 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--color-accent)',
                letterSpacing: '0.15em',
              }}
            >
              <ShoppingBag size={16} strokeWidth={1.5} />
              {loading ? '...' : 'ADD TO CART'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
