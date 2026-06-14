import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductCard from '../components/product/ProductCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import HeroFramer from '../components/home/HeroFramer';
import CategorySoonMessage from '../components/common/CategorySoonMessage';
import api from '../utils/api';
import { resolveMediaUrl, getProductName, getCategoryName, getCategoryTileTitle, getCategoryComingSoonLabel, formatPrice, isCategoryActive, findCategoryBySlug } from '../utils/helpers';

/* ════════════════════════════════════════════
   PHOTO MAP — each file used exactly once
════════════════════════════════════════════ */
const P = {
  heroBg:      '/photos/aoQHDlgf24ATYxdu0msFV5QjCU.webp',
  aboutBg:     '/photos/4JyNJK5h7DVDfgID8lBKhy3M.jpg',
  dropsBanner: '/photos/2LEsj8dTfuADr3ESmjj0dA2TgA.webp',
  catMen:        '/photos/vfprU5p4ewa5iy7pKy0FpdX3A.jpg',
  catWomen:      '/photos/klOLqeBgESjqUBiaPQqHCqBgSw.webp',
  catChildren:   '/photos/LIiUpXMeQEBfuNgYYaeO1PyL5BA.jpg',
  catAccessories:'/photos/mqgBZP4952uBDqPQX6hHfyoX6fM.png',
  catShoes:      '/photos/v0XCMMD3lRM3TU0xC5O5upOnFM.jpeg',
  catPerfumes:   '/photos/9634.jpg',
  ctaBg:       '/photos/KxF8H6qGSaJvRZEhALbixoOrQg.jpg',
  shopCollectionBg: '/photos/shop-collection-cta.png',
  brandBg:     '/photos/RtzexXET68jVkKH97jdJpyotYOk.webp',
  ig1:         '/photos/fcUv7dMRjP5YP77zc5TUoOIeStQ.webp',
  ig2:         '/photos/PjuvlIg3piZLdoxJRVVfoyZicM.webp',
  ig3:         '/photos/5OIEywPRm1VllaQtbnw5GQQ7sJ8.webp',
  ig4:         '/photos/wD1NGg2WYyNvmveKO9mhXITsU.webp',
  ig5:         '/photos/AjgCZ4E1sAjZEW1TZ6ZVu33NPkM.webp',
  ig6:         '/photos/2ZaHZrb33mV7C7BQp1A0y0K3xi8.webp',
};

/* ════════════════════════════════════════════
   PRODUCT LINK HELPER
════════════════════════════════════════════ */
const productLink = (p) => {
  if (!p?.slug || p.slug === 'products') return '/products';
  return `/products/${p.slug}`;
};

/* ════════════════════════════════════════════
   INTERSECTION OBSERVER HOOK (scroll reveal)
════════════════════════════════════════════ */
function useReveal(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12, ...options }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

/* Stagger-reveal hook for a list of items */
function useStagger(count, triggerRef) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!triggerRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(triggerRef.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

/* Reveal transition style helper */
const revealStyle = (inView, delay = 0) => ({
  opacity:    inView ? 1 : 0,
  transform:  inView ? 'translateY(0)' : 'translateY(30px)',
  transition: `opacity 0.7s ease-out ${delay}s, transform 0.7s ease-out ${delay}s`,
  willChange: 'opacity, transform',
});

/* ════════════════════════════════════════════
   SECTION HEADER component
════════════════════════════════════════════ */
function SectionHeader({ serif, mono, viewAllHref, inView }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between mb-8 md:mb-10">
      <div style={revealStyle(inView)}>
        <div className="section-heading">
          {serif ? <span className="section-heading-serif text-3xl md:text-4xl lg:text-5xl">{serif}</span> : null}
          <span className="section-heading-mono text-3xl md:text-4xl lg:text-5xl">{mono}</span>
        </div>
      </div>
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="font-mono font-bold uppercase text-foreground-muted hover:text-foreground text-xs sm:text-sm md:text-base tracking-widest transition-colors flex-shrink-0"
          style={{ letterSpacing: '0.15em', ...revealStyle(inView, 0.15) }}
        >
          {t('view_all')} ↗
        </Link>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   IMAGE PLACEHOLDER (used when no real image)
════════════════════════════════════════════ */
function ImgPlaceholder({ className = '', style = {}, label = '' }) {
  return (
    <div
      className={`bg-surface-elevated flex items-end justify-start ${className}`}
      style={style}
    >
      {label && (
        <span className="font-mono uppercase text-white/20 text-[10px] tracking-widest p-3" style={{ letterSpacing: '0.12em' }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   CTA BUTTON (outline style)
════════════════════════════════════════════ */
function OutlineBtn({ children, to, href, className = '' }) {
  const cls = `inline-block border border-white text-white font-mono uppercase text-[11px] tracking-widest px-8 py-3 transition-all duration-300 hover:bg-boutique hover:border-boutique ${className}`;
  if (to)   return <Link to={to} className={cls} style={{ letterSpacing: '0.15em' }}>{children}</Link>;
  if (href) return <a href={href} className={cls} style={{ letterSpacing: '0.15em' }}>{children}</a>;
  return <button className={cls} style={{ letterSpacing: '0.15em' }}>{children}</button>;
}

/* ════════════════════════════════════════════
   FULL-WIDTH CINEMATIC SECTION
════════════════════════════════════════════ */
function CinematicSection({ imageUrl, minHeight = '60vh', mobileSquare = false, children, parallax = false, imagePosition = 'center center' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  return (
    <div
      ref={ref}
      className={
        mobileSquare
          ? 'relative w-full overflow-hidden aspect-square lg:aspect-auto lg:min-h-[70vh]'
          : 'relative overflow-hidden'
      }
      style={mobileSquare ? undefined : { minHeight }}
    >
      <motion.div
        className="absolute inset-0 scale-110"
        style={parallax ? { y: bgY } : {}}
      >
        {imageUrl
          ? <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: imagePosition }} />
          : <div className="w-full h-full bg-surface-elevated" />
        }
        <div className="absolute inset-0 bg-black/55" />
      </motion.div>
      <div
        className={
          mobileSquare
            ? 'relative z-10 flex h-full w-full items-center justify-center px-4 py-5 lg:min-h-[70vh]'
            : 'relative z-10 flex h-full items-center justify-center'
        }
        style={mobileSquare ? undefined : { minHeight }}
      >
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   STATIC PRODUCT CARD (for offline mock data)
   Uses product.img directly, no resolveMediaUrl
════════════════════════════════════════════ */
function StaticProductCard({ product }) {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const sale = product.sale_price ?? product.salePrice;
  const disc = sale ? Math.round((1 - sale / product.price) * 100) : null;
  const name = getProductName(product, language) || product.name_en || '';
  return (
    <Link to={productLink(product)} className="block group h-full bg-surface-card">
      <div className="product-card-boutique">
      <div className="product-card-boutique__media">
        <img
          src={product.img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {disc && (
          <span
            className="badge-sale-boutique absolute top-3 right-3"
          >
            -{disc}%
          </span>
        )}
        {product.isNew && !disc && (
          <span className="product-card-media-chip absolute top-3 right-3 z-10">
            {t('badge_new')}
          </span>
        )}
        <div className="product-card-boutique__body">
          <p className="product-card-boutique__title" lang={language} dir="auto">
            {name}
          </p>
          <div className="product-card-boutique__prices">
            {sale ? (
              <>
                <span className="product-card-boutique__price product-card-boutique__price--sale font-mono font-bold">
                  {formatPrice(sale, 'EGP', language)}
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
      </div>
    </Link>
  );
}

/** Split "Women's Clothing (2027)" → title + "(2027)" for coming-soon tiles */
function parseCategoryLabel(label) {
  const text = String(label || '').trim();
  const match = text.match(/^(.*?)\s*(\([^)]+\)|（[^）]+）)\s*$/u);
  if (!match) return { title: text, date: null };
  return { title: match[1].trim(), date: match[2].trim() };
}

/* ════════════════════════════════════════════
   CATEGORY TILE
════════════════════════════════════════════ */
function CategoryTileLink({
  to,
  label,
  dateLabel = null,
  imageSrc,
  inView,
  delay = 0,
  aspectRatio = '1/1',
  centerLabel = false,
  labelSize = 'text-[1.6875rem] md:text-[1.875rem]',
  disabledTitleSize = 'text-[2.25rem] md:text-[2.8125rem] lg:text-[3.375rem]',
  disabled = false,
  disabledLabel = '',
}) {
  const parsed = parseCategoryLabel(label);
  const categoryTitle = parsed.title;
  const categoryDate = dateLabel || parsed.date;

  const inner = (
    <>
      <img
        src={imageSrc}
        alt={label}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
          disabled ? 'scale-100 opacity-70 grayscale' : 'group-hover:scale-105'
        }`}
      />
      <div className="cat-overlay" />
      {disabled && (
        <>
          <div
            className="absolute inset-0 z-10"
            style={{ backgroundColor: 'rgba(0,0,0,0.62)' }}
          />
          <span
            className={`absolute bottom-3 left-3 right-3 z-20 font-mono uppercase font-bold tracking-wide line-clamp-3 break-words pointer-events-none ${disabledTitleSize}`}
            style={{ letterSpacing: '0.05em', color: '#eb301e', overflowWrap: 'anywhere' }}
          >
            {categoryTitle}
          </span>
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 px-4 text-center pointer-events-none">
            {categoryDate && (
              <span className="category-soon-label text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white">
                {categoryDate}
              </span>
            )}
            {disabledLabel && (
              <span
                className="font-mono uppercase text-white/85 font-bold tracking-wide text-sm sm:text-base md:text-lg"
                style={{ letterSpacing: '0.06em' }}
              >
                {disabledLabel}
              </span>
            )}
          </div>
        </>
      )}
      {!disabled && centerLabel ? (
        <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
          <span
            className={`font-mono uppercase text-white font-bold tracking-wide text-center ${labelSize}`}
            style={{ letterSpacing: '0.05em' }}
          >
            {label}
          </span>
        </div>
      ) : !disabled ? (
        <span
          className={`absolute bottom-3 left-3 right-3 font-mono uppercase text-white font-bold tracking-wide line-clamp-2 break-words pointer-events-none ${labelSize}`}
          style={{ letterSpacing: '0.05em', overflowWrap: 'anywhere' }}
        >
          {label}
        </span>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <div
        className="block relative overflow-hidden w-full cursor-not-allowed"
        style={{ aspectRatio, ...revealStyle(inView, delay) }}
        aria-disabled="true"
        title={label}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="block relative overflow-hidden group w-full"
      style={{ aspectRatio, ...revealStyle(inView, delay) }}
    >
      {inner}
    </Link>
  );
}

/* ════════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════════ */
export default function Home() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);

  /* ── Data state (must be declared before memos that read categories) ── */
  const [loading,      setLoading]      = useState(true);
  const [newArrivals,  setNewArrivals]  = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [latestDrops,  setLatestDrops]  = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [banners,      setBanners]      = useState([]);
  const [heroProducts, setHeroProducts] = useState([]);
  const [activeTab,    setActiveTab]    = useState('men');
  const [menProducts,  setMenProducts]  = useState([]);
  const [womenProducts,setWomenProducts]= useState([]);
  const [tabFade,      setTabFade]      = useState(true);

  const whyFeatures = useMemo(() => ([
    { num: '01', title: t('why_1_title'), desc: t('why_1_desc') },
    { num: '02', title: t('why_3_title'), desc: t('why_3_desc') },
    { num: '03', title: t('why_4_title'), desc: t('why_4_desc') },
  ]), [t, language]);

  const categoryFallbackImg = useMemo(() => ({
    'mens-clothing': P.catMen,
    'womens-clothing': P.catWomen,
    'childrens-clothing': P.catChildren,
    accessories: P.catAccessories,
    shoes: P.catShoes,
    perfumes: P.catPerfumes,
  }), []);

  const categoryTiles = useMemo(() => ([
    { slug: 'mens-clothing', label: t('cat_mens_clothing'), href: '/category/mens-clothing', staticImg: P.catMen },
    { slug: 'womens-clothing', label: t('cat_womens_clothing'), href: '/category/womens-clothing', staticImg: P.catWomen },
    { slug: 'childrens-clothing', label: t('cat_childrens_clothing'), href: '/category/childrens-clothing', staticImg: P.catChildren },
    { slug: 'accessories', label: t('cat_accessories'), href: '/category/accessories', staticImg: P.catAccessories },
    { slug: 'shoes', label: t('cat_shoes'), href: '/category/shoes', staticImg: P.catShoes },
    { slug: 'perfumes', label: t('cat_perfumes'), href: '/category/perfumes', staticImg: P.catPerfumes },
  ]), [t, language]);

  const categoryCards = useMemo(() => {
    const imgFor = (cat) => {
      if (cat?.image) return resolveMediaUrl(cat.image);
      return categoryFallbackImg[cat?.slug] || P.catMen;
    };
    const isActive = isCategoryActive;
    if (categories.length > 0) {
      return [...categories]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((cat) => ({
          key: `api-${cat.id}`,
          label: getCategoryTileTitle(cat, language),
          dateLabel: !isActive(cat) ? getCategoryComingSoonLabel(cat, language) : null,
          href: `/category/${cat.slug}`,
          imageSrc: imgFor(cat),
          disabled: !isActive(cat),
        }));
    }
    return categoryTiles.map((tile) => ({
      key: tile.slug,
      label: tile.label,
      href: tile.href,
      imageSrc: tile.staticImg,
      disabled: false,
    }));
  }, [categories, categoryTiles, categoryFallbackImg, language]);

  const womenCategory = useMemo(
    () => findCategoryBySlug(categories, 'womens-clothing'),
    [categories],
  );
  const womenCategoryActive = useMemo(() => isCategoryActive(womenCategory), [womenCategory]);

  const heroRef = useRef(null);

  /* ── Reveal hooks for each section ── */
  const [dropsRef,    dropsInView]    = useReveal();
  const [saleRef,     saleInView]     = useReveal();
  const [whyRef,      whyInView]      = useReveal();
  const [catRef,      catInView]      = useReveal();
  const [arrivRef,    arrivInView]    = useReveal();

  /* ── Fetch data ── */
  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        const [newRes, saleRes, catRes, bannerRes, heroTickerRes] = await Promise.all([
          api.get('/products?new_arrivals=true&limit=8'),
          api.get('/products?on_sale=true&limit=4'),
          api.get('/categories'),
          api.get('/banners').catch(() => ({ data: { data: [] } })),
          api.get('/products?hero_ticker=true&limit=100'),
        ]);
        if (cancelled) return;
        const newData  = newRes.data.data   || [];
        const saleData = saleRes.data.data  || [];
        const heroData = heroTickerRes.data.data || [];
        setNewArrivals(newData);
        setSaleProducts(saleData);
        setLatestDrops(newData.slice(0, 4));
        setCategories(catRes.data.data || []);
        setHeroProducts(heroData);
        const activeBanners = (bannerRes.data.data || []).filter((b) => b.is_active);
        setBanners(activeBanners);
      } catch (err) {
        if (cancelled) return;
        setHeroProducts([]);
        setLatestDrops([]);
        setSaleProducts([]);
      }
      if (!cancelled) setLoading(false);
    };

    loadHomeData();

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadHomeData();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  /* ── Fetch tab products (men/women) by category ── */
  useEffect(() => {
    api.get('/products?new_arrivals=true&gender=men&limit=4')
      .then((menRes) => {
        setMenProducts(menRes.data.data || []);
      })
      .catch(() => setMenProducts([]));

    if (!womenCategoryActive) {
      setWomenProducts([]);
      return;
    }

    api.get('/products?new_arrivals=true&gender=women&limit=4')
      .then((womenRes) => {
        setWomenProducts(womenRes.data.data || []);
      })
      .catch(() => setWomenProducts([]));
  }, [womenCategoryActive]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setTabFade(false);
    setTimeout(() => { setActiveTab(tab); setTabFade(true); }, 200);
  };

  const heroBanner   = banners.find((b) => b.type === 'hero');

  const tabProducts  = activeTab === 'men' ? menProducts : womenProducts;
  const showWomenSoon = activeTab === 'women' && !womenCategoryActive;
  const womenSoonDate = getCategoryComingSoonLabel(womenCategory, language);

  /* ─────────── RENDER ─────────── */
  return (
    <>
      <Helmet>
        <title>{t('meta_home_title')}</title>
        <meta name="description" content={t('meta_home_description')} />
      </Helmet>

      <HeroFramer
        heroRef={heroRef}
        heroBanner={heroBanner}
        heroProducts={heroProducts}
        fallbackHeroBg={P.ctaBg}
      />

      {/* ════════════════════════════════
          1. NEW ARRIVALS (with tab toggle)
      ════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-theme border-t border-line">
        <div className="container-custom">
          {/* Header + tabs + view all */}
          <div ref={arrivRef} className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
            <div style={revealStyle(arrivInView)}>
              <div className="section-heading mb-3">
                <span className="section-heading-serif text-3xl md:text-4xl lg:text-5xl">{t('section_new')}</span>
                <span className="section-heading-mono text-3xl md:text-4xl lg:text-5xl">{t('section_arrivals')}</span>
              </div>
              <div className="flex gap-0 mt-4">
                {[
                  { id: 'men', label: t('tab_men') },
                  { id: 'women', label: t('tab_women') },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => switchTab(id)}
                    className="font-mono font-bold uppercase text-xs sm:text-sm tracking-widest px-6 py-2.5 sm:px-8 sm:py-3 transition-all duration-200"
                    style={{
                      letterSpacing:   '0.15em',
                      backgroundColor: activeTab === id ? '#eb301e' : 'transparent',
                      color:           activeTab === id ? '#fff'    : 'var(--color-text)',
                      border:          '1px solid',
                      borderColor:     activeTab === id ? '#eb301e' : 'var(--color-border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Link
              to={`/products?new_arrivals=true&gender=${activeTab}`}
              className={`font-mono font-bold uppercase text-foreground-muted hover:text-foreground text-xs sm:text-sm md:text-base tracking-widest transition-colors ${showWomenSoon ? 'invisible pointer-events-none' : ''}`}
              style={{ letterSpacing: '0.15em', ...revealStyle(arrivInView, 0.15) }}
              aria-hidden={showWomenSoon}
            >
              {t('view_all')} ↗
            </Link>
          </div>

          {/* Products grid with fade transition */}
          <div
            style={{
              opacity:    tabFade ? 1 : 0,
              transform:  tabFade ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            {loading ? (
              <SkeletonGrid count={4} />
            ) : showWomenSoon ? (
              <CategorySoonMessage
                dateLabel={womenSoonDate}
                subtitle={t('category_coming_soon')}
                style={revealStyle(arrivInView)}
              />
            ) : (
              <div className="product-card-grid">
                {tabProducts.map((p, i) => (
                  <div key={p.id || i} className="h-full" style={revealStyle(arrivInView, 0.1 + i * 0.07)}>
                    {p.img
                      ? <StaticProductCard product={p} />
                      : <ProductCard product={p} />
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          2. CATEGORIES
      ════════════════════════════════ */}
      <section className="relative z-0 py-16 md:py-24 overflow-hidden bg-theme border-t border-line">
        <div className="container-custom">
          {/* Header */}
          <div ref={catRef} className="flex items-end justify-between mb-8 md:mb-10">
            <span
              className="section-title"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                ...revealStyle(catInView),
              }}
            >
              {t('categories')}
            </span>
            <Link
              to="/products"
              className="font-mono font-bold uppercase text-foreground-muted hover:text-foreground text-xs sm:text-sm md:text-base tracking-widest transition-colors"
              style={{ letterSpacing: '0.15em', ...revealStyle(catInView, 0.15) }}
            >
              {t('shop_all')} ↗
            </Link>
          </div>

          {/* Mobile: uniform 2-column grid */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {categoryCards.map((card, i) => (
              <CategoryTileLink
                key={card.key}
                to={card.href}
                label={card.label}
                dateLabel={card.dateLabel}
                imageSrc={card.imageSrc}
                inView={catInView}
                delay={0.08 + i * 0.06}
                aspectRatio="1/1"
                centerLabel={false}
                labelSize="text-[1.375rem] sm:text-[1.5rem]"
                disabledTitleSize="text-[1.25rem] sm:text-[1.375rem]"
                disabled={card.disabled}
                disabledLabel={t('category_coming_soon')}
              />
            ))}
          </div>

          {/* Desktop: 3×2 category grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            {categoryCards.map((card, i) => (
              <CategoryTileLink
                key={card.key}
                to={card.href}
                label={card.label}
                dateLabel={card.dateLabel}
                imageSrc={card.imageSrc}
                inView={catInView}
                delay={0.1 + i * 0.08}
                aspectRatio="4/5"
                centerLabel={false}
                labelSize="text-[1.6875rem] md:text-[1.875rem] lg:text-[2.25rem]"
                disabledTitleSize="text-[1.5rem] md:text-[1.75rem] lg:text-[2rem]"
                disabled={card.disabled}
                disabledLabel={t('category_coming_soon')}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          3. BOUTIQUE SALE
      ════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-theme border-t border-line">
        <div className="container-custom">
          <div ref={saleRef}>
            <SectionHeader serif={t('section_sale_serif')} mono={t('section_sale_mono')} viewAllHref="/products?on_sale=true" inView={saleInView} />
          </div>

          {loading ? (
            <SkeletonGrid count={4} />
          ) : (
            <div
              className="product-card-grid"
              style={revealStyle(saleInView, 0.1)}
            >
              {saleProducts.map((p, i) => (
                <div key={p.id} className="h-full" style={revealStyle(saleInView, 0.1 + i * 0.08)}>
                  {p.img
                    ? <StaticProductCard product={p} />
                    : <ProductCard product={p} />
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════
          4. SEE COLLECTION
      ════════════════════════════════ */}
      <CinematicSection
        imageUrl={P.shopCollectionBg}
        minHeight="50vh"
        parallax
        imagePosition="center 38%"
      >
        <div className="text-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <OutlineBtn to="/products" className="text-sm py-4 px-12">{t('shop_collection')}</OutlineBtn>
          </motion.div>
        </div>
      </CinematicSection>

      {/* ════════════════════════════════
          6. WHY THE BOUTIQUE
      ════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-theme border-t border-line">
        <div className="container-custom">
          <div ref={whyRef} className="mb-12 md:mb-16">
            <p className="section-eyebrow" style={revealStyle(whyInView)}>{t('promise_eyebrow')}</p>
            <div className="section-heading" style={revealStyle(whyInView, 0.1)}>
              <span className="section-heading-serif text-3xl md:text-4xl lg:text-5xl">{t('why_serif')}</span>
              <span className="section-heading-mono text-3xl md:text-4xl lg:text-5xl">{t('why_mono')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {whyFeatures.map((f, i) => (
              <div
                key={f.num}
                className={`p-8 md:p-10 border-b border-line last:border-b-0 md:border-b-0 ${i < whyFeatures.length - 1 ? 'md:border-e' : ''}`}
                style={revealStyle(whyInView, 0.15 + i * 0.12)}
              >
                <span
                  className="font-mono uppercase text-[10px] tracking-widest block mb-4"
                  style={{ color: '#eb301e', letterSpacing: '0.2em' }}
                >
                  {f.num}
                </span>
                <h3 className="font-mono font-bold text-foreground uppercase text-xl md:text-2xl tracking-tight mb-3">
                  {f.title}
                </h3>
                <p className="font-mono text-foreground-muted text-xs uppercase leading-relaxed" style={{ letterSpacing: '0.08em' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
