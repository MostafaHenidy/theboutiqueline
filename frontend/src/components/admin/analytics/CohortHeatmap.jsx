export default function CohortHeatmap({ cohorts, ar }) {
  if (!cohorts?.length) return null;
  const monthCols = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[480px]">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left py-2 pr-3 font-semibold">{ar ? 'الفوج' : 'Cohort'}</th>
            <th className="text-right py-2 px-2 font-semibold">{ar ? 'العملاء' : 'Customers'}</th>
            {monthCols.map((m) => (
              <th key={m} className="text-center py-2 px-1 font-semibold">{ar ? `شهر ${m}` : `Mo ${m}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((row) => (
            <tr key={row.cohort} className="border-t border-gray-50">
              <td className="py-2 pr-3 text-gray-700 font-medium">{row.cohort}</td>
              <td className="py-2 px-2 text-right text-gray-600">{row.customers}</td>
              {monthCols.map((m) => {
                const cell = row.months?.[m];
                const pct = cell?.pct ?? 0;
                const intensity = Math.min(1, pct / 100);
                const bg = `rgba(37, 99, 235, ${0.08 + intensity * 0.72})`;
                return (
                  <td key={m} className="py-2 px-1 text-center text-gray-800" style={{ backgroundColor: cell ? bg : 'transparent' }}>
                    {cell ? `${pct}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
