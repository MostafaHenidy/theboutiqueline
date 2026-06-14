import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

function mergeSeries(current, compare) {
  const keys = new Set([
    ...(current || []).map((d) => d.bucket),
    ...(compare || []).map((d) => d.bucket),
  ]);
  return [...keys].sort((a, b) => {
    if (a.includes('-')) return a.localeCompare(b);
    return Number(a) - Number(b);
  }).map((bucket) => ({
    bucket,
    current: current?.find((d) => d.bucket === bucket)?.sales ?? null,
    compare: compare?.find((d) => d.bucket === bucket)?.sales ?? null,
  }));
}

function formatBucket(bucket) {
  const h = parseInt(bucket, 10);
  if (!Number.isNaN(h) && h >= 0 && h <= 23) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr} ${ampm}`;
  }
  return bucket;
}

export default function SalesOverTimeChart({ current, compare, ar }) {
  const data = mergeSeries(current, compare);
  if (!data.some((d) => d.current != null || d.compare != null)) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bucket" tickFormatter={formatBucket} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={56} />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(2)} EGP`, '']}
          labelFormatter={formatBucket}
        />
        <Legend />
        <Line type="monotone" dataKey="current" name={ar ? 'الفترة الحالية' : 'Current'} stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="compare" name={ar ? 'المقارنة' : 'Compare'} stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
