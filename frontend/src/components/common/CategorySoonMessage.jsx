export default function CategorySoonMessage({ dateLabel, subtitle, className = '', style = {} }) {
  return (
    <div className={`text-center py-16 md:py-24 ${className}`.trim()} style={style}>
      {dateLabel ? (
        <p className="category-soon-label text-3xl md:text-4xl lg:text-5xl text-foreground-muted">
          {dateLabel}
        </p>
      ) : null}
      {subtitle ? (
        <p
          className="font-mono font-bold uppercase text-foreground-dim text-xs sm:text-sm md:text-base tracking-widest mt-4"
          style={{ letterSpacing: '0.15em' }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
