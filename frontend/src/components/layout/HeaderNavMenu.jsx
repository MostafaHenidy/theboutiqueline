import { useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import NavLinkItem from './NavLinkItem';
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside';

const HIDDEN_SLUGS = new Set(['browse', 'all', 'apparel', 'sneakers', 'collectibles', 'trading-cards', 'about']);
const isLinkActive = (link) => link.is_active !== false && link.is_active !== 0 && link.is_active !== '0';

export default function HeaderNavMenu({ navLinks, language, onNavigate, variant = 'desktop' }) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const moreTimer = useRef(null);
  const soonLabel = t('nav_soon');

  const closeMoreNow = useCallback(() => setMoreOpen(false), []);
  useDismissOnOutside(moreMenuRef, closeMoreNow, moreOpen);

  const label = (link) => (language === 'ar' ? (link.label_ar || link.label_en) : link.label_en);

  const { activeLinks, disabledLinks, moreLink } = useMemo(() => {
    const active = [];
    const disabled = [];
    let more = null;

    for (const link of navLinks) {
      if (HIDDEN_SLUGS.has(link.slug)) continue;
      if (link.slug === 'more') {
        more = link;
        continue;
      }
      if (isLinkActive(link)) active.push(link);
      else disabled.push(link);
    }

    return { activeLinks: active, disabledLinks: disabled, moreLink: more };
  }, [navLinks]);

  const moreLabel = moreLink ? label(moreLink) : 'MORE';
  const showMoreDropdown = disabledLinks.length > 0;

  const openMore = () => {
    clearTimeout(moreTimer.current);
    setMoreOpen(true);
  };

  const scheduleCloseMore = () => {
    moreTimer.current = setTimeout(() => setMoreOpen(false), 120);
  };

  if (variant === 'mobile') {
    return (
      <div className="space-y-1">
        {activeLinks.map((link) => (
          <div key={link.id} className="site-header-aside-nav__item">
            <NavLinkItem link={link} label={label(link)} onNavigate={onNavigate} className="block whitespace-normal break-words" />
          </div>
        ))}

        {disabledLinks.map((link) => (
          <div key={link.id} className="site-header-aside-nav__item">
            <NavLinkItem
              link={link}
              label={label(link)}
              soonLabel={soonLabel}
              onNavigate={onNavigate}
              className="block whitespace-normal break-words"
              showDisabled
            />
          </div>
        ))}

        {moreLink && isLinkActive(moreLink) && !showMoreDropdown && (
          <div className="site-header-aside-nav__item">
            <NavLinkItem link={moreLink} label={moreLabel} onNavigate={onNavigate} className="block whitespace-normal break-words" />
          </div>
        )}
      </div>
    );
  }

  return (
    <nav
      className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2"
      aria-label="Browse navigation"
    >
      <div className="flex items-center gap-3 xl:gap-4 min-w-0 overflow-x-auto site-header-nav-strip hide-scrollbar">
        {activeLinks.map((link) => (
          <NavLinkItem
            key={link.id}
            link={link}
            label={label(link)}
            onNavigate={onNavigate}
            className="flex-shrink-0 whitespace-nowrap text-[0.7rem] xl:text-[0.75rem]"
          />
        ))}
      </div>

      {showMoreDropdown && (
        <div
          ref={moreMenuRef}
          className="relative flex-shrink-0"
          onMouseEnter={openMore}
          onMouseLeave={scheduleCloseMore}
        >
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className="site-header-nav-link flex items-center gap-1 text-foreground-muted hover:text-foreground uppercase transition-colors text-[0.7rem] xl:text-[0.75rem]"
            aria-expanded={moreOpen}
            aria-haspopup="true"
          >
            {moreLabel}
            <ChevronDown size={14} className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full end-0 mt-1 bg-surface-card border border-line min-w-[220px] py-2 shadow-lg z-[200]"
                onMouseEnter={openMore}
                onMouseLeave={scheduleCloseMore}
              >
                {disabledLinks.map((link) => (
                  <div key={link.id} className="px-5 py-2.5">
                    <NavLinkItem
                      link={link}
                      label={label(link)}
                      soonLabel={soonLabel}
                      onNavigate={() => { onNavigate?.(); setMoreOpen(false); }}
                      className="block"
                      showDisabled
                    />
                  </div>
                ))}
                {moreLink && isLinkActive(moreLink) && (
                  <div className="border-t border-line mt-1 pt-1 px-5 py-2.5">
                    <NavLinkItem
                      link={moreLink}
                      label={moreLabel}
                      onNavigate={() => { onNavigate?.(); setMoreOpen(false); }}
                      className="block"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!showMoreDropdown && moreLink && isLinkActive(moreLink) && (
        <NavLinkItem
          link={moreLink}
          label={moreLabel}
          onNavigate={onNavigate}
          className="flex-shrink-0 whitespace-nowrap text-[0.7rem] xl:text-[0.75rem]"
        />
      )}
    </nav>
  );
}
