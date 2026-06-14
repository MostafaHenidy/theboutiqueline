import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TrendBadge({ change, ar }) {
  const n = Number(change);
  if (!Number.isFinite(n) || n === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus size={12} /> 0%
      </span>
    );
  }
  const up = n > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(n)}%
    </span>
  );
}
