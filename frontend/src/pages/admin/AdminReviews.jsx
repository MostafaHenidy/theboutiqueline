import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Check, Trash2, Star } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminReviews() {
  const { language } = useSelector((s) => s.ui);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('false');
  const [loading, setLoading] = useState(true);

  const fetchReviews = () => {
    setLoading(true);
    api.get(`/reviews/admin?is_approved=${filter}&limit=30`).then(({ data }) => setReviews(data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchReviews(); }, [filter]);

  const handleApprove = async (id) => {
    await api.put(`/reviews/${id}/approve`);
    toast.success(language === 'ar' ? 'تم القبول' : 'Approved');
    fetchReviews();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/reviews/${id}`);
    fetchReviews();
  };

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'التقييمات' : 'Reviews'}</h1>
        <div className="flex gap-2">
          {[{ v: 'false', l: language === 'ar' ? 'معلقة' : 'Pending' }, { v: 'true', l: language === 'ar' ? 'مقبولة' : 'Approved' }].map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === v ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 m-4 rounded-xl" />) :
            reviews.length === 0 ? (
              <div className="text-center py-12"><Star size={40} className="mx-auto text-gray-200 mb-2" /><p className="text-gray-400">{language === 'ar' ? 'لا توجد تقييمات' : 'No reviews'}</p></div>
            ) : reviews.map((r) => (
              <div key={r.id} className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                  {r.user?.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{r.user?.name}</p>
                      <p className="text-xs text-gray-400">{r.product?.name_ar || r.product?.name_en} • {formatDate(r.created_at, 'en')}</p>
                    </div>
                    <div className="flex gap-1">
                      {filter === 'false' && (
                        <button onClick={() => handleApprove(r.id)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                      )}
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < r.rating ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'} />)}
                  </div>
                  {r.body && <p className="text-gray-600 text-sm mt-1">{r.body}</p>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
