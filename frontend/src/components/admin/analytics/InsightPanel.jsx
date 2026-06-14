import { Lightbulb, TrendingDown, Package, Info } from 'lucide-react';

const ICONS = {
  decline: TrendingDown,
  inventory: Package,
  highlight: Lightbulb,
  info: Info,
};

export default function InsightPanel({ insights, selectedId, onSelect, ar }) {
  const list = insights || [];
  const selected = list.find((i) => i.id === selectedId) || list[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-h-[220px] overflow-y-auto">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-50">
          {ar ? 'رؤى' : 'Insights'}
        </p>
        <ul>
          {list.map((item) => {
            const Icon = ICONS[item.type] || Info;
            const active = selected?.id === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-2 text-sm transition-colors ${active ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <Icon size={16} className="flex-shrink-0 mt-0.5 text-gray-400" />
                  <span className="line-clamp-2">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {selected ? (
          <>
            <p className="text-xs text-gray-400 mb-1">{ar ? 'تفاصيل الرؤية' : 'Insight detail'}</p>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{selected.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{selected.message}</p>
          </>
        ) : (
          <p className="text-sm text-gray-400">{ar ? 'لا توجد رؤى' : 'No insights'}</p>
        )}
      </div>
    </div>
  );
}
