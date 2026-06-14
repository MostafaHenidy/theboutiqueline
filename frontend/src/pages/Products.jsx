import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/product/ProductCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import CategorySoonMessage from '../components/common/CategorySoonMessage';
import api from '../utils/api';
import { trackStoreEvent } from '../utils/analyticsTracker';
import { getCategoryName, isCategoryActive, findCategoryBySlug, getCategoryComingSoonLabel } from '../utils/helpers';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'NEWEST' },
  { value: 'price_asc',  label: 'PRICE: LOW → HIGH' },
  { value: 'price_desc', label: 'PRICE: HIGH → LOW' },
  { value: 'popular',    label: 'POPULAR' },
  { value: 'rating',     label: 'TOP RATED' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

/* ── Label utility ── */
function FilterLabel({ children }) {
  return (
    <p className="filter-section-label font-mono font-bold uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function SubcategoryFilters({ nodes, depth, filters, setFilter, language }) {
  if (!nodes?.length) return null;
  return nodes.map((sub) => (
    <div key={sub.id}>
      <button
        type="button"
        onClick={() => setFilter('subcategory', sub.id)}
        className="products-filter-control block w-full text-left font-mono font-bold uppercase tracking-widest py-2 transition-colors"
        style={{
          letterSpacing: '0.08em',
          paddingInlineStart: `${24 + depth * 16}px`,
          color: filters.subcategory == sub.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
        }}
      >
        — {getCategoryName(sub, language)}
      </button>
      {sub.children?.length > 0 && (
        <SubcategoryFilters
          nodes={sub.children}
          depth={depth + 1}
          filters={filters}
          setFilter={setFilter}
          language={language}
        />
      )}
    </div>
  ));
}

export default function Products() {
  const { t } = useTranslation();
  const { language }        = useSelector((s) => s.ui);
  const { slug: categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1, page: 1 });
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [activeSize,  setActiveSize]  = useState('');
  const [navMeta,     setNavMeta]     = useState(null);
  const [priceInputs, setPriceInputs] = useState({
    min: searchParams.get('minPrice') || '',
    max: searchParams.get('maxPrice') || '',
  });
  const filtersScrollRef = useRef(null);
  const filterScrollLockRef = useRef(null);
  const [isMobileFilters, setIsMobileFilters] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileFilters(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const lockFilterScroll = () => {
    const el = filtersScrollRef.current;
    if (!el) return;
    filterScrollLockRef.current = el.scrollTop;
  };

  const restoreFilterScroll = () => {
    const el = filtersScrollRef.current;
    const locked = filterScrollLockRef.current;
    if (!el || locked == null) return;
    el.scrollTop = locked;
  };

  const handlePriceFocus = () => {
    if (!isMobileFilters) return;
    lockFilterScroll();
  };

  const handlePriceChange = (field, raw) => {
    const value = raw.replace(/[^\d.]/g, '');
    if (isMobileFilters) {
      setPriceInputs((prev) => ({ ...prev, [field]: value }));
      requestAnimationFrame(restoreFilterScroll);
      return;
    }
    setFilter(field === 'min' ? 'minPrice' : 'maxPrice', value);
  };

  const commitPriceFilters = (e) => {
    if (!isMobileFilters) return;
    const next = e?.relatedTarget;
    if (next?.classList?.contains('products-price-input')) return;

    filterScrollLockRef.current = null;

    const urlMin = searchParams.get('minPrice') || '';
    const urlMax = searchParams.get('maxPrice') || '';
    if (priceInputs.min === urlMin && priceInputs.max === urlMax) return;

    const p = new URLSearchParams(searchParams);
    if (priceInputs.min) p.set('minPrice', priceInputs.min); else p.delete('minPrice');
    if (priceInputs.max) p.set('maxPrice', priceInputs.max); else p.delete('maxPrice');
    p.set('page', '1');
    setSearchParams(p);
  };

  useBodyScrollLock(filterOpen && isMobileFilters);

  const handleFilterDrawerTransitionEnd = useCallback((e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
  }, []);

  /* Mobile only: lock drawer scroll while typing in price fields */
  useEffect(() => {
    if (!filterOpen || !isMobileFilters) return undefined;
    const el = filtersScrollRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      if (!document.activeElement?.classList?.contains('products-price-input')) return;
      restoreFilterScroll();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [filterOpen, isMobileFilters]);

  const filters = {
    category:    searchParams.get('category')    || '',
    subcategory: searchParams.get('subcategory') || '',
    search:      searchParams.get('search')      || '',
    gender:      searchParams.get('gender')      || '',
    minPrice:    searchParams.get('minPrice')    || '',
    maxPrice:    searchParams.get('maxPrice')    || '',
    sort:        searchParams.get('sort')        || 'newest',
    page:        parseInt(searchParams.get('page') || '1'),
    new_arrivals:searchParams.get('new_arrivals')|| '',
    best_sellers:searchParams.get('best_sellers')|| '',
    on_sale:     searchParams.get('on_sale')     || '',
    nav:         searchParams.get('nav')         || '',
  };

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key === 'gender' && value) {
      p.delete('category');
      p.delete('subcategory');
    }
    if (key === 'category') {
      p.delete('gender');
      if (!value) p.delete('subcategory');
    }
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const clearFilters = () => setSearchParams({});

  /* Mobile only: keep local price inputs in sync with URL when not focused */
  useEffect(() => {
    if (!isMobileFilters) return;
    if (document.activeElement?.classList?.contains('products-price-input')) return;
    const urlMin = searchParams.get('minPrice') || '';
    const urlMax = searchParams.get('maxPrice') || '';
    setPriceInputs((prev) =>
      prev.min === urlMin && prev.max === urlMax ? prev : { min: urlMin, max: urlMax }
    );
  }, [searchParams, isMobileFilters]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      params.set('limit', '12');
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data      || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1 });
      setNavMeta(data.nav_link || null);
    } catch {}
    setLoading(false);
  }, [searchParams.toString()]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data || [])).catch(() => {});
  }, []);

  /* /category/:slug → category id filter (e.g. /category/womens-clothing) */
  useEffect(() => {
    if (!categorySlug || categories.length === 0) return;
    const cat = categories.find((c) => c.slug === categorySlug);
    if (!cat) return;
    if (searchParams.get('category') === String(cat.id)) return;
    const p = new URLSearchParams(searchParams);
    p.set('category', String(cat.id));
    p.delete('gender');
    setSearchParams(p, { replace: true });
  }, [categorySlug, categories, searchParams, setSearchParams]);

  useEffect(() => {
    if (!filters.search?.trim()) return;
    trackStoreEvent('search', {
      path: '/products',
      metadata: { query: filters.search.trim(), results: products.length },
    });
  }, [filters.search, products.length]);

  /* Page title */
  const pageTitle = filters.search
    ? `Search: "${filters.search}"`
    : navMeta
      ? (language === 'ar' ? (navMeta.label_ar || navMeta.label_en) : navMeta.label_en).toUpperCase()
    : filters.on_sale     ? 'SALE'
    : filters.new_arrivals? 'NEW ARRIVALS'
    : filters.gender === 'men'   ? 'MEN'
    : filters.gender === 'women' ? 'WOMEN'
    : 'ALL PRODUCTS';

  const hasFilters = !!(filters.category || filters.subcategory || filters.search ||
    filters.gender || filters.minPrice || filters.maxPrice ||
    filters.new_arrivals || filters.best_sellers || filters.on_sale || filters.nav);

  const womenCategory = findCategoryBySlug(categories, 'womens-clothing');
  const womenCategoryActive = isCategoryActive(womenCategory);
  const selectedCategory = filters.category
    ? categories.find((c) => String(c.id) === String(filters.category))
    : null;
  const inactiveCategory = selectedCategory && !isCategoryActive(selectedCategory)
    ? selectedCategory
    : null;
  const showComingSoon = (filters.gender === 'women' && !womenCategoryActive)
    || !!inactiveCategory;
  const comingSoonDate = getCategoryComingSoonLabel(
    inactiveCategory || womenCategory,
    language,
  );

  return (
    <>
      <Helmet>
        <title>{pageTitle} — Theboutiqueline</title>
      </Helmet>

      <div className="page-top-margin min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        {/* ── Page header bar ── */}
        <div style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom py-8 md:py-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 mb-3">
                  <Link to="/" className="font-mono text-foreground-dim hover:text-foreground text-[10px] uppercase tracking-widest transition-colors" style={{ letterSpacing: '0.12em' }}>Home</Link>
                  <span className="text-foreground-dim text-[10px]">/</span>
                  <span className="font-mono text-foreground-muted text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>{pageTitle}</span>
                </nav>
                <h1
                  className="section-title"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                >
                  {pageTitle}
                </h1>
                {pagination.total > 0 && (
                  <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.12em' }}>
                    {pagination.total} products
                  </p>
                )}
              </div>

              {/* Gender quick tabs */}
              <div className="products-header-filters hidden md:flex gap-0">
                {['', 'men', 'women'].map((g) => (
                  <button
                    key={g || 'all'}
                    onClick={() => setFilter('gender', g)}
                    className="products-filter-control font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2 transition-all duration-200 inline-flex items-center gap-1.5"
                    style={{
                      letterSpacing:   '0.15em',
                      backgroundColor: filters.gender === g ? 'var(--color-accent)' : 'transparent',
                      color:           filters.gender === g ? 'var(--color-on-accent)' : 'var(--color-text)',
                      border:          '1px solid',
                      borderColor:     filters.gender === g ? 'var(--color-accent)' : 'var(--color-border)',
                    }}
                  >
                    {g === '' ? 'ALL' : g.toUpperCase()}
                    {g === 'women' && !womenCategoryActive && (
                      <span className="normal-case opacity-80 tracking-normal">{t('nav_soon')}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="container-custom py-8 md:py-12">
          <div className="flex gap-8 relative">

            {/* ── Sidebar ── */}
            <AnimatePresence>
              {(filterOpen || true) && (
                <motion.aside
                  initial={false}
                  onTransitionEnd={handleFilterDrawerTransitionEnd}
                  className={`
                    fixed lg:relative inset-y-0 left-0 lg:inset-auto z-[50] lg:z-auto
                    w-[min(100%,20rem)] lg:w-56 xl:w-60 flex-shrink-0
                    flex flex-col transition-all duration-300 overscroll-contain
                    ${filterOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0'}
                  `}
                  style={{ backgroundColor: 'var(--color-bg)' }}
                >
                  {/* Mobile drawer header — always visible, does not scroll */}
                  <div
                    className="lg:hidden flex-shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="font-mono font-bold uppercase text-foreground text-sm tracking-widest" style={{ letterSpacing: '0.15em' }}>
                      FILTERS
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      aria-label="Close filters"
                      className="flex items-center gap-2 font-mono font-bold uppercase text-xs tracking-widest border border-line px-3 py-2 text-foreground-muted hover:text-foreground hover:border-foreground/40 transition-colors"
                      style={{ letterSpacing: '0.12em' }}
                    >
                      <X size={16} strokeWidth={2} />
                      CLOSE
                    </button>
                  </div>

                  <div
                    ref={filtersScrollRef}
                    className="products-filters flex-1 min-h-0 overflow-y-auto overscroll-contain py-6 px-5 lg:px-0 lg:sticky lg:h-auto lg:max-h-[calc(100vh-var(--site-header-height)-2rem)] lg:top-[calc(var(--site-header-height)+1.5rem)]"
                    style={{ borderRight: '1px solid var(--color-border)' }}
                  >
                    {/* Clear */}
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="filter-clear-btn block font-mono font-bold uppercase tracking-widest mb-6 transition-colors"
                        style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}
                      >
                        ✕ CLEAR ALL
                      </button>
                    )}

                    {/* Category */}
                    <div className="mb-7">
                      <FilterLabel>Category</FilterLabel>
                      <div className="space-y-0.5">
                        <button
                          onClick={() => setFilter('category', '')}
                          className="products-filter-control block w-full text-left font-mono font-bold uppercase tracking-widest py-2.5 px-3.5 transition-all duration-150"
                          style={{
                            letterSpacing: '0.1em',
                            backgroundColor: !filters.category ? 'var(--color-accent-dim)' : 'transparent',
                            color: !filters.category ? 'var(--color-accent)' : 'var(--color-text)',
                            borderLeft: !filters.category ? '2px solid #eb301e' : '2px solid transparent',
                          }}
                        >
                          ALL
                        </button>
                            {categories.filter((cat) => cat.is_active !== false && cat.is_active !== 0).map((cat) => (
                          <div key={cat.id}>
                            <button
                              onClick={() => setFilter('category', cat.id)}
                              className="products-filter-control block w-full text-left font-mono font-bold uppercase tracking-widest py-2.5 px-3.5 transition-all duration-150"
                              style={{
                                letterSpacing: '0.1em',
                                backgroundColor: filters.category == cat.id ? 'var(--color-accent-dim)' : 'transparent',
                                color: filters.category == cat.id ? 'var(--color-accent)' : 'var(--color-text)',
                                borderLeft: filters.category == cat.id ? '2px solid #eb301e' : '2px solid transparent',
                              }}
                            >
                              {getCategoryName(cat, language)}
                            </button>
                            {filters.category == cat.id && (
                              <SubcategoryFilters
                                nodes={cat.subcategories}
                                depth={0}
                                filters={filters}
                                setFilter={setFilter}
                                language={language}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="mb-7">
                      <FilterLabel>Gender</FilterLabel>
                      <div className="flex gap-2 flex-wrap">
                        {['', 'men', 'women'].map((g) => (
                          <button
                            key={g || 'all'}
                            onClick={() => setFilter('gender', g)}
                            className="products-filter-control font-mono font-bold uppercase tracking-widest px-4 py-2 transition-all duration-150 border inline-flex items-center gap-1.5"
                            style={{
                              letterSpacing:   '0.12em',
                              backgroundColor: filters.gender === g ? '#eb301e' : 'transparent',
                              borderColor:     filters.gender === g ? '#eb301e' : 'var(--color-border)',
                              color:           filters.gender === g ? 'var(--color-on-accent)' : 'var(--color-text)',
                            }}
                          >
                            {g === '' ? 'ALL' : g.toUpperCase()}
                            {g === 'women' && !womenCategoryActive && (
                              <span className="normal-case opacity-80 tracking-normal">{t('nav_soon')}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-7">
                      <FilterLabel>Price (EGP)</FilterLabel>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          autoComplete="off"
                          placeholder="MIN"
                          value={isMobileFilters ? priceInputs.min : filters.minPrice}
                          onFocus={handlePriceFocus}
                          onBlur={isMobileFilters ? commitPriceFilters : undefined}
                          onChange={(e) => handlePriceChange('min', e.target.value)}
                          style={isMobileFilters ? { fontSize: 16 } : undefined}
                          className="products-filter-control products-price-input input-boutique font-bold py-2.5 w-1/2"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          autoComplete="off"
                          placeholder="MAX"
                          value={isMobileFilters ? priceInputs.max : filters.maxPrice}
                          onFocus={handlePriceFocus}
                          onBlur={isMobileFilters ? commitPriceFilters : undefined}
                          onChange={(e) => handlePriceChange('max', e.target.value)}
                          style={isMobileFilters ? { fontSize: 16 } : undefined}
                          className="products-filter-control products-price-input input-boutique font-bold py-2.5 w-1/2"
                        />
                      </div>
                    </div>

                    {/* Size */}
                    <div className="mb-7">
                      <FilterLabel>Size</FilterLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setActiveSize(activeSize === s ? '' : s)}
                            className="products-filter-control font-mono font-bold uppercase tracking-widest px-3 py-2 border transition-all duration-150 min-w-[2.5rem]"
                            style={{
                              letterSpacing: '0.1em',
                              backgroundColor: activeSize === s ? '#eb301e' : 'transparent',
                              borderColor:     activeSize === s ? '#eb301e' : 'var(--color-border)',
                              color:           activeSize === s ? 'var(--color-on-accent)' : 'var(--color-text)',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick filters */}
                    <div>
                      <FilterLabel>Quick Filter</FilterLabel>
                      <div className="space-y-2">
                        {[
                          { key: 'new_arrivals', label: 'NEW ARRIVALS' },
                          { key: 'best_sellers', label: 'BEST SELLERS' },
                          { key: 'on_sale',      label: 'ON SALE' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-3 cursor-pointer group">
                            <span
                              className="filter-checkbox border flex items-center justify-center flex-shrink-0 transition-all duration-150"
                              style={{
                                borderColor:     filters[key] === 'true' ? '#eb301e' : 'var(--color-border)',
                                backgroundColor: filters[key] === 'true' ? '#eb301e' : 'transparent',
                              }}
                            >
                              {filters[key] === 'true' && (
                                <span className="filter-checkbox-tick text-white leading-none">✓</span>
                              )}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={filters[key] === 'true'}
                              onChange={(e) => setFilter(key, e.target.checked ? 'true' : '')}
                            />
                            <span
                              className="filter-option-label products-filter-control font-mono font-bold uppercase tracking-widest transition-colors group-hover:text-foreground"
                              style={{ letterSpacing: '0.1em', color: filters[key] === 'true' ? 'var(--color-accent)' : 'var(--color-text)' }}
                            >
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Overlay for mobile filter ── */}
            {filterOpen && (
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="fixed inset-0 bg-black/70 z-[45] lg:hidden touch-none overscroll-none border-0 p-0 cursor-default"
                aria-label="Close filters"
              />
            )}

            {/* ── Products area ── */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              <div className="products-toolbar flex items-center mb-6 gap-2 lg:gap-4 flex-nowrap lg:justify-end">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="products-filter-control lg:hidden flex items-center justify-center gap-2 border border-line text-foreground font-mono font-bold uppercase text-[10px] tracking-widest px-3 py-2.5 transition-colors flex-shrink-0"
                  style={{ letterSpacing: '0.12em', color: 'var(--color-text)' }}
                >
                  <SlidersHorizontal size={14} /> FILTER
                </button>

                <select
                  value={filters.sort}
                  onChange={(e) => setFilter('sort', e.target.value)}
                  className="products-filter-control select-boutique-chevron font-mono font-bold uppercase text-[10px] tracking-widest bg-transparent border border-line px-3 py-2.5 transition-colors focus:outline-none focus:border-foreground/30 appearance-none pr-8 flex-1 min-w-0 lg:flex-none"
                  style={{ letterSpacing: '0.1em', color: 'var(--color-text)' }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', fontWeight: 700 }}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="products-filter-control font-mono font-bold uppercase text-[10px] tracking-widest transition-colors whitespace-nowrap flex-shrink-0 py-2.5"
                    style={{ color: 'var(--color-accent)', letterSpacing: '0.12em' }}
                  >
                    ✕ CLEAR ALL
                  </button>
                )}
              </div>

              {/* Results */}
              {loading ? (
                <SkeletonGrid count={12} />
              ) : showComingSoon ? (
                <CategorySoonMessage
                  dateLabel={comingSoonDate}
                  subtitle={t('category_coming_soon')}
                />
              ) : products.length === 0 ? (
                <div className="text-center py-24">
                  <p className="font-mono uppercase text-foreground-dim text-xs tracking-widest mb-4" style={{ letterSpacing: '0.15em' }}>NO PRODUCTS FOUND</p>
                  <button
                    onClick={clearFilters}
                    className="font-mono uppercase text-[10px] tracking-widest text-foreground border border-line px-6 py-3 hover:border-foreground/40 transition-colors"
                    style={{ letterSpacing: '0.15em' }}
                  >
                    CLEAR FILTERS
                  </button>
                </div>
              ) : (
                <>
                  <div className="product-card-grid">
                    {products.map((p, i) => (
                      <motion.div
                        key={p.id}
                        className="h-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.04, ease: 'easeOut' }}
                      >
                        <ProductCard product={p} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-1 mt-12">
                      <button
                        onClick={() => setFilter('page', filters.page - 1)}
                        disabled={filters.page === 1}
                        className="font-mono uppercase text-[10px] tracking-widest border border-line text-foreground-muted hover:text-foreground hover:border-foreground/30 disabled:opacity-30 px-4 py-2.5 transition-colors"
                        style={{ letterSpacing: '0.12em' }}
                      >
                        ←
                      </button>
                      {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setFilter('page', p)}
                          className="font-mono font-bold text-[11px] w-10 h-10 border transition-all duration-150"
                          style={{
                            borderColor:     filters.page === p ? '#eb301e' : 'var(--color-border)',
                            backgroundColor: filters.page === p ? '#eb301e' : 'transparent',
                            color:           filters.page === p ? '#fff'    : 'var(--color-text-muted)',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setFilter('page', filters.page + 1)}
                        disabled={filters.page === pagination.pages}
                        className="font-mono uppercase text-[10px] tracking-widest border border-line text-foreground-muted hover:text-foreground hover:border-foreground/30 disabled:opacity-30 px-4 py-2.5 transition-colors"
                        style={{ letterSpacing: '0.12em' }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
