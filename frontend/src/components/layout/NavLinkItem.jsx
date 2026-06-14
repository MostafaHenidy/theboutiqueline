import { Link } from 'react-router-dom';

export default function NavLinkItem({ link, label, onNavigate, className = '', showDisabled = true, soonLabel = '(soon)' }) {
  const disabled = link.is_active === false || link.is_active === 0 || link.is_active === '0';
  const baseClass = `site-header-nav-link whitespace-nowrap uppercase transition-colors ${className}`;

  if (disabled) {
    if (!showDisabled) return null;
    return (
      <span
        className={`${baseClass} flex w-full items-center justify-between gap-3 text-foreground-dim cursor-not-allowed`}
        aria-disabled="true"
      >
        <span className="line-through decoration-foreground-dim">{label}</span>
        <span className="flex-shrink-0 text-[0.85em] tracking-widest normal-case opacity-80">{soonLabel}</span>
      </span>
    );
  }

  const isExternal = link.href?.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} text-foreground-muted hover:text-foreground`}
        onClick={onNavigate}
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      to={link.href}
      onClick={onNavigate}
      className={`${baseClass} text-foreground-muted hover:text-foreground`}
    >
      {label}
    </Link>
  );
}
