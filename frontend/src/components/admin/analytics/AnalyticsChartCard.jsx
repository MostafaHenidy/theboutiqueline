import EmptyAnalyticsState from './EmptyAnalyticsState';

export default function AnalyticsChartCard({ title, children, empty, emptyMessage, ar, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col ${className}`}>
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      {empty ? <EmptyAnalyticsState message={emptyMessage} ar={ar} /> : children}
    </div>
  );
}
