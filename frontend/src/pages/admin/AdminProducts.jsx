import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Package, FileText, Download } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice, getProductImage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const navigate = useNavigate();
  const { language } = useSelector((s) => s.ui);
  const isAr = language === 'ar';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const fetchProducts = useCallback((page = 1) => {
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    api
      .get(`/admin/products?limit=20&page=${page}${q}`)
      .then(({ data }) => {
        setProducts(data.data);
        setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const pageIds = products.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const selectAllMatched = async () => {
    try {
      const q = search ? `search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/admin/products/ids?${q}`);
      const next = new Set(data.ids || []);
      setSelectedIds(next);
      if (data.truncated) {
        toast(
          isAr
            ? `تم اختيار أول 5000 من ${data.totalMatched} منتج. قلّص البحث ليشمل الكل في التصدير.`
            : `Selected first 5000 of ${data.totalMatched} matches. Narrow search if needed.`,
          { duration: 5000 },
        );
      } else {
        toast.success(isAr ? `تم تحديد ${next.size} منتج` : `${next.size} products selected`);
      }
    } catch {
      toast.error(isAr ? 'تعذر جلب قائمة المنتجات' : 'Could not fetch product ids');
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exportExcel = async () => {
    const ids = [...selectedIds];
    if (!ids.length) {
      toast.error(isAr ? 'اختر منتجاً واحداً على الأقل' : 'Select at least one product');
      return;
    }
    try {
      const { data } = await api.post('/admin/products/lookup', { ids });
      const list = data.data || [];
      const rows = list.map((p) => ({
        id: p.id,
        sku: p.sku,
        name_ar: p.name_ar,
        name_en: p.name_en,
        category_ar: p.category?.name_ar ?? '',
        category_en: p.category?.name_en ?? '',
        slug: p.slug ?? '',
        price: p.price ?? '',
        sale_price: p.sale_price ?? '',
        stock: p.stock ?? 0,
        sales_count: p.sales_count ?? 0,
        is_active: p.is_active ? 1 : 0,
        thumbnail: p.thumbnail ?? '',
      }));
      const { default: XLSX } = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const name = `misk-products-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, name);
      toast.success(isAr ? 'تم تنزيل الملف' : 'File downloaded');
    } catch {
      toast.error(isAr ? 'فشل التصدير' : 'Export failed');
    }
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) {
      toast.error(isAr ? 'اختر منتجاً واحداً على الأقل' : 'Select at least one product');
      return;
    }
    if (
      !confirm(
        isAr
          ? `حذف ${ids.length} منتج؟ المنتجات المرتبطة بطلبات سابق لن تُحذف.`
          : `Delete ${ids.length} product(s)? Items linked to past orders will be skipped.`,
      )
    ) {
      return;
    }
    try {
      const { data } = await api.post('/admin/products/bulk-delete', { ids });
      const deleted = data.deletedCount ?? 0;
      const blocked = data.blockedIds?.length ?? 0;
      if (blocked) {
        toast(
          isAr
            ? `حُذف ${deleted}. تُرك ${blocked} مرتبطاً بطلبات.`
            : `Deleted ${deleted}. Skipped ${blocked} linked to orders.`,
          { duration: 5000 },
        );
      } else toast.success(isAr ? `تم حذف ${deleted} منتج` : `Deleted ${deleted} products`);
      setSelectedIds((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => {
          if (!data.blockedIds?.includes(id)) n.delete(id);
        });
        return n;
      });
      fetchProducts(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.message || (isAr ? 'فشل الحذف' : 'Delete failed');
      toast.error(msg);
    }
  };

  const handleCreateLandingPage = async (product) => {
    try {
      const { data } = await api.post('/landing-pages', {
        title_ar: `صفحة هبوط - ${product.name_ar}`,
        title_en: `Landing Page - ${product.name_en || product.name_ar}`,
        product_id: product.id,
      });
      toast.success(isAr ? 'تم إنشاء الصفحة' : 'Page created');
      navigate(`/admin/landing-pages/${data.data.id}`);
    } catch {
      toast.error(isAr ? 'خطأ في الإنشاء' : 'Error creating page');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(isAr ? 'حذف المنتج؟' : 'Delete product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      fetchProducts(pagination.page);
    } catch {
      toast.error('Error');
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await api.put(`/products/${id}`, { is_active: !currentStatus });
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p)));
    } catch {
      toast.error('Error');
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isAr ? 'المنتجات' : 'Products'}</h1>
          <p className="text-gray-500 text-sm">
            {pagination.total} {isAr ? 'منتج' : 'products'}
            {selectedIds.size ? ` · ${selectedIds.size} ${isAr ? 'محدد' : 'selected'}` : ''}
          </p>
        </div>
        <Link to="/admin/products/new" className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus size={18} /> {isAr ? 'إضافة منتج' : 'Add Product'}
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder={isAr ? 'ابحث عن منتج أو SKU...' : 'Search products or SKU...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl ps-10 py-2.5 text-sm focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={selectAllMatched} className="text-sm px-3 py-2 rounded-xl border border-primary/25 text-primary font-medium hover:bg-primary-50">
            {isAr ? 'اختيار كل النتائج' : 'Select all matching'}
          </motion.button>
          <button type="button" onClick={clearSelection} className="text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            {isAr ? 'إلغاء التحديد' : 'Clear selection'}
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={exportExcel}
            className="text-sm px-3 py-2 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download size={16} /> {isAr ? 'تصدير Excel' : 'Export Excel'} ({selectedIds.size})
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={bulkDelete}
            className="text-sm px-3 py-2 rounded-xl bg-red-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Trash2 size={16} /> {isAr ? 'حذف المحدد' : 'Delete selected'} ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allPageSelected && somePageSelected;
                    }}
                    onChange={toggleSelectPage}
                    className="rounded border-gray-300 text-primary"
                    aria-label={isAr ? 'تحديد الصفحة' : 'Select page'}
                  />
                </th>
                {[isAr ? 'المنتج' : 'Product', 'SKU', isAr ? 'السعر' : 'Price', isAr ? 'المخزون' : 'Stock', isAr ? 'المبيعات' : 'Sales', isAr ? 'الحالة' : 'Status', isAr ? 'إجراءات' : 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="skeleton h-10 rounded" />
                    </td>
                  </tr>
                ))
              ) : (
                products.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? 'bg-primary-50/40' : ''}`}>
                    <td className="px-3 py-3 align-middle">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleRow(p.id)} className="rounded border-gray-300 text-primary" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={getProductImage(p) || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{isAr ? p.name_ar : p.name_en}</p>
                          <p className="text-xs text-gray-400">{p.category?.name_en}</p>
                          {!p.is_active && (
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{isAr ? 'مخفي' : 'inactive'}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.sku}</td>
                    <td className="px-4 py-3">
                      {p.sale_price ? (
                        <div>
                          <p className="text-accent font-bold text-sm">{formatPrice(p.sale_price, 'EGP', 'en')}</p>
                          <p className="text-gray-400 text-xs line-through">{formatPrice(p.price, 'EGP', 'en')}</p>
                        </div>
                      ) : (
                        <p className="text-primary font-semibold text-sm">{formatPrice(p.price, 'EGP', 'en')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.sales_count}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => handleToggle(p.id, p.is_active)}>
                        {p.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/products/${p.slug}`} target="_blank" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                          <Eye size={16} />
                        </Link>
                        <Link to={`/admin/products/${p.id}/edit`} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg">
                          <Edit size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCreateLandingPage(p)}
                          title={isAr ? 'إنشاء صفحة هبوط' : 'Create Landing Page'}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                        >
                          <FileText size={16} />
                        </button>
                        <button type="button" onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400">{isAr ? 'لا توجد منتجات' : 'No products found'}</p>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => fetchProducts(pageNum)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold ${
                pagination.page === pageNum ? 'bg-primary text-white' : 'border border-gray-200 hover:border-primary text-gray-600'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
