import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../common/BrandLogo';
import { COMPANY } from '../../constants/brand';

/* ── Simple icon components ── */
const IgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

export default function Footer() {
  const { t } = useTranslation();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const shopLinks = [
    { to: '/products', label: t('footer_all_products') },
    { to: '/products?gender=men', label: t('footer_men') },
    { to: '/products?gender=women', label: t('footer_women') },
    { to: '/products?new_arrivals=true', label: t('new_arrivals') },
    { to: '/products?on_sale=true', label: t('offers') },
  ];

  const infoLinks = [
    { to: '/about', label: t('footer_about_us') },
    { to: '/orders', label: t('footer_my_orders') },
    { to: '/wishlist', label: t('wishlist') },
    { to: '/privacy', label: t('privacy') },
    { to: '/terms', label: t('terms') },
  ];

  return (
    <footer className="bg-theme border-t border-line">

      <div className="bg-surface-card border-b border-line">
        <div className="container-custom py-10 md:py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-foreground-dim font-mono uppercase text-[10px] tracking-widest mb-2" style={{ letterSpacing: '0.15em' }}>
                {t('footer_newsletter')}
              </p>
              <h3 className="text-foreground font-serif text-xl md:text-2xl italic font-bold">
                {t('footer_loop')}
              </h3>
              <p className="text-foreground-muted font-mono text-xs mt-1 uppercase tracking-widest">
                {t('footer_loop_sub')}
              </p>
            </div>

            {subscribed ? (
              <p className="text-boutique font-mono uppercase text-xs tracking-widest" style={{ letterSpacing: '0.15em' }}>
                {t('footer_subscribed')}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-0 w-full md:w-auto md:min-w-[420px]">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer_email_placeholder')}
                  required
                  className="input-boutique flex-1 border-r-0"
                  style={{ minWidth: 0 }}
                  dir={ar ? 'rtl' : 'ltr'}
                />
                <button
                  type="submit"
                  className="px-6 py-3 font-mono uppercase text-xs tracking-widest text-white transition-all duration-200 whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: '#eb301e', letterSpacing: '0.15em' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {t('subscribe')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="container-custom py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          <div className="lg:col-span-1">
            <BrandLogo variant="footer" linkTo="/" className="mb-5 block" />
            <p className="text-foreground-muted font-mono text-xs uppercase leading-relaxed mt-4" style={{ letterSpacing: '0.08em', maxWidth: 240 }}>
              {t('footer_tagline')}
            </p>

            <div className="flex items-center gap-4 mt-6">
              <a href={COMPANY.social.instagram} target="_blank" rel="noopener noreferrer" className="text-foreground-dim hover:text-foreground transition-colors" aria-label="Instagram">
                <IgIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-mono uppercase text-[10px] tracking-widest mb-5" style={{ letterSpacing: '0.15em', color: 'var(--color-accent)' }}>{t('footer_shop')}</h4>
            <ul className="space-y-3">
              {shopLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="font-mono text-foreground-muted hover:text-foreground uppercase text-xs tracking-widest transition-colors" style={{ letterSpacing: '0.1em' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono uppercase text-[10px] tracking-widest mb-5" style={{ letterSpacing: '0.15em', color: 'var(--color-accent)' }}>{t('footer_info')}</h4>
            <ul className="space-y-3">
              {infoLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="font-mono text-foreground-muted hover:text-foreground uppercase text-xs tracking-widest transition-colors" style={{ letterSpacing: '0.1em' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono uppercase text-[10px] tracking-widest mb-5" style={{ letterSpacing: '0.15em', color: 'var(--color-accent)' }}>{t('footer_contact')}</h4>
            <div className="space-y-3">
              <a href={`mailto:${COMPANY.email}`} className="block font-mono text-foreground-muted hover:text-foreground uppercase text-xs tracking-widest transition-colors" style={{ letterSpacing: '0.08em' }}>
                {COMPANY.email}
              </a>
              {COMPANY.phones.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} className="block font-mono text-foreground-muted hover:text-foreground uppercase text-xs tracking-widest transition-colors" style={{ letterSpacing: '0.08em' }}>
                  {p.display}
                </a>
              ))}
              <p className="font-mono text-foreground-dim text-xs uppercase" style={{ letterSpacing: '0.08em' }}>
                {(ar ? COMPANY.addressAr : COMPANY.addressEn).join(', ')}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-6">
              {[
                { href: COMPANY.social.instagram, label: t('social_instagram') },
              ].map(({ href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-foreground-dim hover:text-foreground uppercase text-[10px] tracking-widest transition-colors" style={{ letterSpacing: '0.15em' }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-foreground-dim text-[10px] uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
            © {new Date().getFullYear()} {t('brand')}. {t('footer_rights')}
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="font-mono text-foreground-dim hover:text-foreground-muted text-[10px] uppercase tracking-widest transition-colors" style={{ letterSpacing: '0.12em' }}>{t('footer_privacy_short')}</Link>
            <Link to="/terms" className="font-mono text-foreground-dim hover:text-foreground-muted text-[10px] uppercase tracking-widest transition-colors" style={{ letterSpacing: '0.12em' }}>{t('footer_terms_short')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
