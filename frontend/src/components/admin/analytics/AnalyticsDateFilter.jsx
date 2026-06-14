import { Calendar } from 'lucide-react';

const PRESETS = [
  { id: 'today', labelEn: 'Today', labelAr: 'اليوم', days: 0 },
  { id: 'yesterday', labelEn: 'Yesterday', labelAr: 'أمس', days: 1 },
  { id: 'last7', labelEn: 'Last 7 days', labelAr: 'آخر 7 أيام', days: 7 },
  { id: 'last30', labelEn: 'Last 30 days', labelAr: 'آخر 30 يوماً', days: 30 },
];

function toYmd(d) {
  return d.toISOString().slice(0, 10);
}

export function getPresetRange(presetId) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];

  if (preset.id === 'yesterday') {
    const y = new Date(end);
    y.setUTCDate(y.getUTCDate() - 1);
    return {
      start: toYmd(y),
      end: toYmd(y),
      compareStart: toYmd(new Date(y.getTime() - 86400000)),
      compareEnd: toYmd(new Date(y.getTime() - 86400000)),
    };
  }

  const start = new Date(end);
  if (preset.days > 0) start.setUTCDate(start.getUTCDate() - (preset.days - 1));

  const span = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const compareEnd = new Date(start);
  compareEnd.setUTCDate(compareEnd.getUTCDate() - 1);
  const compareStart = new Date(compareEnd);
  compareStart.setUTCDate(compareStart.getUTCDate() - (span - 1));

  return {
    start: toYmd(start),
    end: toYmd(end),
    compareStart: toYmd(compareStart),
    compareEnd: toYmd(compareEnd),
  };
}

export default function AnalyticsDateFilter({ preset, onPresetChange, customStart, customEnd, onCustomChange, ar }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
        <Calendar size={16} className="text-gray-400" />
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{ar ? p.labelAr : p.labelEn}</option>
          ))}
          <option value="custom">{ar ? 'مخصص' : 'Custom'}</option>
        </select>
      </div>
      {preset === 'custom' && (
        <>
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomChange('start', e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomChange('end', e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2"
          />
        </>
      )}
    </div>
  );
}
