import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, BarChart3, Globe, FileText,
  Package, TrendingUp, ShoppingCart, ExternalLink, Search,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/helpers';

const STATUS_BADGE = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
};

export default function AdminLandingPages() {
  const navigate = useNavigate();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState([]);
  const [newPage, setNewPage] = useState({ title_ar: '', title_en: '', product_id: '' });

  useEffect(() => {
    fetchPages();
    api.get('/products?limit=100').then(({ data }) => setProducts(data.data || [])).catch(() => {});
  }, []);

  const fetchPages = () => {
    setLoading(true);
    api.get('/landing-pages')
      .then(({ data }) => setPages(data.data || []))
      .catch(() => toast.error(ar ? 'خطأ في تحميل الصفحات' : 'Error loading pages'))
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPage.title_ar.trim()) {
      toast.error(ar ? 'العنوان بالعربي مطلوب' : 'Arabic title is required');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/landing-pages', newPage);
      toast.success(ar ? 'تم إنشاء الصفحة' : 'Page created');
      navigate(`/admin/landing-pages/${data.data.id}`);
    } catch {
      toast.error(ar ? 'خطأ في الإنشاء' : 'Creation error');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(ar ? 'هل تريد حذف هذه الصفحة نهائياً؟' : 'Delete this page permanently?')) return;
    try {
      await api.delete(`/landing-pages/${id}`);
      toast.success(ar ? 'تم الحذف' : 'Deleted');
      setPages(ps => ps.filter(p => p.id !== id));
    } catch {
      toast.error(ar ? 'خطأ في الحذف' : 'Delete error');
    }
  };

  const handleToggleStatus = async (page) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/landing-pages/${page.id}`, { status: newStatus });
      setPages(ps => ps.map(p => p.id === page.id ? { ...p, status: newStatus } : p));
      toast.success(newStatus === 'published' ? (ar ? 'تم النشر' : 'Published') : (ar ? 'تم إلغاء النشر' : 'Unpublished'));
    } catch {
      toast.error('Error');
    }
  };

  const filtered = pages.filter(p =>
    (p.title_ar || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.title_en || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalViews = pages.reduce((s, p) => s + (p.views || 0), 0);
  const totalOrders = pages.reduce((s, p) => s + (p.orders || 0), 0);
  const published = pages.filter(p => p.status === 'published').length;

  return (
    <div className="space-y-6" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{ar ? 'صفحات الهبوط' : 'Landing Pages'}</h1>
          <p className="text-gray-500 text-sm mt-1">{ar ? 'أنشئ وأدر صفحات هبوط احترافية لمنتجاتك' : 'Create and manage professional landing pages for your products'}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} /> {ar ? 'صفحة جديدة' : 'New Page'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: ar ? 'إجمالي الصفحات' : 'Total Pages', value: pages.length, icon: FileText, color: 'blue' },
          { label: ar ? 'منشورة' : 'Published', value: published, icon: Globe, color: 'green' },
          { label: ar ? 'إجمالي المشاهدات' : 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'purple' },
          { label: ar ? 'طلبات من الصفحات' : 'Orders from Pages', value: totalOrders, icon: ShoppingCart, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-${color}-50`}>
              <Icon size={20} className={`text-${color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder={ar ? 'ابحث عن صفحة...' : 'Search pages...'}
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl ps-10 py-2.5 text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">{ar ? 'لا توجد صفحات هبوط بعد' : 'No landing pages yet'}</p>
            <p className="text-gray-300 text-sm mt-1">{ar ? 'أنشئ أول صفحة هبوط لمنتجاتك' : 'Create your first landing page'}</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 text-primary text-sm font-medium hover:underline">
              {ar ? '+ إنشاء صفحة' : '+ Create Page'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[ar ? 'الصفحة' : 'Page', ar ? 'المنتج' : 'Product', ar ? 'الحالة' : 'Status',
                    ar ? 'المشاهدات' : 'Views', ar ? 'الطلبات' : 'Orders', ar ? 'التحويل' : 'Conv.',
                    ar ? 'إجراءات' : 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((page) => {
                  const conv = page.views > 0 ? ((page.orders / page.views) * 100).toFixed(1) : '0.0';
                  return (
                    <motion.tr key={page.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{page.title_ar}</p>
                          {page.title_en && <p className="text-gray-400 text-xs">{page.title_en}</p>}
                          <p className="text-gray-300 text-xs mt-0.5">/lp/{page.slug}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {page.product ? (
                          <div className="flex items-center gap-2">
                            {page.product.thumbnail && (
                              <img src={resolveMediaUrl(page.product.thumbnail)} className="w-8 h-8 rounded-lg object-cover" />
                            )}
                            <span className="text-sm text-gray-700">{page.product.name_ar}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleStatus(page)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${STATUS_BADGE[page.status]}`}>
                          {page.status === 'published' ? (ar ? 'منشور' : 'Published') : (ar ? 'مسودة' : 'Draft')}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{(page.views || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{page.orders || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${parseFloat(conv) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {conv}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/admin/landing-pages/${page.id}`)}
                            title={ar ? 'تعديل' : 'Edit'}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => navigate(`/admin/landing-pages/${page.id}/analytics`)}
                            title={ar ? 'التقارير' : 'Analytics'}
                            className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors text-purple-500">
                            <BarChart3 size={15} />
                          </button>
                          {page.status === 'published' && (
                            <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer"
                              title={ar ? 'معاينة' : 'Preview'}
                              className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-green-500">
                              <ExternalLink size={15} />
                            </a>
                          )}
                          <button onClick={() => handleDelete(page.id)}
                            title={ar ? 'حذف' : 'Delete'}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-800 mb-5">{ar ? 'إنشاء صفحة هبوط جديدة' : 'Create New Landing Page'}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ar ? 'العنوان بالعربي *' : 'Title in Arabic *'}
                </label>
                <input
                  value={newPage.title_ar}
                  onChange={(e) => setNewPage(p => ({ ...p, title_ar: e.target.value }))}
                  placeholder={ar ? 'مثال: عرض خاص - عباية الفراشة' : 'e.g. Special Offer - Butterfly Abaya'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ar ? 'العنوان بالإنجليزي' : 'Title in English'}
                </label>
                <input
                  value={newPage.title_en}
                  onChange={(e) => setNewPage(p => ({ ...p, title_en: e.target.value }))}
                  placeholder="e.g. Special Offer - Butterfly Abaya"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ar ? 'المنتج المرتبط (اختياري)' : 'Linked Product (optional)'}
                </label>
                <select
                  value={newPage.product_id}
                  onChange={(e) => setNewPage(p => ({ ...p, product_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary outline-none bg-white"
                >
                  <option value="">{ar ? '-- بدون منتج --' : '-- No product --'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {creating ? (ar ? 'جاري الإنشاء...' : 'Creating...') : (ar ? 'إنشاء والتعديل' : 'Create & Edit')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
