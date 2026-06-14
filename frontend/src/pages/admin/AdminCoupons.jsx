import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const empty = { code: '', type: 'percentage', value: '', min_order_amount: '0', max_discount_amount: '', usage_limit: '', is_active: true, expires_at: '', description_ar: '', description_en: '' };

export default function AdminCoupons() {
  const { language } = useSelector((s) => s.ui);
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const fetchCoupons = () => api.get('/admin/coupons').then(({ data }) => setCoupons(data.data)).catch(() => {});
  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/admin/coupons/${editId}`, form);
      else await api.post('/admin/coupons', form);
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
      fetchCoupons(); setShowForm(false); setForm(empty); setEditId(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/admin/coupons/${id}`);
    fetchCoupons();
    toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
  };

  const handleToggle = async (id, active) => {
    await api.put(`/admin/coupons/${id}`, { is_active: !active });
    setCoupons(cs => cs.map(c => c.id === id ? { ...c, is_active: !active } : c));
  };

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'الكوبونات' : 'Coupons'}</h1>
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus size={18} /> {language === 'ar' ? 'إضافة كوبون' : 'Add Coupon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">{editId ? (language === 'ar' ? 'تعديل' : 'Edit') : (language === 'ar' ? 'كوبون جديد' : 'New Coupon')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'الكود *' : 'Code *'}</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input-field font-mono" required dir="ltr" /></div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="percentage">{language === 'ar' ? 'نسبة مئوية %' : 'Percentage %'}</option>
                <option value="fixed">{language === 'ar' ? 'مبلغ ثابت ج.م' : 'Fixed Amount EGP'}</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'القيمة *' : 'Value *'}</label><input type="number" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="input-field" required dir="ltr" /></div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order'}</label><input type="number" min="0" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'أقصى خصم' : 'Max Discount'}</label><input type="number" min="0" value={form.max_discount_amount} onChange={e => setForm({ ...form, max_discount_amount: e.target.value })} className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'حد الاستخدام' : 'Usage Limit'}</label><input type="number" min="0" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium mb-1.5">{language === 'ar' ? 'تنتهي في' : 'Expires At'}</label><input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="input-field" dir="ltr" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-primary px-6">{language === 'ar' ? 'حفظ' : 'Save'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-6">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{[language === 'ar' ? 'الكود' : 'Code', language === 'ar' ? 'النوع' : 'Type', language === 'ar' ? 'القيمة' : 'Value', language === 'ar' ? 'الاستخدام' : 'Used', language === 'ar' ? 'ينتهي' : 'Expires', language === 'ar' ? 'الحالة' : 'Status', ''].map(h => (
              <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.type === 'percentage' ? '%' : 'EGP'}</td>
                <td className="px-4 py-3 text-sm font-semibold">{c.value}{c.type === 'percentage' ? '%' : ' ج.م'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{c.expires_at ? formatDate(c.expires_at, 'en') : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(c.id, c.is_active)}>
                    {c.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditId(c.id); setForm(c); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && (
          <div className="text-center py-12 text-gray-300">{language === 'ar' ? 'لا توجد كوبونات' : 'No coupons'}</div>
        )}
      </div>
    </div>
  );
}
