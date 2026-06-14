import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Save, Globe, Truck, CreditCard, DollarSign, Phone, Link2, ShieldCheck, Loader2, RefreshCw, Copy, Check,
  MessageCircle, Mail, Send, MapPinned,
} from 'lucide-react';
import { DELIVERY_COUNTRY_META, parseDeliveryCountryCodes } from '../../utils/helpers';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/** Keys managed only by the server — never send on PUT */
const DOMAIN_SERVER_ONLY = new Set([
  'domain_verification_token', 'domain_status', 'domain_last_checked_at', 'domain_last_error',
  'smtp_password_is_set', 'paymob_api_key_is_set', 'paymob_secret_key_is_set', 'paymob_hmac_secret_is_set',
]);

export default function AdminSettings() {
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';
  const [settings, setSettings] = useState({});
  const [dnsHints, setDnsHints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState('');
  const [verifyChecks, setVerifyChecks] = useState([]);
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');

  const load = () => api.get('/admin/settings').then(({ data }) => {
    setSettings(data.data || {});
    setDnsHints(data.dnsHints || null);
  });

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const buildSettingsPayload = () => Object.fromEntries(
    Object.entries(settings).filter(([k]) => !DOMAIN_SERVER_ONLY.has(k)),
  );

  const handleTestSmtp = async () => {
    const payload = buildSettingsPayload();
    if (!String(payload.smtp_host || '').trim() || !String(payload.smtp_user || '').trim() || !String(payload.email_from_address || '').trim()) {
      toast.error(ar ? 'أكمل خادم SMTP واسم المستخدم وبريد المرسل' : 'Fill in SMTP host, username, and from address');
      return;
    }
    if (!String(payload.smtp_pass || '').trim() && !settings.smtp_password_is_set) {
      toast.error(ar ? 'أدخل كلمة مرور SMTP' : 'Enter the SMTP password');
      return;
    }

    setSmtpTestLoading(true);
    try {
      // Test email reads SMTP from the database — save form values first.
      await api.put('/admin/settings', payload);
      await load();
      const body = {};
      if (testRecipient.trim()) body.email = testRecipient.trim();
      await api.post('/admin/settings/send-test-email', body);
      toast.success(ar ? 'تم إرسال رسالة الاختبار' : 'Test email sent');
    } catch (err) {
      toast.error(err.response?.data?.message || (ar ? 'فشل الإرسال — راجع SMTP' : 'Send failed — check SMTP'));
    }
    setSmtpTestLoading(false);
  };

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
      toast.success(ar ? 'تم النسخ' : 'Copied');
    } catch {
      toast.error(ar ? 'فشل النسخ' : 'Copy failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildSettingsPayload();
      await api.put('/admin/settings', payload);
      await load();
      toast.success(ar ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch {
      toast.error('Error');
    }
    setSaving(false);
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    try {
      const { data } = await api.post('/admin/settings/verify-domain');
      setVerifyChecks(data.checks || []);
      setSettings((s) => ({
        ...s,
        domain_status: data.status,
        domain_last_checked_at: data.checkedAt,
        domain_last_error: data.error || '',
      }));
      if (data.dnsHints) setDnsHints(data.dnsHints);
      if (data.status === 'verified') {
        toast.success(ar ? 'الدومين مربوط ومتصل' : 'Domain connected');
      } else {
        toast(ar ? 'التحقق لم يكتمل بعد — راجع سجلات DNS' : 'Verification incomplete — check DNS records below', {
          icon: '⏳',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
    setVerifying(false);
  };

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const notifyStatusToggleOn = (key) => {
    if (key === 'email_notify_status_confirmed') return settings[key] === 'true';
    return settings[key] !== 'false';
  };

  const flipNotifyStatus = (key) => {
    const on = notifyStatusToggleOn(key);
    set(key, on ? 'false' : 'true');
  };

  const selectedDeliveryCodes = parseDeliveryCountryCodes(settings.delivery_countries);

  const toggleDeliveryCountry = (code) => {
    const setCodes = new Set(selectedDeliveryCodes);
    if (setCodes.has(code)) setCodes.delete(code);
    else setCodes.add(code);
    let arr = [...setCodes];
    if (!arr.length) arr = ['EG'];
    set('delivery_countries', JSON.stringify(arr));
  };

  const sections = [
    {
      icon: Globe, title: ar ? 'الإعدادات العامة' : 'General Settings',
      fields: [
        { key: 'site_name', label: 'Site Name (EN)', dir: 'ltr' },
        { key: 'site_name_ar', label: 'اسم الموقع (AR)', dir: 'rtl' },
        {
          key: 'default_language',
          label: ar ? 'اللغة الافتراضية عند فتح الموقع (أول زيارة)' : 'Default storefront language (first visit)',
          type: 'select',
          choices: [
            { value: 'ar', label: ar ? 'العربية (من اليمين لليسار)' : 'Arabic (RTL)' },
            { value: 'en', label: ar ? 'الإنجليزية (من اليسار لليمين)' : 'English (LTR)' },
          ],
        },
        { key: 'currency', label: 'Currency', dir: 'ltr' },
      ],
    },
    {
      icon: DollarSign, title: ar ? 'الضريبة' : 'Tax',
      fields: [
        { key: 'tax_rate', label: ar ? 'نسبة الضريبة (%)' : 'Tax Rate (%)', dir: 'ltr', type: 'number' },
      ],
    },
    {
      icon: Truck, title: ar ? 'الشحن' : 'Shipping',
      fields: [
        { key: 'shipping_cost', label: ar ? 'تكلفة الشحن (ج.م)' : 'Shipping Cost (EGP)', dir: 'ltr', type: 'number' },
        { key: 'free_shipping_threshold', label: ar ? 'حد الشحن المجاني (ج.م)' : 'Free Shipping Threshold (EGP)', dir: 'ltr', type: 'number' },
      ],
    },
    {
      icon: CreditCard, title: ar ? 'طرق الدفع' : 'Payment Methods',
      toggles: [
        { key: 'payment_stripe', label: ar ? 'بطاقة ائتمانية (Stripe)' : 'Credit Card (Stripe)' },
        { key: 'payment_cod', label: ar ? 'الدفع عند الاستلام' : 'Cash on Delivery' },
        { key: 'payment_bank_transfer', label: ar ? 'تحويل بنكي' : 'Bank Transfer' },
        { key: 'payment_paymob', label: ar ? 'Paymob (بطاقة / محفظة)' : 'Paymob (Card / Wallet)' },
      ],
      fields: [
        { key: 'bank_name', label: ar ? 'اسم البنك' : 'Bank Name', dir: '' },
        { key: 'bank_account', label: ar ? 'رقم الحساب/IBAN' : 'Account/IBAN', dir: 'ltr' },
      ],
    },
    {
      icon: Phone, title: ar ? 'معلومات التواصل' : 'Contact Info',
      fields: [
        { key: 'whatsapp', label: 'WhatsApp', dir: 'ltr' },
        { key: 'email_contact', label: ar ? 'البريد الإلكتروني' : 'Contact Email', dir: 'ltr' },
      ],
    },
  ];

  const domain = (settings.custom_domain || '').trim();
  const token = settings.domain_verification_token || '';
  const status = settings.domain_status || 'none';
  const txtFqdn = domain && dnsHints?.txt_name_suffix ? `${dnsHints.txt_name_suffix}.${domain}` : '';
  const txtValue = token && dnsHints?.txt_value_prefix ? `${dnsHints.txt_value_prefix}${token}` : '';

  const statusBadge = () => {
    const base = 'text-xs font-bold px-3 py-1 rounded-full';
    if (status === 'verified') return <span className={`${base} bg-emerald-100 text-emerald-800`}>{ar ? 'متصل' : 'Connected'}</span>;
    if (status === 'pending') return <span className={`${base} bg-amber-100 text-amber-900`}>{ar ? 'قيد الربط' : 'Pending'}</span>;
    return <span className={`${base} bg-gray-100 text-gray-600`}>{ar ? 'غير مفعّل' : 'Not set'}</span>;
  };

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl" dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{ar ? 'إعدادات الموقع' : 'Site Settings'}</h1>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50">
          <Save size={18} /> {saving ? '...' : (ar ? 'حفظ الإعدادات' : 'Save Settings')}
        </button>
      </div>

      {/* Custom domain */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 flex-wrap">
          <Link2 size={18} className="text-primary" />
          {ar ? 'الدومين المخصص' : 'Custom domain'}
          {statusBadge()}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {ar
            ? 'أدخل الدومين بدون https (مثال: shop.yourbrand.com). بعد الحفظ أضف السجلات أدناه في لوحة DNS ثم اضغط «تحقق من الربط».'
            : 'Enter hostname without https (e.g. shop.yourbrand.com). After saving, add the DNS records below, then click “Verify connection”.'
          }
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'الدومين' : 'Domain'}</label>
            <input
              type="text"
              value={settings.custom_domain || ''}
              onChange={(e) => set('custom_domain', e.target.value)}
              className="input-field font-mono"
              dir="ltr"
              placeholder="shop.example.com"
            />
          </div>
        </div>
        {(settings.domain_last_checked_at || settings.domain_last_error) && (
          <div className="text-xs text-gray-500 mb-4 space-y-1">
            {settings.domain_last_checked_at && (
              <p>
                {ar ? 'آخر فحص:' : 'Last check:'}{' '}
                {new Date(settings.domain_last_checked_at).toLocaleString(ar ? 'ar-SA' : 'en-US')}
              </p>
            )}
            {settings.domain_last_error && status !== 'verified' && (
              <p className="text-amber-700">{settings.domain_last_error}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={handleVerifyDomain}
            disabled={verifying || !domain}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-800 disabled:opacity-50"
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {ar ? 'تحقق من الربط' : 'Verify connection'}
          </button>
          <button
            type="button"
            onClick={() => load().then(() => toast.success(ar ? 'تم التحديث' : 'Refreshed'))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw size={16} /> {ar ? 'تحديث الحالة' : 'Refresh status'}
          </button>
        </div>

        {verifyChecks.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2 mb-6">
            <p className="text-xs font-semibold text-gray-600">{ar ? 'نتيجة آخر فحص' : 'Last check details'}</p>
            <ul className="space-y-2">
              {verifyChecks.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start gap-2 text-xs">
                  <span className={`shrink-0 font-bold rounded px-2 py-0.5 ${c.ok ? 'bg-emerald-100 text-emerald-800' : c.ok === null ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'}`}>
                    {c.ok === true ? '✓' : c.ok === null ? '–' : '✗'} {ar ? (c.label_ar || c.label_en) : (c.label_en || c.label_ar)}
                  </span>
                  <span className="text-gray-600 break-all">{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {domain && token && dnsHints && (
          <div className="rounded-xl border border-primary/20 bg-primary-50/40 p-4 space-y-4">
            <h4 className="font-semibold text-primary text-sm">{ar ? 'سجلات DNS المطلوبة' : 'DNS records to add'}</h4>

            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2">1) TXT — {ar ? 'التحقق من امتلاك الدومين' : 'Domain verification'}</p>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-gray-500 shrink-0 w-24">{ar ? 'الاسم' : 'Name'}</span>
                  <code className="flex-1 break-all text-xs bg-gray-50 px-2 py-1 rounded font-mono dir-ltr text-start">{txtFqdn}</code>
                  <button type="button" onClick={() => copyText('txtHost', txtFqdn)} className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0">
                    {copied === 'txtHost' ? <Check size={14} /> : <Copy size={14} />} {ar ? 'نسخ' : 'Copy'}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <span className="text-gray-500 shrink-0 w-24">{ar ? 'القيمة' : 'Value'}</span>
                  <code className="flex-1 break-all text-xs bg-gray-50 px-2 py-1 rounded font-mono dir-ltr text-start">{txtValue}</code>
                  <button type="button" onClick={() => copyText('txtVal', txtValue)} className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0">
                    {copied === 'txtVal' ? <Check size={14} /> : <Copy size={14} />} {ar ? 'نسخ' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2">2) {ar ? 'توجيه الزيارات' : 'Traffic routing'}</p>
              {dnsHints.cname_target ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 text-xs">
                    {ar
                      ? 'يفضّل سجل CNAME من اسم الدومين (أو www) نحو الوجهة التالية. في بعض الاستضافات الحقل «الاسم» يكون @ أو اسم النطاق الفرعي.'
                      : 'Prefer a CNAME from your store hostname (or www) to the target below. Some DNS panels use @ for the root.'}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-gray-500 shrink-0 w-24">CNAME →</span>
                    <code className="flex-1 break-all text-xs bg-gray-50 px-2 py-1 rounded font-mono dir-ltr text-start">{dnsHints.cname_target}</code>
                    <button type="button" onClick={() => copyText('cname', dnsHints.cname_target)} className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0">
                      {copied === 'cname' ? <Check size={14} /> : <Copy size={14} />} {ar ? 'نسخ' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-800">
                  {ar
                    ? 'لم يُضبط DOMAIN_DNS_CNAME_TARGET أو FRONTEND_URL بعنوان إنتاج — أضفها في .env في السيرفر لعرض وجهة الـ CNAME هنا.'
                    : 'Set DOMAIN_DNS_CNAME_TARGET or a non-localhost FRONTEND_URL in server .env to show the CNAME target here.'}
                </p>
              )}
              {dnsHints.a_record && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                  <p className="text-xs text-gray-600">
                    {ar ? 'أو للجذر @ عبر سجل A:' : 'Or for apex @ using an A record:'}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-gray-500 shrink-0 w-24">A →</span>
                    <code className="flex-1 text-xs bg-gray-50 px-2 py-1 rounded font-mono dir-ltr">{dnsHints.a_record}</code>
                    <button type="button" onClick={() => copyText('a', dnsHints.a_record)} className="text-primary text-xs font-semibold flex items-center gap-1 shrink-0">
                      {copied === 'a' ? <Check size={14} /> : <Copy size={14} />} {ar ? 'نسخ' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              {ar
                ? 'التحقق الآلي يقرأ سجل TXT أعلاه، وإذا وُجدت DOMAIN_DNS_CNAME_TARGET أو DOMAIN_DNS_A_RECORD في السيرفر يتحقق أيضاً من أن الدومين يوجّه لنفس الاستضافة. إعداد شهادة SSL (HTTPS) يتم عادة من لوحة الاستضافة بعد توجيه DNS.'
                : 'Automated checks read the TXT record above; if DOMAIN_DNS_CNAME_TARGET or DOMAIN_DNS_A_RECORD is set on the server, we also check that the hostname routes to that host/IP. Enable HTTPS in your hosting panel after DNS propagates.'}
            </p>
          </div>
        )}

        {domain && !token && (
          <p className="text-sm text-amber-700 mt-2">{ar ? 'احفظ الإعدادات لتوليد رمز التحقق.' : 'Save settings to generate a verification token.'}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle size={22} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-700">{ar ? 'واتساب للأعمال (Meta)' : 'WhatsApp Business (Meta)'}</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-lg">
                {ar
                  ? 'اربط واتساب بيزنس لإرسال قوالب Meta المعتمدة عند تحديث حالة الطلب. أسماء القوالب وترتيب المتغيرات تُدار من صفحة الربط.'
                  : 'Connect WhatsApp Cloud API to send Meta-approved templates when orders change status. Manage template names and variable order on the WhatsApp integration page.'
                }
              </p>
            </div>
          </div>
          <Link to="/admin/whatsapp" className="btn-primary px-5 py-2.5 text-sm whitespace-nowrap shrink-0">
            {ar ? 'إعداد الواتساب' : 'WhatsApp setup'}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <Mail size={18} className="text-primary shrink-0" />
          {ar ? 'SMTP والبريد التلقائي' : 'SMTP & automated emails'}
        </h3>
        <p className="text-sm text-gray-500 mb-5 max-w-2xl leading-relaxed">
          {ar
            ? 'أدخل إعدادات خادم البريد لتفعيل OTP وإرسال رسائل احترافية للعميل عند تحديث حالة الطلب. الحقول الفارغة تستخدم قيم متغيرات البيئة إن وُجدت.'
            : 'Configure your SMTP server for OTP emails and branded order status notifications. Empty fields fall back to environment variables where available.'}
        </p>

        <label className="flex items-center justify-between gap-4 cursor-pointer mb-6 pb-6 border-b border-gray-100">
          <span className="text-sm text-gray-700 font-medium">{ar ? 'تفعيل إشعارات تغيير حالة الطلب بالبريد' : 'Send email when order status changes'}</span>
          <button type="button" onClick={() => set('email_notifications_enabled', settings.email_notifications_enabled !== 'false' ? 'false' : 'true')}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.email_notifications_enabled !== 'false' ? 'bg-primary' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email_notifications_enabled !== 'false' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <p className="text-xs font-semibold text-gray-600 mb-3">{ar ? 'أي مراحل ترسل للعميل؟ (ما عدا انتظار الدفع)' : 'Which statuses notify the customer? (excluding pending)'}</p>
        <div className={`space-y-2 mb-8 ${settings.email_notifications_enabled === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
          {[
            { key: 'email_notify_status_confirmed', label: ar ? 'مؤكد (قد يكرر تأكيد الطلب الأول)' : 'Confirmed (may duplicate welcome email)' },
            { key: 'email_notify_status_processing', label: ar ? 'قيد المعالجة' : 'Processing' },
            { key: 'email_notify_status_shipped', label: ar ? 'تم الشحن' : 'Shipped' },
            { key: 'email_notify_status_delivered', label: ar ? 'تم التسليم' : 'Delivered' },
            { key: 'email_notify_status_cancelled', label: ar ? 'ملغى' : 'Cancelled' },
            { key: 'email_notify_status_refunded', label: ar ? 'مسترد' : 'Refunded' },
          ].map(({ key: k, label }) => (
            <label key={k} className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-gray-600">{label}</span>
              <button type="button" onClick={() => flipNotifyStatus(k)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${notifyStatusToggleOn(k) ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyStatusToggleOn(k) ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'خادم SMTP' : 'SMTP host'}</label>
            <input type="text" value={settings.smtp_host || ''} onChange={(e) => set('smtp_host', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="smtp.example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
            <input type="text" inputMode="numeric" value={settings.smtp_port || ''} onChange={(e) => set('smtp_port', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="587" />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-gray-600">{ar ? 'اتصال SSL مباشر (مناسب للمنفذ 465)' : 'Use SSL/TLS implicit (common for port 465)'}</span>
              <button type="button" onClick={() => set('smtp_secure', settings.smtp_secure === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.smtp_secure === 'true' ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.smtp_secure === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'اسم المستخدم' : 'SMTP username'}</label>
            <input type="text" value={settings.smtp_user || ''} onChange={(e) => set('smtp_user', e.target.value)} className="input-field font-mono" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'كلمة المرور' : 'SMTP password'}</label>
            <input type="password" value={settings.smtp_pass || ''} onChange={(e) => set('smtp_pass', e.target.value)} autoComplete="new-password" className="input-field font-mono" dir="ltr" placeholder="" />
            {settings.smtp_password_is_set && (
              <p className="text-xs text-gray-500 mt-1">{ar ? 'كلمة المرور المحفوظة — أدخل قيمة جديدة لتغييرها' : 'A password is saved — leave blank to keep it, or type a new one'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'البريد المرسل منه' : 'From email address'}</label>
            <input type="email" value={settings.email_from_address || ''} onChange={(e) => set('email_from_address', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="noreply@yourdomain.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'اسم المرسل (يظهر في صندوق الوارد)' : 'From display name'}</label>
            <input type="text" value={settings.email_from_name || ''} onChange={(e) => set('email_from_name', e.target.value)} dir={ar ? 'rtl' : 'ltr'} className="input-field" placeholder="Kaino Sea" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'إرسال اختبار إلى (اختياري)' : 'Test recipient (optional)'}</label>
            <input type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} className="input-field font-mono" dir="ltr" placeholder={ar ? 'افتراضي: بريد حساب الإداري' : 'Defaults to logged-in admin email'} />
          </div>
          <button type="button" onClick={handleTestSmtp} disabled={smtpTestLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-800 text-white font-semibold text-sm hover:bg-primary-900 disabled:opacity-50 whitespace-nowrap">
            {smtpTestLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {ar ? 'إرسال اختبار' : 'Send test'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {ar ? 'يحفظ إعدادات SMTP تلقائياً قبل إرسال رسالة الاختبار.' : 'SMTP settings are saved automatically before sending a test email.'}
        </p>
      </div>

      {/* دول الشحن — تظهر المحافظات/المدن في إتمام الطلب حسب الاختيار */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <MapPinned size={18} className="text-primary shrink-0" />
          {ar ? 'دول الشحن والتسليم' : 'Shipping countries'}
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed max-w-2xl">
          {ar
            ? 'فعِّل الدول التي يعمل فيها المتجر؛ يختار العميل الدولة ثم قائمة المحافظات أو المدن المناسبة عند الشراء وحفظ العناوين. يُحفظ الاختيار كرمز الدولة (مثل EG أو SA).'
            : 'Enable countries where you ship. Customers pick country first, then the matching governorates/cities during checkout & saved addresses. Stored as ISO country codes (e.g. EG, SA).'}
        </p>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_COUNTRY_META.map((c) => {
            const checked = selectedDeliveryCodes.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleDeliveryCountry(c.code)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  checked ? 'border-primary bg-primary-50 text-primary-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span dir="ltr" className="font-mono text-xs opacity-75 me-2">{c.code}</span>
                {ar ? c.labelAr : c.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {sections.map(({ icon: Icon, title, fields = [], toggles = [] }) => (
        <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-5 flex items-center gap-2">
            <Icon size={18} className="text-primary" /> {title}
          </h3>
          {toggles.length > 0 && (
            <div className="space-y-3 mb-5">
              {toggles.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-600">{label}</span>
                  <button type="button" onClick={() => set(key, settings[key] === 'false' ? 'true' : 'false')}
                    className={`w-11 h-6 rounded-full transition-colors relative ${settings[key] !== 'false' ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key] !== 'false' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ key, label, dir, type, choices }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                {type === 'select' && choices?.length ? (
                  <select
                    value={settings[key] === 'en' ? 'en' : 'ar'}
                    onChange={(e) => set(key, e.target.value)}
                    className="input-field"
                    dir="ltr"
                  >
                    {choices.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                ) : (
                  <input type={type || 'text'} value={settings[key] || ''} onChange={(e) => set(key, e.target.value)} className="input-field" dir={dir} />
                )}
                {key === 'default_language' && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {ar
                      ? 'يُطبَّق على الزوار الذين لم يغيّروا اللغة من القائمة بعد. من اختار لغة يدوياً تُحفظ في المتصفح وتُستخدم في الزيارات القادمة.'
                      : 'Used when a visitor has not chosen a language yet via the header toggle. After they pick one, it is stored in the browser and kept on return visits.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Paymob credentials */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          {ar ? 'إعدادات Paymob' : 'Paymob settings'}
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed max-w-2xl">
          {ar
            ? 'للحسابات الحديثة: أدخل Public key و Secret key و HMAC. للتكامل القديم (iframe): API key + Integration ID + Iframe ID.'
            : 'Modern accounts: use Public key, Secret key, and HMAC. Legacy iframe flow: API key + Integration ID + Iframe ID.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Public key</label>
            <input type="text" value={settings.paymob_public_key || ''} onChange={(e) => set('paymob_public_key', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="egy_pk_test_..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret key</label>
            <input type="password" value={settings.paymob_secret_key || ''} onChange={(e) => set('paymob_secret_key', e.target.value)} autoComplete="new-password" className="input-field font-mono" dir="ltr" placeholder="egy_sk_test_..." />
            {settings.paymob_secret_key_is_set && (
              <p className="text-xs text-gray-500 mt-1">{ar ? 'المفتاح محفوظ — اتركه فارغاً للإبقاء عليه' : 'Secret key is saved — leave blank to keep it'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">HMAC secret</label>
            <input type="password" value={settings.paymob_hmac_secret || ''} onChange={(e) => set('paymob_hmac_secret', e.target.value)} autoComplete="new-password" className="input-field font-mono" dir="ltr" />
            {settings.paymob_hmac_secret_is_set && (
              <p className="text-xs text-gray-500 mt-1">{ar ? 'السر محفوظ — اتركه فارغاً للإبقاء عليه' : 'HMAC secret is saved — leave blank to keep it'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'Integration ID (مطلوب)' : 'Integration ID (required)'}</label>
            <input type="text" value={settings.paymob_integration_id || ''} onChange={(e) => set('paymob_integration_id', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="1234567" />
            <p className="text-xs text-gray-500 mt-1">
              {ar
                ? 'من لوحة Paymob: Developers → Payment Integrations → رقم تكامل البطاقة (Card).'
                : 'From Paymob dashboard: Developers → Payment Integrations → Card integration ID.'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'API key قديم (اختياري)' : 'Legacy API key (optional)'}</label>
            <input type="password" value={settings.paymob_api_key || ''} onChange={(e) => set('paymob_api_key', e.target.value)} autoComplete="new-password" className="input-field font-mono" dir="ltr" />
            {settings.paymob_api_key_is_set && (
              <p className="text-xs text-gray-500 mt-1">{ar ? 'المفتاح محفوظ — اتركه فارغاً للإبقاء عليه' : 'API key is saved — leave blank to keep it'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'Iframe ID قديم (اختياري)' : 'Legacy Iframe ID (optional)'}</label>
            <input type="text" value={settings.paymob_iframe_id || ''} onChange={(e) => set('paymob_iframe_id', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="123456" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ar ? 'عنوان API (اختياري)' : 'API base URL (optional)'}</label>
            <input type="text" value={settings.paymob_api_base || 'https://accept.paymob.com/api'} onChange={(e) => set('paymob_api_base', e.target.value)} className="input-field font-mono" dir="ltr" placeholder="https://accept.paymob.com/api" />
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600 space-y-2 font-mono" dir="ltr">
          <p><span className="text-gray-500">Webhook:</span> /api/orders/paymob/webhook</p>
          <p><span className="text-gray-500">Return:</span> /api/orders/paymob/return</p>
        </div>
      </div>
    </div>
  );
}
