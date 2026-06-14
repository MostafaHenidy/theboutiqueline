function SkeletonCard() {
  return (
    <div className="product-card-boutique h-full">
      <div
        className="product-card-boutique__media"
        style={{
          background: 'linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite linear',
        }}
      >
        <div className="product-card-boutique__info-stack">
          <div className="product-card-boutique__body product-card-boutique__body--skeleton">
            <div style={{ height: 10, width: '70%', backgroundColor: 'var(--color-bg-surface)', borderRadius: 2 }} />
            <div style={{ height: 10, width: '45%', backgroundColor: 'var(--color-bg-surface)', borderRadius: 2, marginTop: 6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-card-grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
