import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatEgp } from '../../components/admin/analytics/KpiCard';
import TrendBadge from '../../components/admin/analytics/TrendBadge';
import LiveViewGlobe from '../../components/admin/analytics/LiveViewGlobe';
import { resolveMediaUrl } from '../../utils/helpers';

function LiveSparkline({ values }) {
  if (!values?.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-10 mt-3">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-[#2c6ecb] rounded-t-sm opacity-90"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function LiveMetricCard({ label, value, change, displayValue, sparkline }) {
  return (
    <div className="bg-white rounded-xl border border-[#e3e3e3] p-4 min-w-0">
      <p className="text-xs text-[#616161] mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-[#303030] truncate">{displayValue ?? value}</p>
        {change != null && <TrendBadge change={change} />}
      </div>
      <LiveSparkline values={sparkline} />
    </div>
  );
}

function HorizontalMetricBar({ label, value, max, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-[#303030]">
        <span>{label}</span>
        <span className="text-[#616161] tabular-nums">{value}{suffix}</span>
      </div>
      <div className="h-2 bg-[#f1f1f1] rounded-full overflow-hidden">
        <div className="h-full bg-[#2c6ecb] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminLiveView() {
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tick, setTick] = useState(0);

  const fetchLive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: res } = await api.get('/admin/analytics/live');
      setData(res.data);
      setLastRefresh(new Date());
    } catch {
      if (!silent) toast.error(ar ? 'تعذر تحميل العرض المباشر' : 'Failed to load live view');
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    fetchLive();
    const pollId = setInterval(() => fetchLive(true), 10000);
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [fetchLive]);

  const refreshedLabel = useMemo(() => {
    if (!lastRefresh) return '—';
    const secs = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (secs < 8) return ar ? 'الآن' : 'Just now';
    if (secs < 60) return ar ? `منذ ${secs} ث` : `${secs}s ago`;
    return ar ? `منذ ${Math.floor(secs / 60)} د` : `${Math.floor(secs / 60)}m ago`;
  }, [lastRefresh, tick, ar]);

  const locationMax = Math.max(...(data?.sessionsByLocation?.map((x) => x.count) || [1]), 1);
  const customerMax = Math.max(data?.customersSplit?.new || 0, data?.customersSplit?.returning || 0, 1);

  return (
    <div className="-m-6 min-h-full bg-[#f6f6f7] flex flex-col" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white border-b border-[#e3e3e3] px-5 sm:px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-[1.25rem] font-semibold text-[#303030]">{ar ? 'العرض المباشر' : 'Live View'}</h1>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#616161]">
            <span className="w-2 h-2 rounded-full bg-[#2c6ecb] animate-pulse" />
            {refreshedLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fetchLive()}
          disabled={loading}
          className="p-2 rounded-lg border border-[#c9cccf] text-[#616161] hover:bg-[#f6f6f7] disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !data ? (
        <div className="flex-1 flex items-center justify-center text-[#8a8a8a]">
          {ar ? 'جاري التحميل...' : 'Loading...'}
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left metrics column */}
          <div className="lg:w-[400px] xl:w-[440px] flex-shrink-0 p-4 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <LiveMetricCard
                label={ar ? 'الزوار الآن' : 'Visitors right now'}
                value={data?.visitorsRightNow ?? 0}
              />
              <LiveMetricCard
                label={ar ? 'إجمالي المبيعات' : 'Total sales'}
                displayValue={formatEgp(data?.totalSales?.value, true)}
                change={data?.totalSales?.change}
                sparkline={data?.totalSales?.sparkline}
              />
              <LiveMetricCard
                label={ar ? 'الجلسات' : 'Sessions'}
                value={data?.sessions?.value ?? 0}
                change={data?.sessions?.change}
                sparkline={data?.sessions?.sparkline}
              />
              <LiveMetricCard
                label={ar ? 'الطلبات' : 'Orders'}
                value={data?.orders?.value ?? 0}
                change={data?.orders?.change}
                sparkline={data?.orders?.sparkline}
              />
            </div>

            {/* Customer behavior */}
            <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
              <p className="text-sm font-medium text-[#303030] mb-3">{ar ? 'سلوك العملاء' : 'Customer behavior'}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { key: 'activeCarts', label: ar ? 'سلات نشطة' : 'Active carts' },
                  { key: 'checkingOut', label: ar ? 'إتمام الشراء' : 'Checking out' },
                  { key: 'purchased', label: ar ? 'تم الشراء' : 'Purchased' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-2xl font-semibold text-[#303030]">{data?.customerBehavior?.[key] ?? 0}</p>
                    <p className="text-[10px] text-[#616161] mt-1 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions by location */}
            <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
              <p className="text-sm font-medium text-[#303030] mb-3">{ar ? 'الجلسات حسب الموقع' : 'Sessions by location'}</p>
              <div className="space-y-3">
                {(data?.sessionsByLocation || []).length > 0 ? (
                  data.sessionsByLocation.map((row) => (
                    <HorizontalMetricBar key={row.label} label={row.label} value={row.count} max={locationMax} />
                  ))
                ) : (
                  <p className="text-xs text-[#8a8a8a]">{ar ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
                )}
              </div>
            </div>

            {/* New vs returning */}
            <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
              <p className="text-sm font-medium text-[#303030] mb-3">{ar ? 'عملاء جدد مقابل عائدين' : 'New vs returning customers'}</p>
              <div className="space-y-3">
                <HorizontalMetricBar
                  label={ar ? 'جدد' : 'New'}
                  value={data?.customersSplit?.new ?? 0}
                  max={customerMax}
                />
                <HorizontalMetricBar
                  label={ar ? 'عائدون' : 'Returning'}
                  value={data?.customersSplit?.returning ?? 0}
                  max={customerMax}
                />
              </div>
            </div>

            {/* Sales by product */}
            <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
              <p className="text-sm font-medium text-[#303030] mb-3">{ar ? 'المبيعات حسب المنتج' : 'Total sales by product'}</p>
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {(data?.salesByProduct || []).length > 0 ? (
                  data.salesByProduct.map((p) => (
                    <div key={p.productId} className="flex items-center gap-3">
                      <img
                        src={resolveMediaUrl(p.image) || 'https://via.placeholder.com/40'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-[#f6f6f7] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#303030] truncate">{ar ? p.nameAr : p.name}</p>
                        <p className="text-xs text-[#616161]">×{p.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-[#303030] whitespace-nowrap">{formatEgp(p.revenue, true)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#8a8a8a]">{ar ? 'لا توجد مبيعات اليوم' : 'No sales today yet'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Globe */}
          <div className="flex-1 p-4 pt-0 lg:pt-4 lg:ps-0 min-h-[50vh] lg:min-h-0 flex flex-col">
            <LiveViewGlobe
              visitors={data?.globe?.visitors || []}
              orders={data?.globe?.orders || []}
              ar={ar}
            />
          </div>
        </div>
      )}
    </div>
  );
}
