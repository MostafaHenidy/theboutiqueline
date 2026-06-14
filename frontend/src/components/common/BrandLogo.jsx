import { Link } from 'react-router-dom';

/**
 * Theboutiqueline brand logo.
 * variant: 'header' | 'footer' | 'hero' | 'admin' | 'adminCompact' | 'auth' | 'loader'
 */
export default function BrandLogo({
  variant   = 'header',
  className = '',
  linkTo    = '/',
  withLink  = true,
  onClick,
}) {
  /* ── Heights per context ── */
  const imgHeights = {
    header:       'h-10 sm:h-11 lg:h-12 xl:h-14', /* 40–56 px */
    footer:       'h-20 md:h-24',   /* 80–96 px */
    hero:         'h-24 md:h-32',   /* 96–128 px */
    admin:        'h-10',            /* sidebar expanded */
    adminCompact: 'h-9',             /* sidebar collapsed */
    auth:         'h-20',
    loader:       'h-16',
  };

  /* ── Real logo image ── */
  const imgEl = (
    <img
      src="/logo-circle.png"
      alt="The Boutique Line"
      className={`
        ${imgHeights[variant] || imgHeights.header}
        w-auto object-contain select-none
        transition-transform duration-300 hover:scale-105
        ${className}
      `}
      draggable={false}
    />
  );

  if (!withLink || !linkTo) {
    return <span className="inline-flex items-center">{imgEl}</span>;
  }

  return (
    <Link
      to={linkTo}
      onClick={onClick}
      className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-boutique/60"
      aria-label="The Boutique Line — home"
    >
      {imgEl}
    </Link>
  );
}
