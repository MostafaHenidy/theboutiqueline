import { Link } from 'react-router-dom';
import AnalyticsChartCard from './AnalyticsChartCard';
import SessionsLineChart from './SessionsLineChart';
import HorizontalBarList from './HorizontalBarList';
import ConversionFunnel from './ConversionFunnel';
import TrendBadge from './TrendBadge';
import KpiCard, { formatEgp } from './KpiCard';
import { resolveMediaUrl } from '../../../utils/helpers';

function CustomerBehaviorCard({ data, title, ar }) {
  const items = [
    { key: 'activeCarts', label: ar ? 'سلات نشطة' : 'Active carts' },
    { key: 'checkingOut', label: ar ? 'إتمام الشراء' : 'Checking out' },
    { key: 'purchased', label: ar ? 'تم الشراء' : 'Purchased' },
  ];
  return (
    <AnalyticsChartCard title={title} empty={false} ar={ar}>
      <div className="grid grid-cols-3 gap-4 text-center">
        {items.map(({ key, label }) => (
          <div key={key}>
            <p className="text-3xl font-bold text-gray-800">{data?.[key] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </AnalyticsChartCard>
  );
}

function OrdersTable({ rows, ar }) {
  if (!rows?.length) {
    return <p className="text-sm text-gray-500">{ar ? 'لا توجد طلبات في هذه الفترة' : 'No orders in this period'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-gray-500 text-xs uppercase">
            <th className="text-start py-2 pe-4">{ar ? 'الطلب' : 'Order'}</th>
            <th className="text-end py-2 px-2">{ar ? 'إجمالي' : 'Gross'}</th>
            <th className="text-end py-2 px-2">{ar ? 'صافي' : 'Net'}</th>
            <th className="text-end py-2 ps-2">{ar ? 'خصم' : 'Discount'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.orderNumber} className="border-b border-gray-50">
              <td className="py-2.5 pe-4 font-medium text-gray-800">#{row.orderNumber}</td>
              <td className="py-2.5 px-2 text-end">{formatEgp(row.gross, true)}</td>
              <td className="py-2.5 px-2 text-end">{formatEgp(row.net, true)}</td>
              <td className="py-2.5 ps-2 text-end text-gray-500">{formatEgp(row.discounts, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RfmList({ rows, ar }) {
  if (!rows?.length) return <p className="text-sm text-gray-500">{ar ? 'لا يوجد عملاء بعد' : 'No customers yet'}</p>;
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {rows.map((c) => (
        <div key={c.key} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate">{c.name}</p>
            <p className="text-xs text-gray-400 truncate">{c.email}</p>
          </div>
          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">{c.segment}</span>
        </div>
      ))}
    </div>
  );
}

function ProductList({ items, ar, valueKey = 'conversions' }) {
  if (!items?.length) return <p className="text-sm text-gray-500">{ar ? 'لا توجد بيانات منتجات' : 'No product data'}</p>;
  return (
    <div className="space-y-3 max-h-72 overflow-y-auto">
      {items.map((p) => (
        <div key={p.productId} className="flex items-center gap-3">
          <img src={resolveMediaUrl(p.image) || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{ar ? p.nameAr || p.name : p.name}</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">{p[valueKey] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportWidget({ reportKey, title, data, phase2, ar }) {
  const rd = data?.reportData || {};

  switch (reportKey) {
    case 'visitorsRightNow':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-4xl font-bold text-gray-800">{rd.visitorsRightNow ?? 0}</p>
          <Link to="/admin/analytics/live" className="text-sm text-blue-600 hover:underline mt-3 inline-block">
            {ar ? 'فتح العرض المباشر' : 'Open Live View'}
          </Link>
        </AnalyticsChartCard>
      );

    case 'bounceRateOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{rd.bounceRateOverTime?.overallRate ?? 0}%</span>
            <TrendBadge change={rd.bounceRateOverTime?.change} />
          </div>
          <SessionsLineChart
            current={rd.bounceRateOverTime?.current}
            compare={rd.bounceRateOverTime?.compare}
            valueKey="rate"
            ar={ar}
            valueLabel={(v) => `${Number(v).toFixed(1)}%`}
          />
        </AnalyticsChartCard>
      );

    case 'customerBehavior':
      return <CustomerBehaviorCard data={rd.customerBehavior} title={title} ar={ar} />;

    case 'sessionsWithCartAdditions':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{rd.sessionsWithCartAdditions?.value ?? 0}</span>
            <TrendBadge change={rd.sessionsWithCartAdditions?.change} />
          </div>
          <SessionsLineChart
            current={rd.sessionsWithCartAdditions?.overTime?.current}
            compare={rd.sessionsWithCartAdditions?.overTime?.compare}
            valueKey="count"
            ar={ar}
          />
        </AnalyticsChartCard>
      );

    case 'searchConversionsOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <SessionsLineChart current={rd.search?.searchConversionsOverTime?.current} compare={[]} valueKey="count" ar={ar} />
        </AnalyticsChartCard>
      );

    case 'searchesByQuery':
      return (
        <AnalyticsChartCard title={title} empty={!rd.search?.searchesByQuery?.length} ar={ar}>
          <HorizontalBarList items={rd.search?.searchesByQuery || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'searchesWithNoClicks':
      return (
        <AnalyticsChartCard title={title} empty={!rd.search?.searchesWithNoClicks?.length} ar={ar}>
          <HorizontalBarList items={rd.search?.searchesWithNoClicks || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'searchesWithNoResults':
      return (
        <AnalyticsChartCard title={title} empty={!rd.search?.searchesWithNoResults?.length} ar={ar}>
          <HorizontalBarList items={rd.search?.searchesWithNoResults || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'productRecommendationConversionsOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <SessionsLineChart
            current={rd.productRecommendations?.conversionsOverTime?.current}
            compare={[]}
            valueKey="count"
            ar={ar}
          />
        </AnalyticsChartCard>
      );

    case 'productRecommendationLowEngagement':
    case 'productRecommendationsWithLowEngagement':
      return (
        <AnalyticsChartCard title={title} empty={!rd.productRecommendations?.lowEngagement?.length} ar={ar}>
          <ProductList items={rd.productRecommendations?.lowEngagement} ar={ar} valueKey="engagement" />
        </AnalyticsChartCard>
      );

    case 'productRecommendationSearchesLowEngagement':
      return (
        <AnalyticsChartCard title={title} empty={!rd.productRecommendations?.searchesWithLowEngagement?.length} ar={ar}>
          <HorizontalBarList items={rd.productRecommendations?.searchesWithLowEngagement || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'productRecommendationSearchesLowConversion':
      return (
        <AnalyticsChartCard title={title} empty={!rd.productRecommendations?.searchesWithLowConversion?.length} ar={ar}>
          <HorizontalBarList
            items={rd.productRecommendations?.searchesWithLowConversion || []}
            valueKey="count"
            labelKey="label"
            formatValue={(v) => `${v}%`}
          />
        </AnalyticsChartCard>
      );

    case 'productRecommendationPerformance':
      return (
        <AnalyticsChartCard title={title} empty={!rd.productRecommendations?.performance?.length} ar={ar}>
          <ProductList items={rd.productRecommendations?.performance} ar={ar} valueKey="conversions" />
        </AnalyticsChartCard>
      );

    case 'newCustomersOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <SessionsLineChart current={rd.newCustomersOverTime?.current} compare={rd.newCustomersOverTime?.compare} valueKey="count" ar={ar} />
        </AnalyticsChartCard>
      );

    case 'newCustomerSalesOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <SessionsLineChart current={rd.newCustomerSalesOverTime?.current} compare={rd.newCustomerSalesOverTime?.compare} valueKey="sales" ar={ar} valueLabel={(v) => formatEgp(v)} />
        </AnalyticsChartCard>
      );

    case 'newVsReturningCustomers':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <HorizontalBarList
            items={[
              { label: ar ? 'جدد' : 'New', count: rd.newVsReturningCustomers?.new ?? 0 },
              { label: ar ? 'عائدون' : 'Returning', count: rd.newVsReturningCustomers?.returning ?? 0 },
            ]}
            valueKey="count"
            labelKey="label"
          />
        </AnalyticsChartCard>
      );

    case 'oneTimeCustomers':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={rd.oneTimeCustomers ?? 0} />
        </div>
      );

    case 'returningCustomers':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={rd.returningCustomers ?? 0} />
        </div>
      );

    case 'rfmCustomerAnalysis':
      return (
        <AnalyticsChartCard title={title} empty={!rd.rfmAnalysis?.length} ar={ar}>
          <HorizontalBarList items={rd.rfmAnalysis || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'rfmCustomerList':
      return (
        <AnalyticsChartCard title={title} empty={!rd.rfmCustomerList?.length} ar={ar}>
          <RfmList rows={rd.rfmCustomerList} ar={ar} />
        </AnalyticsChartCard>
      );

    case 'predictedSpendTiers':
      return (
        <AnalyticsChartCard title={title} empty={!rd.predictedSpendTiers?.length} ar={ar}>
          <HorizontalBarList items={rd.predictedSpendTiers || []} valueKey="count" labelKey="label" />
        </AnalyticsChartCard>
      );

    case 'chargebackRate':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={rd.chargebackRate?.value ?? 0} change={rd.chargebackRate?.change} isPercent />
        </div>
      );

    case 'discountsByOrder':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-lg font-bold mb-3">{formatEgp(rd.discountsTotal)}</p>
          <HorizontalBarList items={rd.discountsByOrder || []} valueKey="count" labelKey="label" formatValue={(v) => formatEgp(v)} />
        </AnalyticsChartCard>
      );

    case 'cogsByOrder':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-lg font-bold mb-3">{formatEgp(rd.cogsTotal)}</p>
          <HorizontalBarList items={rd.cogsByOrder || []} valueKey="count" labelKey="label" formatValue={(v) => formatEgp(v)} />
        </AnalyticsChartCard>
      );

    case 'ordersTable':
    case 'grossSalesByOrder':
    case 'grossProfitByOrder':
    case 'netSalesByOrder':
    case 'netPaymentsByOrder':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <OrdersTable rows={rd.ordersTable} ar={ar} />
        </AnalyticsChartCard>
      );

    case 'managedMarketsTaxes':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-lg font-bold mb-3">{formatEgp(rd.managedMarketsTaxes?.value)}</p>
          <HorizontalBarList items={rd.managedMarketsTaxes?.items || []} valueKey="count" labelKey="label" formatValue={(v) => formatEgp(v)} />
        </AnalyticsChartCard>
      );

    case 'grossPaymentsShopifyPayments':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={rd.grossPaymentsShopifyPayments?.value ?? 0} isCurrency />
        </div>
      );

    case 'giftCardSales':
    case 'giftCardBalance':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={0} isCurrency />
          <p className="text-xs text-gray-400 mt-2">{ar ? 'بطاقات الهدايا غير مفعّلة في المتجر' : 'Gift cards are not enabled in this store'}</p>
        </div>
      );

    case 'shopCampaignRoas':
      return (
        <AnalyticsChartCard title={title} empty={!rd.shopCampaignRoas?.length} ar={ar}>
          <HorizontalBarList
            items={(rd.shopCampaignRoas || []).map((r) => ({ label: r.label, revenue: r.revenue }))}
            valueKey="revenue"
            labelKey="label"
            formatValue={(v) => formatEgp(v)}
          />
        </AnalyticsChartCard>
      );

    case 'conversionFunnel':
      return (
        <AnalyticsChartCard title={title} empty={!phase2?.conversionFunnel} ar={ar}>
          <ConversionFunnel funnel={phase2?.conversionFunnel} ar={ar} />
        </AnalyticsChartCard>
      );

    case 'unavailable':
    case 'shopProtectUnavailable':
      return (
        <AnalyticsChartCard
          title={title}
          empty={false}
          ar={ar}
        >
          <p className="text-sm text-gray-500">
            {ar ? 'هذه الميزة غير متوفرة في هذا المتجر' : 'This feature is not available in this store'}
          </p>
        </AnalyticsChartCard>
      );

    case 'inventoryUnavailable':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-sm text-gray-500">
            {ar ? 'تتبع المخزون المتقدم غير مفعّل — يُعرض تقرير المبيعات كبديل' : 'Advanced inventory tracking is not enabled — showing product sales as a proxy'}
          </p>
          <div className="mt-4">
            <HorizontalBarList
              items={(data?.salesByProduct || []).map((p) => ({
                label: ar ? (p.nameAr || p.name) : p.name,
                count: p.revenue,
              }))}
              valueKey="count"
              labelKey="label"
              formatValue={(v) => formatEgp(v)}
            />
          </div>
        </AnalyticsChartCard>
      );

    case 'subscriptionsUnavailable':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <p className="text-sm text-gray-500 mb-3">
            {ar ? 'الاشتراكات غير مفعّلة — يُعرض المبيعات بمرور الوقت' : 'Subscriptions are not enabled — showing sales over time'}
          </p>
          <SessionsLineChart
            current={data?.salesOverTime?.current?.map((r) => ({ bucket: r.bucket, count: r.sales }))}
            compare={data?.salesOverTime?.compare?.map((r) => ({ bucket: r.bucket, count: r.sales }))}
            valueKey="count"
            ar={ar}
            valueLabel={(v) => formatEgp(v)}
          />
        </AnalyticsChartCard>
      );

    case 'ordersOverTime':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{data?.kpis?.orders?.value ?? 0}</span>
            <TrendBadge change={data?.kpis?.orders?.change} />
          </div>
          <SessionsLineChart
            current={phase2?.sessionsOverTime?.current?.map((r) => ({ bucket: r.bucket, count: r.sessions }))}
            compare={phase2?.sessionsOverTime?.compare?.map((r) => ({ bucket: r.bucket, count: r.sessions }))}
            valueKey="count"
            ar={ar}
          />
        </AnalyticsChartCard>
      );

    case 'grossProfitByProduct':
      return (
        <AnalyticsChartCard title={title} empty={!data?.salesByProduct?.length} ar={ar}>
          <HorizontalBarList
            items={(data?.salesByProduct || []).map((p) => ({
              label: ar ? (p.nameAr || p.name) : p.name,
              revenue: p.revenue,
            }))}
            valueKey="revenue"
            labelKey="label"
          />
        </AnalyticsChartCard>
      );

    case 'fraudChargebackAmount':
      return (
        <div className="max-w-sm">
          <KpiCard label={title} value={rd.chargebackRate?.value ?? 0} isCurrency />
        </div>
      );

    case 'fraudAcceptanceRate':
      return (
        <div className="max-w-sm">
          <KpiCard
            label={title}
            value={100 - (rd.chargebackRate?.value ?? 0)}
            isPercent
          />
        </div>
      );

    case 'salesByCurrency':
      return (
        <AnalyticsChartCard title={title} empty={false} ar={ar}>
          <div className="max-w-sm mb-4">
            <KpiCard label={ar ? 'جنيه مصري (EGP)' : 'Egyptian Pound (EGP)'} value={data?.kpis?.totalSales?.value ?? 0} isCurrency />
          </div>
          <HorizontalBarList
            items={[{ label: 'EGP', revenue: data?.kpis?.totalSales?.value ?? 0 }]}
            valueKey="revenue"
            labelKey="label"
          />
        </AnalyticsChartCard>
      );

    default:
      return (
        <AnalyticsChartCard title={title} empty ar={ar} />
      );
  }
}
