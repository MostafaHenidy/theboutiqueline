import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

function mergeSeries(current, compare, valueKey) {
  const keys = new Set([
    ...(current || []).map((d) => d.bucket),
    ...(compare || []).map((d) => d.bucket),
  ]);
  return [...keys].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b))).map((bucket) => ({
    bucket,
    current: current?.find((d) => String(d.bucket) === String(bucket))?.[valueKey] ?? null,
    compare: compare?.find((d) => String(d.bucket) === String(bucket))?.[valueKey] ?? null,
  }));
}

export default function SessionsLineChart({ current, compare, valueKey = 'sessions', ar, valueLabel }) {
  const data = mergeSeries(current, compare, valueKey);
  if (!data.some((d) => d.current != null || d.compare != null)) {
    return (
      <p className="text-sm text-gray-500 text-center py-10">
        {ar ? 'لا توجد بيانات في هذه الفترة — ستظهر مع نشاط المتجر' : 'No activity in this period — data will appear as your store gets traffic'}
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Tooltip formatter={(v) => [valueLabel ? valueLabel(v) : v, '']} />
        <Legend />
        <Line type="monotone" dataKey="current" name={ar ? 'الحالي' : 'Current'} stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="compare" name={ar ? 'المقارنة' : 'Compare'} stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
