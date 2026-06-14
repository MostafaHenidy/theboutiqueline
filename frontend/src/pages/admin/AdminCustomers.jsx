import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminCustomers() {
  const { language } = useSelector((s) => s.ui);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchCustomers = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    api.get(`/admin/users?${params}`).then(({ data }) => {
      setCustomers(data.data);
      setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const handleToggle = async (id) => {
    try {
      await api.put(`/admin/users/${id}/toggle-status`);
      setCustomers(cs => cs.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
    } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'العملاء' : 'Customers'}</h1>
          <p className="text-gray-500 text-sm">{pagination.total} {language === 'ar' ? 'عميل' : 'customers'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={language === 'ar' ? 'ابحث بالاسم أو البريد...' : 'Search by name or email...'}
            className="w-full border border-gray-200 rounded-xl ps-9 py-2.5 text-sm focus:border-primary outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>{[language === 'ar' ? 'العميل' : 'Customer', language === 'ar' ? 'الهاتف' : 'Phone', language === 'ar' ? 'التحقق' : 'Verified', language === 'ar' ? 'تاريخ التسجيل' : 'Registered', language === 'ar' ? 'الحالة' : 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton h-12 mx-4 my-2 rounded" /></td></tr>
              )) : customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                        <p className="text-xs text-gray-400" dir="ltr">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500" dir="ltr">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${c.email_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.email_verified ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.created_at, 'en')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(c.id)}>
                      {c.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && !loading && (
          <div className="text-center py-12"><Users size={40} className="mx-auto text-gray-200 mb-2" /><p className="text-gray-400">{language === 'ar' ? 'لا يوجد عملاء' : 'No customers'}</p></div>
        )}
      </div>
    </div>
  );
}
