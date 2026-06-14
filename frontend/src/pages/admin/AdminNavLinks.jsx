import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ToggleLeft, ToggleRight, Edit, Package, Search, X, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { clearNavLinksCache } from '../../utils/navLinksCache';
import { resolveMediaUrl } from '../../utils/helpers';

const FILTER_FIELDS = [
  { key: 'gender', label: 'Gender', type: 'select', options: ['', 'men', 'women'] },
  { key: 'category_slug', label: 'Category slug', type: 'text' },
  { key: 'new_arrivals', label: 'New arrivals', type: 'checkbox' },
  { key: 'best_sellers', label: 'Best sellers', type: 'checkbox' },
  { key: 'on_sale', label: 'On sale', type: 'checkbox' },
  { key: 'featured', label: 'Featured', type: 'checkbox' },
];

export default function AdminNavLinks() {
  const { language } = useSelector((s) => s.ui);
  const isAr = language === 'ar';

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assignedProducts, setAssignedProducts] = useState([]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/nav-links');
      setLinks(data.data || []);
    } catch {
      toast.error(isAr ? 'تعذر تحميل روابط القائمة' : 'Failed to load nav links');
    }
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const openEdit = async (link) => {
    setEditing({
      ...link,
      filter_config: { ...(link.filter_config || {}) },
      product_ids: [...(link.product_ids || [])],
    });
    setProductSearch('');
    setSearchResults([]);
    if (link.product_ids?.length) {
      try {
        const { data } = await api.post('/admin/products/lookup', { ids: link.product_ids });
        setAssignedProducts(data.data || []);
      } catch {
        setAssignedProducts([]);
      }
    } else {
      setAssignedProducts([]);
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setAssignedProducts([]);
    setSearchResults([]);
    setProductSearch('');
  };

  const handleToggle = async (id, active) => {
    try {
      await api.patch(`/admin/nav-links/${id}/toggle`);
      clearNavLinksCache();
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: !active } : l)));
      toast.success(isAr ? 'تم التحديث' : 'Updated');
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Error');
    }
  };

  const updateFilter = (key, value) => {
    setEditing((prev) => {
      const filter_config = { ...prev.filter_config };
      if (value === '' || value === false) delete filter_config[key];
      else filter_config[key] = value;
      return { ...prev, filter_config };
    });
  };

  const searchProducts = async () => {
    if (!productSearch.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/admin/products?search=${encodeURIComponent(productSearch.trim())}&limit=20`);
      setSearchResults(data.data || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const addProduct = (product) => {
    if (editing.product_ids.includes(product.id)) return;
    setEditing((prev) => ({ ...prev, product_ids: [...prev.product_ids, product.id] }));
    setAssignedProducts((prev) => [...prev, product]);
  };

  const removeProduct = (id) => {
    setEditing((prev) => ({ ...prev, product_ids: prev.product_ids.filter((pid) => pid !== id) }));
    setAssignedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/nav-links/${editing.id}`, {
        label_en: editing.label_en,
        label_ar: editing.label_ar,
        href: editing.href,
        link_type: editing.link_type,
        sort_order: editing.sort_order,
        filter_config: editing.filter_config,
        product_ids: editing.product_ids,
      });
      clearNavLinksCache();
      setLinks((prev) => prev.map((l) => (l.id === editing.id ? data.data : l)));
      toast.success(isAr ? 'تم الحفظ' : 'Saved');
      closeEdit();
    } catch {
      toast.error(isAr ? 'فشل الحفظ' : 'Save failed');
    }
    setSaving(false);
  };

  const label = (link) => (isAr ? (link.label_ar || link.label_en) : link.label_en);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">{isAr ? 'روابط القائمة' : 'Navigation Links'}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isAr
            ? 'إدارة روابط الشريط العلوي والمنتجات المعروضة في كل صفحة. الروابط المعطّلة تظهر بخط في المنتصف.'
            : 'Manage top navbar links and products shown on each page. Disabled links appear with a line-through.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{isAr ? 'الرابط' : 'Link'}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">URL</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">{isAr ? 'منتجات' : 'Products'}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{label(link)}</p>
                    <p className="text-xs text-gray-400">{link.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">{link.href}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Package size={14} />
                      {(link.product_ids || []).length || (isAr ? 'فلتر تلقائي' : 'Auto filter')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(link.id, link.is_active)}
                      className="flex items-center gap-1 text-xs font-semibold"
                    >
                      {link.is_active
                        ? <><ToggleRight size={22} className="text-green-600" /> {isAr ? 'مفعّل' : 'Active'}</>
                        : <><ToggleLeft size={22} className="text-gray-400" /> {isAr ? 'معطّل' : 'Disabled'}</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(link)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary text-xs font-semibold"
                    >
                      <Edit size={14} />
                      {isAr ? 'تعديل' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{label(editing)}</h2>
              <button type="button" onClick={closeEdit} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Label (EN)</span>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={editing.label_en}
                    onChange={(e) => setEditing((p) => ({ ...p, label_en: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Label (AR)</span>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={editing.label_ar || ''}
                    onChange={(e) => setEditing((p) => ({ ...p, label_ar: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">URL</span>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                  value={editing.href}
                  onChange={(e) => setEditing((p) => ({ ...p, href: e.target.value }))}
                />
              </label>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  {isAr ? 'فلتر تلقائي (يُستخدم عند عدم تعيين منتجات)' : 'Auto filter (used when no products are assigned)'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FILTER_FIELDS.map((field) => (
                    <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700">
                      {field.type === 'checkbox' ? (
                        <>
                          <input
                            type="checkbox"
                            checked={!!editing.filter_config?.[field.key]}
                            onChange={(e) => updateFilter(field.key, e.target.checked)}
                          />
                          {field.label}
                        </>
                      ) : field.type === 'select' ? (
                        <div className="w-full">
                          <span className="text-xs text-gray-400 block mb-1">{field.label}</span>
                          <select
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            value={editing.filter_config?.[field.key] || ''}
                            onChange={(e) => updateFilter(field.key, e.target.value)}
                          >
                            {field.options.map((opt) => (
                              <option key={opt || 'any'} value={opt}>{opt || 'Any'}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="w-full">
                          <span className="text-xs text-gray-400 block mb-1">{field.label}</span>
                          <input
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                            value={editing.filter_config?.[field.key] || ''}
                            onChange={(e) => updateFilter(field.key, e.target.value)}
                          />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  {isAr ? 'منتجات مخصصة (تتجاوز الفلتر التلقائي)' : 'Assigned products (override auto filter)'}
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    placeholder={isAr ? 'بحث عن منتج...' : 'Search products...'}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchProducts())}
                  />
                  <button type="button" onClick={searchProducts} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-semibold flex items-center gap-1">
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {isAr ? 'بحث' : 'Search'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-gray-100 rounded-xl mb-4 max-h-40 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                      >
                        {p.images?.[0] && (
                          <img src={resolveMediaUrl(p.images[0].url)} alt="" className="w-8 h-8 object-cover rounded" />
                        )}
                        <span className="text-sm text-gray-700 truncate">{p.name_en || p.name_ar}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {assignedProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      {p.images?.[0] && (
                        <img src={resolveMediaUrl(p.images[0].url)} alt="" className="w-8 h-8 object-cover rounded" />
                      )}
                      <span className="flex-1 text-sm text-gray-700 truncate">{p.name_en || p.name_ar}</span>
                      <button type="button" onClick={() => removeProduct(p.id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ))}
                  {assignedProducts.length === 0 && (
                    <p className="text-xs text-gray-400">{isAr ? 'لا توجد منتجات مخصصة' : 'No assigned products'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button type="button" onClick={closeEdit} className="px-4 py-2 text-sm font-semibold text-gray-500">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
