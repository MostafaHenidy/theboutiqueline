import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#94a3b8'];

export default function DeviceDonut({ items, ar }) {
  if (!items?.length) return null;
  const data = items.map((d) => ({
    name: d.device,
    value: d.count,
    change: d.change,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center">
      <p className="text-2xl font-bold text-gray-800 mb-2">{total}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
