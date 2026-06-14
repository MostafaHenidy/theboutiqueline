import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Users, Package, AlertTriangle, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { formatPrice, formatDate, createdAtOf, getStatusColor, getProductImage } from '../../utils/helpers';
import api from '../../utils/api';

export default function AdminDashboard() {
  const { language } = useSelector((s) => s.ui);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
    </div>
  );

  const statCards = [
    { title: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', value: formatPrice(stats?.stats.totalRevenue || 0, 'EGP', language), icon: DollarSign, trend: `+${stats?.stats.revenueGrowth || 0}%` },
    { title: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders', value: stats?.stats.totalOrders || 0, icon: ShoppingCart, sub: `${stats?.stats.ordersMonth} ${language === 'ar' ? 'هذا الشهر' : 'this month'}` },
    { title: language === 'ar' ? 'العملاء' : 'Customers', value: stats?.stats.totalUsers || 0, icon: Users, sub: `+${stats?.stats.newUsersMonth} ${language === 'ar' ? 'جديد' : 'new'}` },
    { title: language === 'ar' ? 'المنتجات' : 'Products', value: stats?.stats.totalProducts || 0, icon: Package, sub: `${stats?.stats.lowStockProducts} ${language === 'ar' ? 'نفاد مخزون' : 'low stock'}` },
  ];

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="admin-page-title">{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</h1>
        <p className="admin-page-subtitle">{language === 'ar' ? 'مرحباً! هذا ملخص أداء المتجر' : 'Welcome! Here\'s your store performance summary'}</p>
      </div>

      {(stats?.stats.pendingOrders > 0 || stats?.stats.pendingReviews > 0 || stats?.stats.lowStockProducts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.stats.pendingOrders > 0 && (
            <Link to="/admin/orders?status=pending">
              <div className="admin-alert p-4 flex items-center gap-3">
                <Clock size={20} className="admin-alert__icon flex-shrink-0" />
                <div>
                  <p className="admin-alert__title">{stats.stats.pendingOrders} {language === 'ar' ? 'طلب معلق' : 'Pending Orders'}</p>
                  <p className="admin-alert__sub">{language === 'ar' ? 'يحتاج مراجعة' : 'Needs review'}</p>
                </div>
              </div>
            </Link>
          )}
          {stats?.stats.lowStockProducts > 0 && (
            <Link to="/admin/products">
              <div className="admin-alert p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="admin-alert__icon flex-shrink-0" />
                <div>
                  <p className="admin-alert__title">{stats.stats.lowStockProducts} {language === 'ar' ? 'منتج مخزون منخفض' : 'Low Stock Products'}</p>
                  <p className="admin-alert__sub">{language === 'ar' ? 'يحتاج تجديد' : 'Needs restocking'}</p>
                </div>
              </div>
            </Link>
          )}
          {stats?.stats.pendingReviews > 0 && (
            <Link to="/admin/reviews">
              <div className="admin-alert p-4 flex items-center gap-3">
                <BarChart3 size={20} className="admin-alert__icon flex-shrink-0" />
                <div>
                  <p className="admin-alert__title">{stats.stats.pendingReviews} {language === 'ar' ? 'تقييم معلق' : 'Pending Reviews'}</p>
                  <p className="admin-alert__sub">{language === 'ar' ? 'ينتظر الموافقة' : 'Awaiting approval'}</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, sub, trend }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="admin-card p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="admin-stat-icon w-12 h-12 flex items-center justify-center">
                <Icon size={22} />
              </div>
              {trend && <span className="admin-trend">{trend}</span>}
            </div>
            <p className="admin-stat-value">{value}</p>
            <p className="admin-stat-label">{title}</p>
            {sub && <p className="admin-stat-sub">{sub}</p>}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <h3 className="admin-section-title mb-4">{language === 'ar' ? 'المبيعات الشهرية' : 'Monthly Sales'}</h3>
          <div className="flex items-end gap-2 h-40">
            {stats?.salesByMonth?.length > 0 ? stats.salesByMonth.map((m, i) => {
              const maxRev = Math.max(...stats.salesByMonth.map(x => parseFloat(x.revenue || 0)));
              const height = maxRev > 0 ? (parseFloat(m.revenue) / maxRev) * 100 : 10;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="admin-chart-bar w-full transition-all duration-300 relative"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {formatPrice(m.revenue, 'EGP', 'en')}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-dim">{m.month}</span>
                </div>
              );
            }) : (
              <div className="flex items-center justify-center w-full h-full text-foreground-dim text-sm">
                {language === 'ar' ? 'لا توجد بيانات' : 'No data yet'}
              </div>
            )}
          </div>
        </div>

        <div className="admin-card p-6">
          <h3 className="admin-section-title mb-4">{language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top Selling Products'}</h3>
          <div className="space-y-3">
            {stats?.topProducts?.length > 0 ? stats.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground-dim w-5">{i + 1}</span>
                <img src={getProductImage(p) || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 object-cover border border-line" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground truncate">{language === 'ar' ? p.name_ar : p.name_en}</p>
                  <p className="text-[10px] text-foreground-dim mt-0.5">{p.sales_count} {language === 'ar' ? 'مبيعة' : 'sold'}</p>
                </div>
                <p className="text-xs font-bold text-boutique">{formatPrice(p.price, 'EGP', language)}</p>
              </div>
            )) : (
              <p className="text-foreground-dim text-sm text-center py-6">{language === 'ar' ? 'لا توجد بيانات' : 'No data yet'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h3 className="admin-section-title">{language === 'ar' ? 'أحدث الطلبات' : 'Recent Orders'}</h3>
          <Link
            to="/admin/orders"
            className="text-[10px] font-bold uppercase tracking-widest text-boutique hover:opacity-80 transition-opacity"
            style={{ letterSpacing: '0.1em' }}
          >
            {language === 'ar' ? 'عرض الكل' : 'View All'}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                {[language === 'ar' ? 'رقم الطلب' : 'Order', language === 'ar' ? 'العميل' : 'Customer', language === 'ar' ? 'المبلغ' : 'Total', language === 'ar' ? 'الحالة' : 'Status', language === 'ar' ? 'التاريخ' : 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats?.recentOrders?.slice(0, 8).map((order) => (
                <tr key={order.id} className="transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/admin/orders" className="text-boutique font-bold text-xs hover:opacity-80">#{order.order_number}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">{order.user?.name}</p>
                      <p className="text-[10px] text-foreground-dim">{order.user?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-boutique">{formatPrice(order.total, 'EGP', language)}</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${getStatusColor(order.status)}`}>{order.status}</span></td>
                  <td className="px-4 py-3 text-[10px] text-foreground-dim whitespace-nowrap">{formatDate(createdAtOf(order), language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
