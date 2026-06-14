import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, ArrowLeft, Eye, ShoppingCart, TrendingUp, Calendar, Globe } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminLandingPageAnalytics() {
  const { id } = useParams();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';

  const [page, setPage] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/landing-pages/${id}`),
      api.get(`/landing-pages/${id}/analytics`),
    ]).then(([pageRes, analyticsRes]) => {
      setPage(pageRes.data.data);
      setAnalytics(analyticsRes.data.data);
    }).catch(() => {
      toast.error(ar ? 'خطأ في تحميل البيانات' : 'Error loading data');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-gray-400">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const maxCount = analytics?.dailyViews?.length
    ? Math.max(...analytics.dailyViews.map(d => parseInt(d.count) || 0), 1)
    : 1;

  return (
    <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/landing-pages" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          {ar ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{ar ? 'تقارير الصفحة' : 'Page Analytics'}</h1>
          <p className="text-gray-400 text-sm">{page?.title_ar} — /lp/{page?.slug}</p>
        </div>
        <Link to={`/admin/landing-pages/${id}`}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          {ar ? 'تعديل الصفحة' : 'Edit Page'}
        </Link>
        {page?.status === 'published' && (
          <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm hover:bg-primary/90 transition-colors">
            <Globe size={16} /> {ar ? 'معاينة' : 'Preview'}
          </a>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: ar ? 'إجمالي المشاهدات' : 'Total Views', value: analytics?.totalViews || 0, icon: Eye, color: 'blue', sub: `${analytics?.monthViews || 0} ${ar ? 'هذا الشهر' : 'this month'}` },
          { label: ar ? 'مشاهدات الأسبوع' : 'Weekly Views', value: analytics?.weekViews || 0, icon: Calendar, color: 'cyan', sub: ar ? 'آخر 7 أيام' : 'Last 7 days' },
          { label: ar ? 'إجمالي الطلبات' : 'Total Orders', value: analytics?.totalOrders || 0, icon: ShoppingCart, color: 'green', sub: `${analytics?.monthOrders || 0} ${ar ? 'هذا الشهر' : 'this month'}` },
          { label: ar ? 'معدل التحويل' : 'Conversion Rate', value: `${analytics?.conversionRate || 0}%`, icon: TrendingUp, color: 'purple', sub: ar ? 'من مشاهدة لطلب' : 'Views to orders' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-${color}-50`}>
              <Icon size={20} className={`text-${color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
            <p className="text-gray-300 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Daily views chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-5">{ar ? 'المشاهدات اليومية (آخر 30 يوم)' : 'Daily Views (Last 30 Days)'}</h3>
        {analytics?.dailyViews?.length > 0 ? (
          <div className="flex items-end gap-1 h-40">
            {analytics.dailyViews.map((day) => {
              const pct = Math.round((parseInt(day.count) / maxCount) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-6 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.date}: {day.count}
                  </div>
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-sm transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <Eye size={32} className="mx-auto mb-2 opacity-50" />
              <p>{ar ? 'لا توجد مشاهدات بعد' : 'No views yet'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">{ar ? 'ملخص الأداء' : 'Performance Summary'}</h3>
        <div className="space-y-3">
          {[
            { label: ar ? 'حالة الصفحة' : 'Page Status', value: page?.status === 'published' ? (ar ? 'منشور' : 'Published') : (ar ? 'مسودة' : 'Draft'), badge: page?.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700' },
            { label: ar ? 'رابط الصفحة' : 'Page URL', value: `/lp/${page?.slug}`, mono: true },
            { label: ar ? 'المنتج المرتبط' : 'Linked Product', value: page?.product?.name_ar || (ar ? 'لا يوجد' : 'None') },
            { label: ar ? 'تاريخ الإنشاء' : 'Created At', value: page?.created_at ? new Date(page.created_at).toLocaleDateString('ar-SA') : '—' },
          ].map(({ label, value, badge, mono }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500 text-sm">{label}</span>
              {badge ? (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge}`}>{value}</span>
              ) : (
                <span className={`text-sm font-medium text-gray-700 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
