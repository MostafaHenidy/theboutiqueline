import AnalyticsChartCard from './AnalyticsChartCard';
import SessionsLineChart from './SessionsLineChart';
import ConversionFunnel from './ConversionFunnel';
import DeviceDonut from './DeviceDonut';
import HorizontalBarList from './HorizontalBarList';
import TrendBadge from './TrendBadge';
import { formatEgp } from './KpiCard';

const POS_KEYS = new Set(['salesByPosLocation', 'posStaffSales']);

export default function Phase2Widget({ widgetKey, title, phase2, ar }) {
  if (POS_KEYS.has(widgetKey)) {
    return (
      <AnalyticsChartCard title={title} empty emptyMessage={ar ? 'غير متاح — لا يوجد نظام نقاط بيع' : 'Not available — no POS integration'} ar={ar} />
    );
  }

  switch (widgetKey) {
    case 'sessionsOverTime':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.sessionsOverTime?.current?.length} ar={ar}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{phase2.totalSessions ?? 0}</span>
            <TrendBadge change={phase2.totalSessionsChange} />
          </div>
          <SessionsLineChart
            current={phase2.sessionsOverTime?.current}
            compare={phase2.sessionsOverTime?.compare}
            valueKey="sessions"
            ar={ar}
          />
        </AnalyticsChartCard>
      );

    case 'conversionOverTime':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.conversionOverTime?.current?.length} ar={ar}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{phase2.conversionOverTime?.overallRate ?? 0}%</span>
            <TrendBadge change={phase2.conversionOverTime?.change} />
          </div>
          <SessionsLineChart
            current={phase2.conversionOverTime?.current}
            compare={phase2.conversionOverTime?.compare}
            valueKey="rate"
            ar={ar}
            valueLabel={(v) => `${Number(v).toFixed(2)}%`}
          />
        </AnalyticsChartCard>
      );

    case 'conversionFunnel':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.conversionFunnel} ar={ar}>
          <ConversionFunnel funnel={phase2.conversionFunnel} ar={ar} />
        </AnalyticsChartCard>
      );

    case 'sessionsByDevice':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.sessionsByDevice?.length} ar={ar}>
          <DeviceDonut items={phase2.sessionsByDevice} ar={ar} />
        </AnalyticsChartCard>
      );

    case 'sessionsByLocation':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.sessionsByLocation?.length} ar={ar}>
          <HorizontalBarList
            items={(phase2.sessionsByLocation || []).map((x) => ({ label: x.label, revenue: x.count }))}
            valueKey="revenue"
            labelKey="label"
            formatValue={(v) => `${v}`}
          />
        </AnalyticsChartCard>
      );

    case 'sessionsByReferrer':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.sessionsByReferrer?.length} ar={ar}>
          <HorizontalBarList
            items={(phase2.sessionsByReferrer || []).map((x) => ({ label: x.label, revenue: x.count }))}
            valueKey="revenue"
            labelKey="label"
            formatValue={(v) => `${v}`}
          />
        </AnalyticsChartCard>
      );

    case 'sessionsBySocialReferrer':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.sessionsBySocialReferrer?.length} ar={ar}>
          <HorizontalBarList
            items={(phase2.sessionsBySocialReferrer || []).map((x) => ({ label: x.label, revenue: x.count }))}
            valueKey="revenue"
            labelKey="label"
            formatValue={(v) => `${v}`}
          />
        </AnalyticsChartCard>
      );

    case 'salesBySocialReferrer':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.salesBySocialReferrer?.length} ar={ar}>
          <HorizontalBarList items={phase2.salesBySocialReferrer} valueKey="revenue" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'salesByReferrer':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.salesByReferrer?.length} ar={ar}>
          <HorizontalBarList items={phase2.salesByReferrer} valueKey="revenue" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'performanceByChannel':
      return (
        <AnalyticsChartCard title={title} empty={!phase2.performanceByChannel?.length} ar={ar}>
          <HorizontalBarList
            items={(phase2.performanceByChannel || []).map((x) => ({
              label: x.channel,
              revenue: x.revenue,
            }))}
            valueKey="revenue"
            labelKey="label"
            formatValue={(v) => formatEgp(v)}
          />
        </AnalyticsChartCard>
      );

    default:
      return <AnalyticsChartCard title={title} empty ar={ar} />;
  }
}
