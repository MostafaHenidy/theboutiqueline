import TrendBadge from './TrendBadge';
import { formatEgp } from './KpiCard';

const ROWS = [
  { key: 'gross', labelEn: 'Gross sales', labelAr: 'إجمالي المبيعات' },
  { key: 'discounts', labelEn: 'Discounts', labelAr: 'الخصومات', negate: true },
  { key: 'returns', labelEn: 'Returns', labelAr: 'المرتجعات', negate: true },
  { key: 'net', labelEn: 'Net sales', labelAr: 'صافي المبيعات' },
  { key: 'shipping', labelEn: 'Shipping charges', labelAr: 'رسوم الشحن', negate: true },
  { key: 'taxes', labelEn: 'Taxes', labelAr: 'الضرائب' },
  { key: 'total', labelEn: 'Total sales', labelAr: 'إجمالي المبيعات', bold: true },
];

export default function SalesBreakdownList({ current, compare, ar }) {
  if (!current) return null;
  return (
    <ul className="space-y-3">
      {ROWS.map(({ key, labelEn, labelAr, negate, bold }) => {
        const val = Number(current[key]) || 0;
        const prev = Number(compare?.[key]) || 0;
        const display = negate && val > 0 ? `-${formatEgp(val)}` : formatEgp(val);
        return (
          <li key={key} className={`flex items-center justify-between gap-2 ${bold ? 'pt-2 border-t border-gray-100 font-bold' : ''}`}>
            <span className="text-sm text-gray-600">{ar ? labelAr : labelEn}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${bold ? 'text-gray-900' : 'text-gray-800'}`}>{display}</span>
              <TrendBadge change={prev === 0 && val === 0 ? 0 : Math.round(((val - prev) / (prev || 1)) * 1000) / 10} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
