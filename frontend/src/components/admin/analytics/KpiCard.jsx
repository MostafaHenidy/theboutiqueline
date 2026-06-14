import TrendBadge from './TrendBadge';

export function formatEgp(value, compact = false) {
  const n = Number(value) || 0;
  if (compact && Math.abs(n) >= 1000) {
    return `${(n / 1000).toFixed(1)}K EGP`;
  }
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

export default function KpiCard({ label, value, change, isCurrency, isPercent, sparkline }) {
  let display = value;
  if (isCurrency) display = formatEgp(value, true);
  else if (isPercent) display = `${value}%`;
  else display = Number(value).toLocaleString();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-0">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-bold text-gray-800 truncate">{display}</p>
        <TrendBadge change={change} />
      </div>
      {sparkline?.length > 0 && (
        <div className="flex items-end gap-0.5 h-8 mt-3">
          {sparkline.map((v, i) => {
            const max = Math.max(...sparkline, 1);
            const h = Math.max(4, (v / max) * 100);
            return (
              <div
                key={i}
                className="flex-1 bg-blue-200 rounded-sm"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
