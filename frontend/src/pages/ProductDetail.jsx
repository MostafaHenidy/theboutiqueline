import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Heart, Minus, Plus, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { addToCart } from '../store/slices/cartSlice';
import { toggleWishlist, selectIsInWishlist } from '../store/slices/wishlistSlice';
import ProductCard from '../components/product/ProductCard';
import ProductDescriptionContent from '../components/product/ProductDescriptionContent';
import api from '../utils/api';
import { getProductName, formatPrice, getDiscountPercent, resolveMediaUrl, parseJsonStringArray } from '../utils/helpers';
import { getVariantStock, findMatchingVariant } from '../utils/productVariants';
import toast from 'react-hot-toast';

const RECENTLY_VIEWED_KEY = 'tbl_recently_viewed';

function Stars({ n = 5, fill = 0 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ color: i < fill ? 'var(--color-accent)' : 'var(--color-border)', fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

function saveRecentlyViewed(product) {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    const entry = {
      id: product.id,
      slug: product.slug,
      name_en: product.name_en,
      name_ar: product.name_ar,
      thumbnail: product.thumbnail,
      price: product.price,
      sale_price: product.sale_price,
      images: product.images,
    };
    const updated = [entry, ...stored.filter((p) => p.id !== product.id)].slice(0, 8);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    return updated.filter((p) => p.id !== product.id);
  } catch {
    return [];
  }
}

export default function ProductDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { language }        = useSelector((s) => s.ui);
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [product,       setProduct]       = useState(null);
  const [related,       setRelated]       = useState([]);
  const [recentlyViewed,setRecentlyViewed]= useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedSize,  setSelectedSize]  = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity,      setQuantity]      = useState(1);
  const [cartLoading,   setCartLoading]   = useState(false);
  const [reviewText,    setReviewText]    = useState('');
  const [reviewRating,  setReviewRating]  = useState(5);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [galleryIndex,  setGalleryIndex]  = useState(0);
  const galleryCarouselRef = useRef(null);
  const galleryTouchRef = useRef({ x: 0, y: 0, locked: null });
  const isInWishlist = useSelector(selectIsInWishlist(product?.id));

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [pRes, rRes] = await Promise.all([
          api.get(`/products/${slug}`),
          api.get(`/products/${slug}/related`),
        ]);
        const p  = pRes.data.data;
        setProduct(p);
        setRelated(rRes.data.data || []);
        setRecentlyViewed(saveRecentlyViewed(p));
        const sz = (() => {
          const fromProduct = parseJsonStringArray(p.sizes);
          if (fromProduct.length) return fromProduct;
          return [...new Set(
            (p.variants || [])
              .map((v) => (v.size != null ? String(v.size).trim() : ''))
              .filter(Boolean),
          )];
        })();
        const cl = (() => {
          const fromProduct = parseJsonStringArray(p.colors);
          const raw = fromProduct.length
            ? fromProduct
            : [...new Set(
              (p.variants || [])
                .map((v) => (v.color != null ? String(v.color).trim() : ''))
                .filter(Boolean),
            )];
          if (raw.length === 1 && String(raw[0]).toLowerCase() === 'default') return [];
          return raw;
        })();
        const sizeList = sz.length ? sz : [null];
        const colorList = cl.length ? cl : [null];
        let initSize = sz[0] || '';
        let initColor = cl[0] || '';
        if (p.variants?.length) {
          const inStock = sizeList.flatMap((s) =>
            colorList.map((c) => ({ s: s || '', c: c || '', stock: getVariantStock(p, s, c) })),
          ).find((row) => row.stock > 0);
          if (inStock) {
            initSize = inStock.s;
            initColor = inStock.c;
          }
        }
        setSelectedSize(initSize);
        setSelectedColor(initColor);
        setGalleryIndex(0);
      } catch {
        toast.error('Product not found');
      }
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const stock = getVariantStock(product, selectedSize, selectedColor);
    setQuantity((q) => (stock > 0 ? Math.min(q, stock) : 1));
  }, [product, selectedSize, selectedColor]);

  const handleAddToCart = async () => {
    const sizeOptions = parseJsonStringArray(product.sizes);
    const colorOpts = parseJsonStringArray(product.colors);
    if (sizeOptions.length && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (colorOpts.length && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    setCartLoading(true);
    try {
      const matchedVariant = findMatchingVariant(product.variants, selectedSize, selectedColor);
      await dispatch(addToCart({
        product_id: product.id,
        quantity,
        size: selectedSize,
        color: selectedColor,
        variant_id: matchedVariant?.id ?? null,
        product,
      })).unwrap();
      toast.success('Added to cart');
    } catch (err) { toast.error(err); }
    setCartLoading(false);
  };

  const handleBuyNow = async () => {
    const sizeOptions = parseJsonStringArray(product.sizes);
    const colorOpts = parseJsonStringArray(product.colors);
    if (sizeOptions.length && !selectedSize) { toast.error('Please select a size'); return; }
    if (colorOpts.length && !selectedColor) { toast.error('Please select a color'); return; }
    setCartLoading(true);
    try {
      const matchedVariant = findMatchingVariant(product.variants, selectedSize, selectedColor);
      await dispatch(addToCart({
        product_id: product.id,
        quantity,
        size: selectedSize,
        color: selectedColor,
        variant_id: matchedVariant?.id ?? null,
        product,
      })).unwrap();
      navigate('/checkout');
    } catch (err) { toast.error(err); }
    setCartLoading(false);
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { toast.error('Please login to save items'); return; }
    await dispatch(toggleWishlist({ product_id: product.id, product }));
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Saved to wishlist');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please login to leave a review'); return; }
    try {
      await api.post('/reviews', { product_id: product.id, rating: reviewRating, body: reviewText });
      toast.success('Review submitted for approval');
      setReviewText('');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openLightbox = useCallback((index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const imageCount = product?.images?.length || (product?.thumbnail ? 1 : 0);

  const stepGallery = useCallback((dir) => {
    setGalleryIndex((i) => {
      const len = imageCount || 1;
      return (i + dir + len) % len;
    });
  }, [imageCount]);

  const stepLightbox = useCallback((dir) => {
    setLightboxIndex((i) => {
      const len = imageCount || 1;
      return (i + dir + len) % len;
    });
  }, [imageCount]);

  useEffect(() => {
    const el = galleryCarouselRef.current;
    if (!el || imageCount <= 1) return undefined;

    const onTouchStart = (e) => {
      galleryTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        locked: null,
      };
    };

    const onTouchMove = (e) => {
      const ref = galleryTouchRef.current;
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
      const ref = galleryTouchRef.current;
      if (ref.locked !== 'h') { ref.locked = null; return; }
      const dx = e.changedTouches[0].clientX - ref.x;
      if (Math.abs(dx) > 40) stepGallery(dx < 0 ? 1 : -1);
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
  }, [imageCount, stepGallery, product?.id]);

  if (loading) return (
    <div className="page-top-margin min-h-screen page-product-detail" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="container-custom py-8 md:py-12">
        <div className="pd-layout">
          <div className="pd-gallery">
            <div className="pd-gallery__carousel skeleton" />
          </div>
          <div className="space-y-4">
            {[0.5, 0.35, 0.7, 0.45, 0.55].map((w, i) => (
              <div key={i} style={{ height: i === 4 ? 52 : 18, width: `${w * 100}%`, backgroundColor: 'var(--color-bg-surface)', borderRadius: 2 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="page-top-margin min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="text-center">
        <p className="font-mono text-foreground-dim uppercase text-xs tracking-widest mb-4" style={{ letterSpacing: '0.15em' }}>PRODUCT NOT FOUND</p>
        <Link to="/products" className="font-mono uppercase product-detail-mono-sm tracking-widest text-foreground border border-line px-6 py-3 hover:border-boutique transition-colors" style={{ letterSpacing: '0.15em' }}>
          BACK TO SHOP
        </Link>
      </div>
    </div>
  );

  const name        = getProductName(product, language);
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const sizeOptions = (() => {
    const fromProduct = parseJsonStringArray(product.sizes);
    if (fromProduct.length) return fromProduct;
    return [...new Set(
      (product.variants || [])
        .map((v) => (v.size != null ? String(v.size).trim() : ''))
        .filter(Boolean),
    )];
  })();
  const colorOptions = (() => {
    const fromProduct = parseJsonStringArray(product.colors);
    const raw = fromProduct.length
      ? fromProduct
      : [...new Set(
        (product.variants || [])
          .map((v) => (v.color != null ? String(v.color).trim() : ''))
          .filter(Boolean),
      )];
    if (raw.length === 1 && String(raw[0]).toLowerCase() === 'default') return [];
    return raw;
  })();
  const images      = product.images?.length > 0 ? product.images : [{ url: product.thumbnail }];
  const discount    = getDiscountPercent(product.price, product.sale_price);
  const availableStock = getVariantStock(product, selectedSize, selectedColor);
  const isOutOfStock = availableStock === 0;
  const isSizeAvailable = (size) => getVariantStock(product, size, selectedColor) > 0;
  const isColorAvailable = (color) => getVariantStock(product, selectedSize, color) > 0;
  const categoryName = product.category
    ? (language === 'ar' ? product.category.name_ar : product.category.name_en)
    : null;
  const categoryLink = product.category?.id
    ? `/products?category=${product.category.id}`
    : '/products';

  const purchasePanel = (
    <>
      <nav className="pd-breadcrumb pd-m-order-1" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to={categoryLink}>{categoryName || 'Shop'}</Link>
        <span aria-hidden>/</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{name}</span>
      </nav>

      <h1 className="pd-title pd-m-order-2">{name}</h1>

      {product.rating_count > 0 && (
        <div className="pd-m-order-3 flex items-center gap-2">
          <Stars n={5} fill={Math.round(product.rating_avg)} />
          <span className="text-sm text-foreground-dim">({product.rating_count} reviews)</span>
        </div>
      )}

      <div className="pd-price-block pd-m-order-4">
        {product.sale_price ? (
          <>
            <span className="pd-price-label">Sale price</span>
            <div className="pd-price-row">
              <span className="pd-price-sale pd-price-sale--accent">
                {formatPrice(product.sale_price, 'EGP', language)}
              </span>
              <span className="pd-price-regular">
                {formatPrice(product.price, 'EGP', language)}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="pd-price-label">Regular price</span>
            <span className="pd-price-sale">{formatPrice(product.price, 'EGP', language)}</span>
          </>
        )}
        <p className="pd-shipping-note">Shipping calculated at checkout.</p>
      </div>

      <hr className="pd-separator pd-m-order-5" aria-hidden />

      {colorOptions.length > 0 && (
        <div className="pd-m-order-6">
          <p className="pd-option-label">Color</p>
          <div className="pd-option-pills">
            {colorOptions.map((c) => {
              const oos = !isColorAvailable(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => !oos && setSelectedColor(c)}
                  disabled={oos}
                  className={`pd-option-pill${selectedColor === c ? ' is-selected' : ''}${oos ? ' is-disabled' : ''}`}
                  title={oos ? 'Out of stock' : undefined}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizeOptions.length > 0 && (
        <div className="pd-m-order-7">
          <p className="pd-option-label">Size</p>
          <div className="pd-option-pills">
            {sizeOptions.map((s) => {
              const oos = !isSizeAvailable(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => !oos && setSelectedSize(s)}
                  disabled={oos}
                  className={`pd-option-pill${selectedSize === s ? ' is-selected' : ''}${oos ? ' is-disabled' : ''}`}
                  title={oos ? 'Out of stock' : undefined}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pd-m-order-8">
        <p className="pd-option-label">Quantity</p>
        <div className="pd-quantity">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={12} strokeWidth={2} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(availableStock || 99, quantity + 1))}
            disabled={isOutOfStock || quantity >= availableStock}
            aria-label="Increase quantity"
          >
            <Plus size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isOutOfStock ? (
        <p className="pd-m-order-9 text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]">Sold out</p>
      ) : availableStock <= 5 ? (
        <p className="pd-m-order-9 text-sm text-foreground-muted">Only {availableStock} left in stock</p>
      ) : null}

      <div className="pd-accordions pd-m-order-10">
        <details className="pd-accordion">
          <summary className="pd-accordion__summary">
            <span>Product Description</span>
            <ChevronDown size={18} className="pd-accordion__chevron" aria-hidden />
          </summary>
          <div className="pd-accordion__content">
            {description ? (
              <ProductDescriptionContent text={description} />
            ) : (
              <p className="text-sm text-foreground-dim">No description available for this product.</p>
            )}
          </div>
        </details>

        <details className="pd-accordion">
          <summary className="pd-accordion__summary">
            <span>Product Details</span>
            <ChevronDown size={18} className="pd-accordion__chevron" aria-hidden />
          </summary>
          <div className="pd-accordion__content">
            <div className="pd-details-grid">
              {[
                { label: 'SKU',      value: product.sku || 'N/A' },
                { label: 'Category', value: categoryName || '—' },
                { label: 'Sizes',    value: sizeOptions.join(', ') || '—' },
                { label: 'Colors',   value: colorOptions.join(', ') || '—' },
                { label: 'Stock',    value: isOutOfStock ? 'Out of stock' : `${availableStock} units`, isStock: true },
              ].map(({ label, value, isStock }) => (
                <div key={label} className="pd-details-grid__row">
                  <span className="pd-details-grid__label">{label}</span>
                  <span className={`pd-details-grid__value${isStock && isOutOfStock ? ' pd-details-grid__value--oos' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="pd-m-order-11 space-y-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || cartLoading}
          className="pd-cta"
        >
          {isOutOfStock ? 'Sold Out' : cartLoading ? 'Adding…' : 'Add to Cart'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock || cartLoading}
          className="pd-cta pd-cta--outline"
        >
          Buy Now
        </button>
        <button
          type="button"
          onClick={handleWishlist}
          className={`pd-cta pd-cta--outline pd-wishlist-btn${isInWishlist ? ' is-saved' : ''}`}
        >
          <Heart
            size={14}
            strokeWidth={1.75}
            className="pd-wishlist-btn__icon"
          />
          {isInWishlist ? 'Saved' : 'Save to Wishlist'}
        </button>
      </div>
    </>
  );

  return (
    <>
      <Helmet>
        <title>{`${name} — Theboutiqueline`}</title>
        <meta name="description" content={description?.replace(/<[^>]+>/g, '').slice(0, 160)} />
      </Helmet>

      <div className="page-product-detail page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="container-custom py-6 md:py-10 lg:py-12">
          <div className="pd-layout">
            {/* Image carousel */}
            <div className="pd-gallery">
              <div
                ref={galleryCarouselRef}
                className="pd-gallery__carousel"
              >
                <div
                  className="pd-gallery__track"
                  style={{
                    width: `${images.length * 100}%`,
                    transform: `translateX(-${(galleryIndex * 100) / images.length}%)`,
                  }}
                >
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className="pd-gallery__slide"
                      style={{ flex: `0 0 ${100 / images.length}%` }}
                      onClick={() => openLightbox(i)}
                      aria-label={`Open image ${i + 1} in gallery view`}
                    >
                      <img
                        src={resolveMediaUrl(img.url)}
                        alt={`${name} ${i + 1}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                      />
                      {discount > 0 && i === 0 && (
                        <span className="badge-sale-boutique absolute top-3 left-3 z-10">-{discount}%</span>
                      )}
                    </button>
                  ))}
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="pd-gallery__nav pd-gallery__nav--prev"
                      onClick={() => stepGallery(-1)}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="pd-gallery__nav pd-gallery__nav--next"
                      onClick={() => stepGallery(1)}
                      aria-label="Next image"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <div className="pd-gallery__dots" role="tablist" aria-label="Product images">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={galleryIndex === i}
                          aria-label={`Image ${i + 1}`}
                          className={`pd-gallery__dot${galleryIndex === i ? ' is-active' : ''}`}
                          onClick={() => setGalleryIndex(i)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="pd-gallery__thumbs" aria-hidden={images.length <= 1}>
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pd-gallery__thumb${galleryIndex === i ? ' is-active' : ''}`}
                      onClick={() => setGalleryIndex(i)}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <img src={resolveMediaUrl(img.url)} alt="" loading="lazy" draggable={false} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky purchase panel */}
            <div className="pd-info">
              {purchasePanel}
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-14 md:mt-16 pt-10 border-t border-line">
            <h2 className="pd-section-title">Reviews</h2>
            {product.reviews?.length > 0 ? (
              <div className="space-y-4 mb-8 max-w-3xl">
                {product.reviews.map((rev, i) => (
                  <div key={i} className="p-5" style={{ backgroundColor: 'var(--color-bg-card)', borderLeft: '2px solid var(--color-accent)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{rev.user?.name || 'Anonymous'}</span>
                      <Stars n={5} fill={rev.rating} />
                    </div>
                    <p className="text-sm text-foreground-muted leading-relaxed">{rev.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-dim mb-6">No reviews yet. Be the first.</p>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4 max-w-xl pt-6 border-t border-line">
              <p className="text-sm font-semibold uppercase tracking-wider text-foreground-dim">Leave a review</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setReviewRating(n)}
                    style={{ color: n <= reviewRating ? 'var(--color-accent)' : 'var(--color-border)', fontSize: 22, lineHeight: 1 }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Your review..."
                rows={4}
                className="input-boutique w-full resize-none"
                required
              />
              <button type="submit" className="pd-cta" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                Submit Review
              </button>
            </form>
          </div>

          {/* Recently viewed */}
          <div className="mt-14 md:mt-16 pt-10 border-t border-line">
            <h2 className="pd-section-title">Recently Viewed</h2>
            {recentlyViewed.length > 0 ? (
              <div className="product-card-grid">
                {recentlyViewed.slice(0, 4).map((p) => (
                  <div key={p.id} className="h-full">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-dim">You haven&apos;t viewed any other products yet.</p>
            )}
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-14 md:mt-16 pt-10 border-t border-line">
              <div className="flex items-end justify-between mb-8 gap-4">
                <h2 className="pd-section-title mb-0">You May Also Like</h2>
                <Link to="/products" className="text-xs uppercase tracking-widest text-foreground-dim hover:text-foreground transition-colors whitespace-nowrap">
                  View all
                </Link>
              </div>
              <div className="product-card-grid">
                {related.slice(0, 4).map((p) => (
                  <div key={p.id} className="h-full">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="pd-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              className="pd-lightbox__btn pd-lightbox__btn--close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close gallery"
            >
              <X size={28} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="pd-lightbox__btn pd-lightbox__btn--prev"
                  onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  type="button"
                  className="pd-lightbox__btn pd-lightbox__btn--next"
                  onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                  aria-label="Next image"
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}
            <img
              src={resolveMediaUrl(images[lightboxIndex]?.url)}
              alt={`${name} ${lightboxIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
