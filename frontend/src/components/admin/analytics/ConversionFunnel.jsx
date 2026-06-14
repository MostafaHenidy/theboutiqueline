import TrendBadge from './TrendBadge';

const STEPS = [
  { key: 'sessions', labelEn: 'Sessions', labelAr: 'الجلسات' },
  { key: 'addToCart', labelEn: 'Added to cart', labelAr: 'أضيف للسلة' },
  { key: 'beginCheckout', labelEn: 'Reached checkout', labelAr: 'وصل للدفع' },
  { key: 'purchase', labelEn: 'Completed checkout', labelAr: 'أكمل الشراء' },
];

export default function ConversionFunnel({ funnel, ar }) {
  if (!funnel) return null;
  const maxPct = 100;
  return (
    <div className="space-y-3">
      {STEPS.map(({ key, labelEn, labelAr }) => {
        const step = funnel[key];
        if (!step) return null;
        const width = Math.max(8, (step.pct / maxPct) * 100);
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">{ar ? labelAr : labelEn}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-800 font-semibold">{step.count}</span>
                <span className="text-gray-400">{step.pct}%</span>
                <TrendBadge change={step.change} />
              </div>
            </div>
            <div className="h-7 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-blue-500 rounded" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
