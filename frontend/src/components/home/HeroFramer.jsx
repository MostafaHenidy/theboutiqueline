import { useMemo, useRef, useLayoutEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { ArrowUpRight } from 'lucide-react';
import { resolveMediaUrl, getProductName } from '../../utils/helpers';

/** Framer reference hero fallback when no banner is configured */
const FRAMER_HERO_IMG = '/photos/KxF8H6qGSaJvRZEhALbixoOrQg.jpg';

const productLink = (p) => {
  if (!p?.slug || p.slug === 'products') return '/products';
  return `/products/${p.slug}`;
};

function getTickerImageSrc(product) {
  const pickedId = product?.hero_ticker_image_id;
  if (pickedId && Array.isArray(product?.images)) {
    const picked = product.images.find((img) => Number(img.id) === Number(pickedId));
    if (picked?.url) return resolveMediaUrl(picked.url);
  }
  if (product?.img) return product.img;
  if (product?.thumbnail) return resolveMediaUrl(product.thumbnail);
  const images = product?.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    const url = first?.url || first?.image || first?.path;
    if (url) return resolveMediaUrl(url);
  }
  return null;
}

const easeOut = [0.22, 1, 0.36, 1];

/** Keep the last N words on one line to avoid typographic orphans in headlines. */
function bindWords(text, count = 2) {
  const words = String(text).trim().split(/\s+/);
  if (words.length <= count) return text;
  const head = words.slice(0, -count).join(' ');
  const tail = words.slice(-count).join(' ');
  return (
    <>
      {head}{' '}
      <span className="whitespace-nowrap">{tail}</span>
    </>
  );
}

const TICKER_GAP = 10;
const MOBILE_TICKER_GAP = 0;
const MOBILE_CARD_W = 130;

/** Repeat products until the segment is long enough to fill the viewport + one extra card. */
function fillTickerProducts(base, minCount) {
  if (!base.length) return [];
  const out = [];
  let i = 0;
  while (out.length < minCount) {
    const p = base[i % base.length];
    out.push({ ...p, _tickIdx: out.length });
    i += 1;
  }
  return out;
}

function HeroTicker({ products, variant = 'desktop', className = '' }) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const segmentRef = useRef(null);
  const [marqueeReady, setMarqueeReady] = useState(false);
  const [segmentProducts, setSegmentProducts] = useState(() =>
    fillTickerProducts(products, Math.max(products.length * 2, 6)),
  );

  const syncSegmentLength = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || products.length === 0) {
      setSegmentProducts(fillTickerProducts(products, Math.max(products.length * 2, 6)));
      return;
    }

    const applyCount = (minCount) => {
      setSegmentProducts((prev) => {
        if (prev.length === minCount) return prev;
        return fillTickerProducts(products, minCount);
      });
    };

    if (variant === 'mobile') {
      const cardSpan = MOBILE_CARD_W + MOBILE_TICKER_GAP;
      const minCount = Math.max(
        products.length * 2,
        Math.ceil(viewport.clientWidth / cardSpan) + products.length + 2,
      );
      applyCount(minCount);
      return;
    }

    const sample = segmentRef.current?.querySelector('.hero-framer-ticker__card');
    const cardSpan = (sample?.offsetHeight || 200) + TICKER_GAP;
    const minCount = Math.max(
      products.length * 2,
      Math.ceil(viewport.clientHeight / cardSpan) + products.length + 2,
    );
    applyCount(minCount);
  }, [products, variant]);

  const measureShift = useCallback(() => {
    const segment = segmentRef.current;
    const track = trackRef.current;
    if (!segment || !track) return;

    const size = variant === 'desktop'
      ? segment.offsetHeight
      : segment.offsetWidth;

    if (size > 0) {
      track.style.setProperty('--ticker-shift', `${size}px`);
      const viewport = viewportRef.current;
      const span = variant === 'mobile' ? MOBILE_CARD_W + MOBILE_TICKER_GAP : (segment.querySelector('.hero-framer-ticker__card')?.offsetHeight || 200) + TICKER_GAP;
      const viewportSize = viewport
        ? (variant === 'mobile' ? viewport.clientWidth : viewport.clientHeight)
        : 0;
      const duration = Math.max(18, ((size + viewportSize) / span) * 2.8);
      track.style.setProperty('--ticker-duration', `${duration}s`);
      setMarqueeReady(true);
    }
  }, [variant]);

  useLayoutEffect(() => {
    setMarqueeReady(false);
    syncSegmentLength();
  }, [syncSegmentLength]);

  useLayoutEffect(() => {
    setMarqueeReady(false);
    measureShift();

    const segment = segmentRef.current;
    const viewport = viewportRef.current;
    if (!segment) return undefined;

    const ro = new ResizeObserver(() => {
      syncSegmentLength();
      measureShift();
    });
    ro.observe(segment);
    if (viewport) ro.observe(viewport);

    const onResize = () => {
      syncSegmentLength();
      measureShift();
    };
    window.addEventListener('resize', onResize);

    segment.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', measureShift, { once: true });
    });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [measureShift, syncSegmentLength, segmentProducts]);

  if (!products.length) return null;

  const renderSegment = (segmentIndex) => (
    <ul
      ref={segmentIndex === 0 ? segmentRef : undefined}
      className="hero-framer-ticker__segment"
      aria-hidden={segmentIndex > 0 ? true : undefined}
    >
      {segmentProducts.map((p, idx) => (
        <li key={`${segmentIndex}-${p._tickIdx ?? idx}`}>
          <Link to={productLink(p)} className="hero-framer-ticker__card">
            <div className="hero-framer-ticker__img-wrap">
              <img
                src={getTickerImageSrc(p) || ''}
                alt={getProductName(p, language) || ''}
                draggable={false}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={`hero-framer-ticker hero-framer-ticker--${variant} ${className}`}
    >
      <div ref={viewportRef} className="hero-framer-ticker__viewport">
        <div
          ref={trackRef}
          className={`hero-framer-ticker__track${marqueeReady ? ' hero-framer-ticker__track--active' : ''}`}
        >
          {renderSegment(0)}
          {renderSegment(1)}
        </div>
      </div>
    </div>
  );
}

function HeroImagePanel({ src, children, parallaxRef, className = '' }) {
  const { scrollYProgress } = useScroll({
    target: parallaxRef,
    offset: ['start start', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0 scale-[1.03]" style={{ y: imgY }}>
        <img src={src} alt="" className="w-full h-full object-cover object-center" />
      </motion.div>
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      <div className="absolute inset-0 hero-vignette pointer-events-none" />
      <div className="absolute inset-0 z-10 pointer-events-none">{children}</div>
    </div>
  );
}

function HeroCopy({ variant = 'mobile', className = '' }) {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const isDesktop = variant === 'desktop';
  const isEn = language === 'en';
  const textDir = isEn ? 'ltr' : 'rtl';

  const headlineStyle = {
    fontFamily: 'var(--font-display, var(--font-arabic))',
    lineHeight: isEn ? 0.92 : 1.12,
    color: 'rgb(255, 255, 227)',
    letterSpacing: isEn ? (isDesktop ? '0.035em' : '0.03em') : '0.02em',
    maxWidth: '100%',
  };

  return (
    <div
      dir={textDir}
      lang={language}
      className={`hero-framer-copy hero-framer-copy--${variant} ${isEn ? 'hero-framer-copy--en' : 'hero-framer-copy--ar'} ${className}`}
    >
      <motion.p
        initial={{ opacity: 0, y: isDesktop ? 20 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
        className={`font-mono ${isDesktop ? 'text-xs' : 'text-base'} mb-3 md:mb-4 ${isEn ? 'uppercase' : ''}`}
        style={{
          letterSpacing: isEn ? '0.24em' : '0.08em',
          color: 'rgb(255, 255, 227)',
          opacity: 0.8,
        }}
      >
        {bindWords(t('hero_eyebrow'))}
      </motion.p>
      <h1
        className={`hero-framer-copy__headline${isEn ? ' uppercase' : ''}`}
        style={headlineStyle}
      >
        <motion.span
          className="hero-framer-copy__headline-line block"
          initial={{ opacity: 0, y: isDesktop ? 40 : 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: easeOut }}
        >
          {bindWords(t('hero_line1'))}
        </motion.span>
        <motion.span
          className="hero-framer-copy__headline-line block"
          initial={{ opacity: 0, y: isDesktop ? 40 : 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: easeOut }}
        >
          {bindWords(t('hero_line2'))}
        </motion.span>
      </h1>
    </div>
  );
}

function ShopNowCta({ className = '' }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: easeOut }}
    >
      <Link to="/products" className={`hero-framer-cta ${className}`}>
        <span className="hero-framer-cta__label">{t('shop_now')}</span>
        <ArrowUpRight size={20} strokeWidth={2} className="hero-framer-cta__arrow" />
      </Link>
    </motion.div>
  );
}

/**
 * Framer-style hero: editorial image + headline, product ticker marquee, Shop Now CTA.
 */
export default function HeroFramer({
  heroRef,
  heroBanner,
  heroProducts = [],
  fallbackHeroBg,
}) {
  const heroSrc = heroBanner?.image
    ? resolveMediaUrl(heroBanner.image)
    : (fallbackHeroBg || FRAMER_HERO_IMG);

  const tickerProducts = useMemo(() => (
    (heroProducts || [])
      .map((p) => ({ ...p, img: getTickerImageSrc(p) }))
      .filter((p) => p.img)
  ), [heroProducts]);

  const showTicker = tickerProducts.length > 0;

  return (
    <section id="hero" ref={heroRef} className="page-top-margin bg-theme">
      {/* ── MOBILE / TABLET (Framer layout) ── */}
      <div className="lg:hidden pt-2.5 pb-0 hero-framer-mobile">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: easeOut }}
          className="rounded-sm overflow-hidden hero-framer-mobile__media"
        >
          <HeroImagePanel
            src={heroSrc}
            parallaxRef={heroRef}
            className="relative h-full min-h-[var(--hero-framer-media-h)]"
          >
            <HeroCopy variant="mobile" />
          </HeroImagePanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: easeOut }}
          className="overflow-hidden bg-surface-card hero-framer-mobile-rail"
        >
          {showTicker && (
            <div className="hero-framer-rail-frame hero-framer-rail-frame--mobile">
              <HeroTicker products={tickerProducts} variant="mobile" />
            </div>
          )}
          <ShopNowCta />
        </motion.div>
      </div>

      {/* ── DESKTOP: image + ticker equal height; CTA full width below ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: easeOut }}
        className="hidden lg:block hero-framer-desktop"
      >
        <div className="hero-framer-desktop__pair">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="hero-framer-desktop__media"
          >
            <div className="hero-framer-desktop__media-inner rounded-sm overflow-hidden">
              <HeroImagePanel src={heroSrc} parallaxRef={heroRef} className="hero-framer-desktop__panel">
                <HeroCopy variant="desktop" />
              </HeroImagePanel>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: easeOut }}
            className="hero-framer-desktop__rail bg-surface-card"
          >
            <div className="hero-framer-rail-frame">
              {showTicker && <HeroTicker products={tickerProducts} variant="desktop" />}
              <div className="hero-framer-desktop__logo">
                <img
                  src="/logo-circle.png"
                  alt="The Boutique Line"
                  className="h-16 w-auto object-contain opacity-90"
                  draggable={false}
                />
              </div>
            </div>
            <ShopNowCta />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
