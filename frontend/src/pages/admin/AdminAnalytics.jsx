import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AnalyticsDateFilter, { getPresetRange } from '../../components/admin/analytics/AnalyticsDateFilter';
import KpiCard, { formatEgp } from '../../components/admin/analytics/KpiCard';
import AnalyticsChartCard from '../../components/admin/analytics/AnalyticsChartCard';
import SalesOverTimeChart from '../../components/admin/analytics/SalesOverTimeChart';
import SalesBreakdownList from '../../components/admin/analytics/SalesBreakdownList';
import HorizontalBarList from '../../components/admin/analytics/HorizontalBarList';
import CohortHeatmap from '../../components/admin/analytics/CohortHeatmap';
import InsightPanel from '../../components/admin/analytics/InsightPanel';
import TrendBadge from '../../components/admin/analytics/TrendBadge';
import Phase2Widget from '../../components/admin/analytics/Phase2Widget';

const PHASE2_WIDGETS = [
  { key: 'sessionsOverTime', titleEn: 'Sessions over time', titleAr: 'الجلسات عبر الزمن' },
  { key: 'conversionOverTime', titleEn: 'Conversion rate over time', titleAr: 'معدل التحويل عبر الزمن' },
  { key: 'conversionFunnel', titleEn: 'Conversion rate breakdown', titleAr: 'تفصيل معدل التحويل' },
  { key: 'sessionsByDevice', titleEn: 'Sessions by device type', titleAr: 'الجلسات حسب الجهاز' },
  { key: 'sessionsByLocation', titleEn: 'Sessions by location', titleAr: 'الجلسات حسب الموقع' },
  { key: 'salesBySocialReferrer', titleEn: 'Total sales by social referrer', titleAr: 'المبيعات حسب وسائل التواصل' },
  { key: 'sessionsByReferrer', titleEn: 'Sessions by referrer', titleAr: 'الجلسات حسب المصدر' },
  { key: 'salesByReferrer', titleEn: 'Total sales by referrer', titleAr: 'المبيعات حسب المصدر' },
  { key: 'performanceByChannel', titleEn: 'Performance by referring channel', titleAr: 'الأداء حسب قناة الإحالة' },
  { key: 'salesByPosLocation', titleEn: 'Total sales by POS location', titleAr: 'مبيعات نقاط البيع' },
  { key: 'posStaffSales', titleEn: 'POS staff sales total', titleAr: 'مبيعات موظفي نقاط البيع' },
];

function AovChart({ current, compare, ar }) {
  const keys = new Set([
    ...(current || []).map((d) => d.bucket),
    ...(compare || []).map((d) => d.bucket),
  ]);
  const data = [...keys].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)).map((bucket) => ({
    bucket,
    current: current?.find((d) => d.bucket === bucket)?.aov ?? null,
    compare: compare?.find((d) => d.bucket === bucket)?.aov ?? null,
  }));
  if (!data.some((d) => d.current != null)) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={48} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} EGP`, '']} />
        <Line type="monotone" dataKey="current" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="compare" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function AdminAnalytics() {
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [preset, setPreset] = useState('last30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState(null);

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
      if (res.data?.insights?.[0]) setSelectedInsight(res.data.insights[0].id);
    } catch {
      toast.error(ar ? 'تعذر تحميل التحليلات' : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd, ar]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshed = data?.refreshedAt
    ? new Date(data.refreshedAt).toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';

  const kpis = data?.kpis;
  const salesSpark = data?.salesOverTime?.current?.map((d) => d.sales) || [];

  const sellThroughItems = (data?.sellThrough || []).map((p) => ({
    productId: p.productId,
    name: ar ? (p.nameAr || p.name) : p.name,
    revenue: p.sellThrough,
    label: ar ? (p.nameAr || p.name) : p.name,
  }));

  const lpItems = (data?.landingPageSessions || []).map((lp) => ({
    label: `${lp.title} — ${lp.path}`,
    revenue: lp.sessions,
    landingPageId: lp.landingPageId,
  }));

  const locationItems = (data?.salesByLocation || []).map((loc) => ({
    label: loc.label,
    revenue: loc.revenue,
  }));

  const hasSalesChart = data?.salesOverTime?.current?.length > 0;
  const phase2 = data?.phase2;

  const renderPhase2 = (key) => {
    const w = PHASE2_WIDGETS.find((x) => x.key === key);
    if (!w) return null;
    return (
      <Phase2Widget
        key={key}
        widgetKey={key}
        title={ar ? w.titleAr : w.titleEn}
        phase2={phase2}
        ar={ar}
      />
    );
  };

  return (
    <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <BarChart3 size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{ar ? 'التحليلات' : 'Analytics'}</h1>
            <p className="text-xs text-gray-400">
              {ar ? 'آخر تحديث:' : 'Last refreshed:'} {refreshed}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center text-gray-400">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <>
          {/* Insights */}
          <InsightPanel
            insights={data?.insights}
            selectedId={selectedInsight}
            onSelect={setSelectedInsight}
            ar={ar}
          />

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={ar ? 'إجمالي المبيعات' : 'Gross sales'}
              value={kpis?.grossSales?.value}
              change={kpis?.grossSales?.change}
              isCurrency
              sparkline={salesSpark}
            />
            <KpiCard
              label={ar ? 'معدل العملاء العائدين' : 'Returning customer rate'}
              value={kpis?.returningCustomerRate?.value}
              change={kpis?.returningCustomerRate?.change}
              isPercent
            />
            <KpiCard
              label={ar ? 'الطلبات المُنفَّذة' : 'Orders fulfilled'}
              value={kpis?.ordersFulfilled?.value}
              change={kpis?.ordersFulfilled?.change}
            />
            <KpiCard
              label={ar ? 'الطلبات' : 'Orders'}
              value={kpis?.orders?.value}
              change={kpis?.orders?.change}
            />
          </div>

          {/* Main charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <AnalyticsChartCard
              title={ar ? 'إجمالي المبيعات عبر الزمن' : 'Total sales over time'}
              empty={!hasSalesChart}
              ar={ar}
              className="xl:col-span-2"
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-800">{formatEgp(kpis?.totalSales?.value)}</span>
                <TrendBadge change={kpis?.totalSales?.change} />
              </div>
              <SalesOverTimeChart current={data?.salesOverTime?.current} compare={data?.salesOverTime?.compare} ar={ar} />
            </AnalyticsChartCard>
            <AnalyticsChartCard title={ar ? 'تفصيل المبيعات' : 'Total sales breakdown'} empty={!data?.salesBreakdown?.current} ar={ar}>
              <SalesBreakdownList current={data?.salesBreakdown?.current} compare={data?.salesBreakdown?.compare} ar={ar} />
            </AnalyticsChartCard>
          </div>

          {/* Widget grid row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnalyticsChartCard title={ar ? 'المبيعات حسب قناة الدفع' : 'Total sales by sales channel'} empty={!data?.salesByChannel?.length} ar={ar}>
              <HorizontalBarList items={data?.salesByChannel} valueKey="revenue" labelKey="channel" />
            </AnalyticsChartCard>
            <AnalyticsChartCard title={ar ? 'متوسط قيمة الطلب عبر الزمن' : 'Average order value over time'} empty={!data?.aovOverTime?.current?.length} ar={ar}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-lg font-bold">{formatEgp(kpis?.averageOrderValue?.value)}</span>
                <TrendBadge change={kpis?.averageOrderValue?.change} />
              </div>
              <AovChart current={data?.aovOverTime?.current} compare={data?.aovOverTime?.compare} ar={ar} />
            </AnalyticsChartCard>
            <AnalyticsChartCard title={ar ? 'المبيعات حسب المنتج' : 'Total sales by product'} empty={!data?.salesByProduct?.length} ar={ar}>
              <HorizontalBarList
                items={(data?.salesByProduct || []).map((p) => ({
                  ...p,
                  name: ar ? (p.nameAr || p.name) : p.name,
                }))}
                valueKey="revenue"
                labelKey="name"
              />
            </AnalyticsChartCard>
          </div>

          {/* Phase 2 — session & funnel widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PHASE2_WIDGETS.slice(0, 6).map((w) => renderPhase2(w.key))}
          </div>

          {/* Cohort + landing pages */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AnalyticsChartCard title={ar ? 'تحليل أفواج العملاء' : 'Customer cohort analysis'} empty={!data?.customerCohorts?.length} ar={ar}>
              <CohortHeatmap cohorts={data?.customerCohorts} ar={ar} />
            </AnalyticsChartCard>
            <AnalyticsChartCard title={ar ? 'الجلسات حسب صفحة الهبوط' : 'Sessions by landing page'} empty={!lpItems.length} ar={ar}>
              <HorizontalBarList
                items={lpItems}
                valueKey="revenue"
                labelKey="label"
                formatValue={(v) => `${v} ${ar ? 'جلسة' : 'sessions'}`}
              />
            </AnalyticsChartCard>
          </div>

          {/* Sell-through + location + more phase2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnalyticsChartCard title={ar ? 'نسبة البيع للمنتجات' : 'Products by sell-through rate'} empty={!sellThroughItems.length} ar={ar}>
              <HorizontalBarList
                items={sellThroughItems}
                valueKey="revenue"
                labelKey="name"
                formatValue={(v) => `${v}%`}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title={ar ? 'المبيعات حسب الموقع' : 'Sales by location (orders)'} empty={!locationItems.length} ar={ar}>
              <HorizontalBarList items={locationItems} valueKey="revenue" labelKey="label" />
            </AnalyticsChartCard>
            {PHASE2_WIDGETS.slice(6).map((w) => renderPhase2(w.key))}
          </div>
        </>
      )}
    </div>
  );
}
