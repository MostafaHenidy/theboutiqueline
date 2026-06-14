import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Heart } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import { fetchWishlist } from '../store/slices/wishlistSlice';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const { items, loading } = useSelector((s) => s.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const pageTitle = t('wishlist').toUpperCase();

  return (
    <>
      <Helmet><title>{`${t('wishlist')} | ${t('brand')}`}</title></Helmet>
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
            {items.length > 0 && (
              <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest mt-1" style={{ letterSpacing: '0.12em' }}>
                {items.length} {language === 'ar' ? 'منتجات' : 'items'}
              </p>
            )}
          </div>
        </div>

        <div className="container-custom py-10">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <Heart size={64} strokeWidth={1} className="mx-auto text-foreground-dim mb-5 opacity-40" />
              <p className="font-mono text-foreground-muted uppercase text-sm tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {t('empty_wishlist')}
              </p>
              <Link to="/products" className="btn-accent-solid inline-flex mt-6 px-8 py-3 text-[11px]">
                {language === 'ar' ? 'استعرضي المنتجات' : 'Browse Products'}
              </Link>
            </div>
          ) : (
            <div className="product-card-grid">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div key={item.id ?? product.id} className="h-full">
                    <ProductCard product={product} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
