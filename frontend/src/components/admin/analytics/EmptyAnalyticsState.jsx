export default function EmptyAnalyticsState({ message, ar }) {
  const text = message || (ar ? 'لا توجد بيانات لهذا النطاق الزمني' : 'No data for this date range');
  return (
    <div className="flex items-center justify-center min-h-[140px] text-gray-400 text-sm text-center px-4">
      {text}
    </div>
  );
}
