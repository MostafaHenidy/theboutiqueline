import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { REPORTS_BY_SLUG, recordReportView } from '../../data/adminReports';
import AnalyticsDateFilter, { getPresetRange } from '../../components/admin/analytics/AnalyticsDateFilter';
import AnalyticsChartCard from '../../components/admin/analytics/AnalyticsChartCard';
import SalesOverTimeChart from '../../components/admin/analytics/SalesOverTimeChart';
import SalesBreakdownList from '../../components/admin/analytics/SalesBreakdownList';
import HorizontalBarList from '../../components/admin/analytics/HorizontalBarList';
import CohortHeatmap from '../../components/admin/analytics/CohortHeatmap';
import TrendBadge from '../../components/admin/analytics/TrendBadge';
import Phase2Widget from '../../components/admin/analytics/Phase2Widget';
import ReportWidget from '../../components/admin/analytics/ReportWidget';
import KpiCard, { formatEgp } from '../../components/admin/analytics/KpiCard';

function AovChart({ current, compare }) {
  const keys = new Set([
    ...(current || []).map((d) => d.bucket),
    ...(compare || []).map((d) => d.bucket),
  ]);
  const chartData = [...keys].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)).map((bucket) => ({
    bucket,
    current: current?.find((d) => d.bucket === bucket)?.aov ?? null,
    compare: compare?.find((d) => d.bucket === bucket)?.aov ?? null,
  }));
  if (!chartData.some((d) => d.current != null)) return null;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} EGP`, '']} />
        <Line type="monotone" dataKey="current" stroke="#303030" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="compare" stroke="#8a8a8a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function AdminReportView() {
  const { slug } = useParams();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const report = REPORTS_BY_SLUG[slug];

  const [preset, setPreset] = useState('last30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) recordReportView(slug);
  }, [slug]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let params;
      if (preset === 'custom') {
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        const start = new Date(customStart);
        const end = new Date(customEnd);
        const span = Math.max(1, Math.round((end - start) / 86400000) + 1);
        const compareEnd = new Date(start);
        compareEnd.setDate(compareEnd.getDate() - 1);
        const compareStart = new Date(compareEnd);
        compareStart.setDate(compareStart.getDate() - (span - 1));
        params = {
          start: customStart,
          end: customEnd,
          compareStart: compareStart.toISOString().slice(0, 10),
          compareEnd: compareEnd.toISOString().slice(0, 10),
        };
      } else {
        params = getPresetRange(preset);
      }
      const qs = new URLSearchParams(params).toString();
      const { data: res } = await api.get(`/admin/analytics?${qs}`);
      setData(res.data);
    } catch {
      toast.error(ar ? 'تعذر تحميل التقرير' : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd, ar]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!report) {
    return (
      <div className="py-16 text-center text-[#616161]" dir={ar ? 'rtl' : 'ltr'}>
        <p>{ar ? 'التقرير غير موجود' : 'Report not found'}</p>
        <Link to="/admin/analytics/reports" className="text-[#005bd3] text-sm mt-2 inline-block hover:underline">
          {ar ? 'العودة إلى التقارير' : 'Back to reports'}
        </Link>
      </div>
    );
  }

  const phase2 = data?.phase2;
  const widget = report.widget;

  const renderWidget = () => {
    if (!widget) {
      return (
        <AnalyticsChartCard title={report.name} empty ar={ar} />
      );
    }

    const [scope, key] = widget.split('.');

    if (scope === 'report') {
      return (
        <ReportWidget
          reportKey={key}
          title={report.name}
          data={data}
          phase2={phase2}
          ar={ar}
        />
      );
    }

    if (scope === 'phase2') {
      return (
        <Phase2Widget
          widgetKey={key}
          title={report.name}
          phase2={phase2}
          ar={ar}
        />
      );
    }

    if (scope === 'core') {
      switch (key) {
        case 'salesOverTime':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.salesOverTime?.current?.length} ar={ar}>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#303030]">{formatEgp(data?.kpis?.totalSales?.value)}</span>
                <TrendBadge change={data?.kpis?.totalSales?.change} />
              </div>
              <SalesOverTimeChart current={data?.salesOverTime?.current} compare={data?.salesOverTime?.compare} ar={ar} />
            </AnalyticsChartCard>
          );
        case 'salesBreakdown':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.salesBreakdown?.current} ar={ar}>
              <SalesBreakdownList current={data?.salesBreakdown?.current} compare={data?.salesBreakdown?.compare} ar={ar} />
            </AnalyticsChartCard>
          );
        case 'salesByChannel':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.salesByChannel?.length} ar={ar}>
              <HorizontalBarList items={data?.salesByChannel} valueKey="revenue" labelKey="channel" />
            </AnalyticsChartCard>
          );
        case 'aovOverTime':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.aovOverTime?.current?.length} ar={ar}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-lg font-bold">{formatEgp(data?.kpis?.averageOrderValue?.value)}</span>
                <TrendBadge change={data?.kpis?.averageOrderValue?.change} />
              </div>
              <AovChart current={data?.aovOverTime?.current} compare={data?.aovOverTime?.compare} />
            </AnalyticsChartCard>
          );
        case 'salesByProduct':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.salesByProduct?.length} ar={ar}>
              <HorizontalBarList
                items={(data?.salesByProduct || []).map((p) => ({
                  ...p,
                  name: ar ? (p.nameAr || p.name) : p.name,
                }))}
                valueKey="revenue"
                labelKey="name"
              />
            </AnalyticsChartCard>
          );
        case 'customerCohorts':
          return (
            <AnalyticsChartCard title={report.name} empty={!data?.customerCohorts?.length} ar={ar}>
              <CohortHeatmap cohorts={data?.customerCohorts} ar={ar} />
            </AnalyticsChartCard>
          );
        case 'landingPageSessions': {
          const lpItems = (data?.landingPageSessions || []).map((lp) => ({
            label: `${lp.title} — ${lp.path}`,
            revenue: lp.sessions,
          }));
          return (
            <AnalyticsChartCard title={report.name} empty={!lpItems.length} ar={ar}>
              <HorizontalBarList
                items={lpItems}
                valueKey="revenue"
                labelKey="label"
                formatValue={(v) => `${v} ${ar ? 'جلسة' : 'sessions'}`}
              />
            </AnalyticsChartCard>
          );
        }
        case 'salesByLocation': {
          const locationItems = (data?.salesByLocation || []).map((loc) => ({
            label: loc.label,
            revenue: loc.revenue,
          }));
          return (
            <AnalyticsChartCard title={report.name} empty={!locationItems.length} ar={ar}>
              <HorizontalBarList items={locationItems} valueKey="revenue" labelKey="label" />
            </AnalyticsChartCard>
          );
        }
        case 'sellThrough': {
          const items = (data?.sellThrough || []).map((p) => ({
            name: ar ? (p.nameAr || p.name) : p.name,
            revenue: p.sellThrough,
          }));
          return (
            <AnalyticsChartCard title={report.name} empty={!items.length} ar={ar}>
              <HorizontalBarList items={items} valueKey="revenue" labelKey="name" formatValue={(v) => `${v}%`} />
            </AnalyticsChartCard>
          );
        }
        case 'returningCustomerRate':
          return (
            <div className="max-w-sm">
              <KpiCard
                label={report.name}
                value={data?.kpis?.returningCustomerRate?.value}
                change={data?.kpis?.returningCustomerRate?.change}
                isPercent
              />
            </div>
          );
        default:
          return <AnalyticsChartCard title={report.name} empty ar={ar} />;
      }
    }

    return <AnalyticsChartCard title={report.name} empty ar={ar} />;
  };

  return (
    <div className="space-y-5" dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/analytics/reports"
            className="inline-flex items-center gap-1 text-sm text-[#616161] hover:text-[#303030] mb-2"
          >
            <ChevronLeft size={16} />
            {ar ? 'التقارير' : 'Reports'}
          </Link>
          <h1 className="text-xl font-semibold text-[#303030] truncate">{report.name}</h1>
          <p className="text-sm text-[#616161] mt-0.5">{report.category}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <AnalyticsDateFilter
            preset={preset}
            onPresetChange={setPreset}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(field, val) => (field === 'start' ? setCustomStart(val) : setCustomEnd(val))}
            ar={ar}
          />
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 border border-[#c9cccf] rounded-lg hover:bg-[#f6f6f7] text-[#616161] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center text-[#8a8a8a]">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        renderWidget()
      )}
    </div>
  );
}
