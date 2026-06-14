import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, RefreshCw, Eye, X } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice, formatDate, createdAtOf, getStatusColor, resolveMediaUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

function parseOrderAddress(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

function shortenWamid(id) {
  if (!id || typeof id !== 'string') return '';
  const t = id.trim();
  if (t.length <= 36) return t;
  return `${t.slice(0, 18)}…${t.slice(-14)}`;
}

/** Same precedence as WhatsApp notify: checkout may use mobile/tel/etc. */
function addressPhone(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const keys = ['phone', 'mobile', 'phone_number', 'tel', 'telephone', 'whatsapp', 'whatsapp_number'];
  for (const k of keys) {
    const v = addr[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export default function AdminOrders() {
  const { language } = useSelector((s) => s.ui);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const fetchOrders = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 20, page });
    if (filter) params.set('status', filter);
    if (search) params.set('search', search);
    api.get(`/orders/admin?${params}`).then(({ data }) => {
      setOrders(data.data);
      setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter, search]);

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      const { data } = await api.put(`/orders/${selectedOrder.id}/status`, { status: newStatus, tracking_number: trackingNumber });

      const ce = data?.customer_email;
      if (ce?.sent) {
        toast.success(language === 'ar' ? 'تم تحديث الحالة وإرسال بريد تحديث للعميل' : 'Status updated — customer email sent');
      } else {
        toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      }
      if (!ce?.sent && ce?.skipped === 'master_off') {
        toast.error(language === 'ar'
          ? 'البريد لم يُرسَل: إشعارات حالة الطلب معطّلة في الإعدادات → SMTP'
          : 'Email not sent: order email notifications are OFF in Settings → SMTP');
      } else if (!ce?.sent && ce?.skipped === 'status_off') {
        toast.error(language === 'ar'
          ? 'البريد لم يُرسَل: هذه الحالة غير مفعّلة في قائمة «أي مراحل ترسل للعميل»'
          : 'Email not sent: this status is disabled under “Which statuses notify…”');
      } else if (!ce?.sent && ce?.skipped === 'no_email') {
        toast.error(language === 'ar'
          ? 'البريد لم يُرسَل: لا يوجد بريد على الفاتورة أو الضيف أو حساب المستخدم'
          : 'Email not sent: no customer email on invoice, guest record, or account');
      } else if (!ce?.sent && ce?.skipped === 'send_failed') {
        const detail = ce.smtp_message ? ` — ${ce.smtp_message}` : '';
        toast.error(
          (language === 'ar'
            ? `فشل إرسال البريد (SMTP)${detail}`
            : `Email send failed (SMTP)${detail}`),
          { duration: 9000, style: { maxWidth: 520 } },
        );
      }

      const w = data?.whatsapp;
      if (w?.sent) {
        const waLine =
          language === 'ar'
            ? 'واتساب: قبل Meta الطلب؛ التسليم قد لا يكون فورياً. لم يصل شيء؟ تحقَّق أن التطبيق Live في Meta وأن الرقم يملك واتساب ومفتاح الدولة 20 لمخزنكم المصري.'
            : 'WhatsApp: Meta queued the template; delivery may lag. Missing on device? Confirm app is Live on Meta, WhatsApp installed on number, Egypt uses country code 20 in settings.';
        let idNote = '';
        if (w.message_id && typeof w.message_id === 'string') {
          console.info('[whatsapp message_id]', w.message_id);
          const shortId = shortenWamid(w.message_id);
          idNote =
            language === 'ar'
              ? `\nرمز المرجع: ${shortId}`
              : `\nRef: ${shortId}`;
        }
        const hintNote =
          w.recipient_digits_hint && typeof w.recipient_digits_hint === 'string'
            ? (language === 'ar'
              ? `\nالرقم المُرسَل (بدون +): ${w.recipient_digits_hint} — قارِن مع حقل الهاتف بالشحن/الفاتورة.`
              : `\nNormalized recipient (no +): ${w.recipient_digits_hint} — vs shipping/billing phone.`)
            : '';
        toast.success(`${waLine}${idNote}${hintNote}`, { duration: 8500, style: { maxWidth: 480 } });
      } else if (w && !w.sent && (w.hint_ar || w.hint_en || w.reason)) {
        const msg = language === 'ar' ? (w.hint_ar || w.reason) : (w.hint_en || w.reason);
        toast(msg, {
          duration: 10000,
          style: { maxWidth: 480 },
        });
        if (w.api_error) console.warn('[whatsapp api_error]', w.api_error);
      }

      setSelectedOrder(null);
      fetchOrders();
    } catch { toast.error('Error'); }
  };

  const STATUS_LABELS_AR = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكّد',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    refunded: 'مُسترد',
  };

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{language === 'ar' ? 'الطلبات' : 'Orders'}</h1>
          <p className="text-gray-500 text-sm">{pagination.total} {language === 'ar' ? 'طلب' : 'orders'}</p>
        </div>
        <button onClick={() => fetchOrders()} className="p-2.5 border border-gray-200 rounded-xl hover:border-primary transition-colors"><RefreshCw size={18} /></button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={language === 'ar' ? 'رقم الطلب...' : 'Order number...'}
            className="w-full border border-gray-200 rounded-xl ps-9 py-2.5 text-sm focus:border-primary outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary outline-none">
          <option value="">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{language === 'ar' ? STATUS_LABELS_AR[s] : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', language === 'ar' ? 'العميل' : 'Customer', language === 'ar' ? 'المبلغ' : 'Total', language === 'ar' ? 'الدفع' : 'Payment', language === 'ar' ? 'الحالة' : 'Status', language === 'ar' ? 'التاريخ' : 'Date', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton h-12 mx-4 my-2 rounded" /></td></tr>
              )) : orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-primary text-sm">#{order.order_number}</td>
                  <td className="px-4 py-3">
                    {order.user ? (
                      <>
                        <p className="text-sm font-medium text-gray-700">{order.user.name}</p>
                        <p className="text-xs text-gray-400">{order.user.email}</p>
                      </>
                    ) : (
                      <>
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded mb-1">
                          {language === 'ar' ? 'ضيف' : 'Guest'}
                        </span>
                        <p className="text-sm font-medium text-gray-700">{order.guest_name || '—'}</p>
                        <p className="text-xs text-gray-400" dir="ltr">{order.guest_email || ''}</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary text-sm">{formatPrice(order.total, 'EGP', 'en')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.payment_method} - {order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${getStatusColor(order.status)}`}>
                      {language === 'ar' ? STATUS_LABELS_AR[order.status] : order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(createdAtOf(order), language)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setTrackingNumber(order.tracking_number || ''); }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="admin-order-modal p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="admin-order-modal__title">#{selectedOrder.order_number}</h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="admin-order-modal__close p-2"
                aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-5">
              <div className="admin-order-modal__panel p-4 text-sm space-y-2.5">
                {selectedOrder.user ? (
                  <>
                    <p><span className="admin-order-modal__label">{language === 'ar' ? 'العميل: ' : 'Customer: '}</span><span className="admin-order-modal__value">{selectedOrder.user.name}</span></p>
                    <p><span className="admin-order-modal__label">{language === 'ar' ? 'البريد: ' : 'Email: '}</span><span className="admin-order-modal__value" dir="ltr">{selectedOrder.user.email}</span></p>
                    {selectedOrder.user.phone && (
                      <p><span className="admin-order-modal__label">{language === 'ar' ? 'الهاتف: ' : 'Phone: '}</span><span className="admin-order-modal__value" dir="ltr">{selectedOrder.user.phone}</span></p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="admin-order-modal__guest-badge">{language === 'ar' ? 'طلب ضيف' : 'Guest order'}</p>
                    <p><span className="admin-order-modal__label">{language === 'ar' ? 'الاسم: ' : 'Name: '}</span><span className="admin-order-modal__value">{selectedOrder.guest_name || '—'}</span></p>
                    <p><span className="admin-order-modal__label">{language === 'ar' ? 'البريد: ' : 'Email: '}</span><span className="admin-order-modal__value" dir="ltr">{selectedOrder.guest_email || '—'}</span></p>
                  </>
                )}
                <p><span className="admin-order-modal__label">{language === 'ar' ? 'تاريخ الإنشاء: ' : 'Created: '}</span><span className="admin-order-modal__value whitespace-nowrap">{formatDate(createdAtOf(selectedOrder), language)}</span></p>
                <p><span className="admin-order-modal__label">{language === 'ar' ? 'المبلغ: ' : 'Total: '}</span><span className="admin-order-modal__accent">{formatPrice(selectedOrder.total, 'EGP', 'en')}</span></p>
                <p><span className="admin-order-modal__label">{language === 'ar' ? 'الدفع: ' : 'Payment: '}</span><span className="admin-order-modal__value">{selectedOrder.payment_method} ({selectedOrder.payment_status})</span></p>
              </div>

              {(() => {
                const ship = parseOrderAddress(selectedOrder.shipping_address);
                const bill = parseOrderAddress(selectedOrder.billing_address);
                const shipPhone = addressPhone(ship);
                const billPhone = addressPhone(bill);
                if (!ship.full_name && !bill.full_name && !shipPhone && !billPhone) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="admin-order-modal__address-card p-3 text-sm">
                      <p className="admin-order-modal__section-title">{language === 'ar' ? 'الشحن' : 'Shipping'}</p>
                      {ship.full_name && <p className="admin-order-modal__value">{ship.full_name}</p>}
                      <p className="admin-order-modal__label">{[ship.city, ship.district].filter(Boolean).join(', ')}</p>
                      {ship.street && <p className="admin-order-modal__label">{ship.street}</p>}
                      {shipPhone && <p dir="ltr" className="admin-order-modal__accent mt-1">{shipPhone}</p>}
                      {ship.postal_code && <p dir="ltr" className="admin-order-modal__label text-xs">{ship.postal_code}</p>}
                    </div>
                    <div className="admin-order-modal__address-card p-3 text-sm">
                      <p className="admin-order-modal__section-title">{language === 'ar' ? 'الفاتورة' : 'Billing'}</p>
                      {bill.full_name && <p className="admin-order-modal__value">{bill.full_name}</p>}
                      <p className="admin-order-modal__label">{[bill.city, bill.district].filter(Boolean).join(', ')}</p>
                      {bill.street && <p className="admin-order-modal__label">{bill.street}</p>}
                      {billPhone && <p dir="ltr" className="admin-order-modal__accent mt-1">{billPhone}</p>}
                    </div>
                  </div>
                );
              })()}

              {selectedOrder.items?.length > 0 && (
                <div>
                  <p className="admin-order-modal__section-title">{language === 'ar' ? 'المنتجات' : 'Line items'}</p>
                  <div className="admin-order-modal__items overflow-hidden">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 text-sm">
                        <img src={resolveMediaUrl(item.image) || ''} alt="" className="w-14 h-14 object-cover border border-line flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="admin-order-modal__value text-xs uppercase tracking-wider truncate">{language === 'ar' ? item.name_ar : item.name_en}</p>
                          <p className="text-xs admin-order-modal__label">SKU {item.sku || '—'} · ×{item.quantity}</p>
                          {(item.size || item.color) && (
                            <p className="text-xs admin-order-modal__label">{item.size || ''}{item.size && item.color ? ' · ' : ''}{item.color || ''}</p>
                          )}
                        </div>
                        <div className="text-end admin-order-modal__accent whitespace-nowrap">{formatPrice(item.total_price, 'EGP', 'en')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="admin-order-modal__field-label">{language === 'ar' ? 'تغيير الحالة' : 'Update Status'}</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="admin-order-modal__input mb-3">
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{language === 'ar' ? STATUS_LABELS_AR[s] : s}</option>)}
                </select>
                <label className="admin-order-modal__field-label">{language === 'ar' ? 'رقم التتبع' : 'Tracking Number'}</label>
                <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="admin-order-modal__input" dir="ltr" placeholder="Optional" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleStatusUpdate} className="admin-order-modal__btn-primary">{language === 'ar' ? 'تحديث' : 'Update'}</button>
                <button type="button" onClick={() => setSelectedOrder(null)} className="admin-order-modal__btn-outline">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
