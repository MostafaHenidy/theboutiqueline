import TrendBadge from './TrendBadge';
import { formatEgp } from './KpiCard';

export default function HorizontalBarList({ items, valueKey = 'revenue', labelKey = 'name', formatValue, maxItems = 10 }) {
  const list = (items || []).slice(0, maxItems);
  if (!list.length) return null;
  const max = Math.max(...list.map((i) => Number(i[valueKey]) || 0), 1);

  return (
    <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      {list.map((item, idx) => {
        const val = Number(item[valueKey]) || 0;
        const pct = (val / max) * 100;
        const label = item[labelKey] || item.label || '—';
        const formatted = formatValue ? formatValue(val, item) : formatEgp(val);
        return (
          <li key={item.productId || item.channel || item.label || idx}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-gray-700 truncate flex-1" title={label}>{label}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-800">{formatted}</span>
                {item.change != null && <TrendBadge change={item.change} />}
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
