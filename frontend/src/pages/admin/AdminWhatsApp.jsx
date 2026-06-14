import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Loader2,
  MessageCircle,
  FlaskConical,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Zap,
  RefreshCw,
} from 'lucide-react';
import api from '../../utils/api';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const STATUS_LABEL_AR = {
  pending: 'بانتظار الدفع',
  confirmed: 'مؤكّد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  refunded: 'مُسترد',
};

const STATUS_LABEL_EN = {
  pending: 'Pending payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const BODY_VAR_OPTIONS = [
  { value: 'order_number', hint: 'MSK-1234' },
  { value: 'customer_name', hint: '' },
  { value: 'total', hint: '0.00' },
  { value: 'currency', hint: 'EGP' },
  { value: 'status_label', hint: 'AR' },
  { value: 'status_label_en', hint: 'EN' },
  { value: 'tracking_number', hint: '' },
];

function Badge({ tone, children }) {
  const map = {
    connected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    disconnected: 'bg-gray-50 text-gray-600 ring-gray-100',
    error: 'bg-rose-50 text-rose-700 ring-rose-100',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${map[tone] || map.disconnected}`}>
      {children}
    </span>
  );
}

export default function AdminWhatsApp() {
  const lang = useSelector((s) => s.ui.language);
  const ar = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [graphVersion, setGraphVersion] = useState('v21.0');
  const [phoneCountryCode, setPhoneCountryCode] = useState('966');
  const [wabaAccountId, setWabaAccountId] = useState('');
  const [approvedMetaTemplates, setApprovedMetaTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [pickKey, setPickKey] = useState({});
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [templates, setTemplates] = useState({});
  const [customAdd, setCustomAdd] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/whatsapp/integration');
      const row = data.data || {};
      setEnabled(!!row.enabled);
      setPhoneNumberId(row.phone_number_id || '');
      setGraphVersion(row.graph_api_version || 'v21.0');
      setPhoneCountryCode(String(row.phone_country_code || '966').replace(/\D/g, '').slice(0, 15) || '966');
      setWabaAccountId(row.whatsapp_business_account_id ? String(row.whatsapp_business_account_id) : '');
      setApprovedMetaTemplates([]);
      setHasAccessToken(!!row.has_access_token);
      setConnectionStatus(row.connection_status || 'disconnected');
      setLastError(row.last_error || null);
      setLastSentAt(row.last_sent_at || null);
      setTemplates(row.template_config || {});
    } catch (e) {
      toast.error(e.response?.data?.message || (ar ? 'فشل التحميل' : 'Load failed'));
    }
    setLoading(false);
  }, [ar]);

  useEffect(() => { load(); }, [load]);

  const setStatusField = (status, patch) => {
    setTemplates((prev) => ({
      ...prev,
      [status]: { ...(prev[status] || {}), ...patch },
    }));
  };

  const addVar = (status, value) => {
    const v = String(value || '').trim();
    if (!v) return;
    const cur = templates[status]?.bodyVariables || [];
    if (cur.includes(v)) return;
    setStatusField(status, { bodyVariables: [...cur, v] });
  };

  const removeVar = (status, idx) => {
    const cur = [...(templates[status]?.bodyVariables || [])];
    cur.splice(idx, 1);
    setStatusField(status, { bodyVariables: cur });
  };

  const moveVar = (status, idx, dir) => {
    const cur = [...(templates[status]?.bodyVariables || [])];
    const j = idx + dir;
    if (j < 0 || j >= cur.length) return;
    [cur[idx], cur[j]] = [cur[j], cur[idx]];
    setStatusField(status, { bodyVariables: cur });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled,
        phone_number_id: phoneNumberId,
        graph_api_version: graphVersion,
        phone_country_code: phoneCountryCode,
        whatsapp_business_account_id: wabaAccountId.replace(/\D/g, ''),
        template_config: templates,
      };
      if (accessTokenInput.trim()) payload.access_token = accessTokenInput.trim();
      await api.put('/admin/whatsapp/integration', payload);
      setAccessTokenInput('');
      toast.success(ar ? 'تم الحفظ' : 'Saved');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
    setSaving(false);
  };

  const fetchApprovedTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data } = await api.get('/admin/whatsapp/message-templates');
      const list = Array.isArray(data.data) ? data.data : [];
      setApprovedMetaTemplates(list);
      toast.success(
        ar
          ? `تم جلب ${list.length} قالبًا معتمدًا`
          : `Loaded ${list.length} approved template(s)`,
      );
    } catch (e) {
      toast.error(e.response?.data?.message || (ar ? 'فشل جلب القوالب' : 'Fetch failed'));
      setApprovedMetaTemplates([]);
    }
    setLoadingTemplates(false);
  };

  const applyMetaTemplate = (st, name, language) => {
    setStatusField(st, {
      templateName: name,
      language: language.replace(/-/g, '_'),
    });
    setPickKey((prev) => ({ ...prev, [st]: (prev[st] || 0) + 1 }));
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const body = {
        phone_number_id: phoneNumberId || undefined,
        graph_api_version: graphVersion || undefined,
      };
      if (accessTokenInput.trim()) body.access_token = accessTokenInput.trim();
      const { data } = await api.post('/admin/whatsapp/test-connection', body);
      toast.success(
        ar
          ? `متصل — ${data.display_phone_number || ''}`
          : `OK — ${data.display_phone_number || 'connected'}`,
      );
      setAccessTokenInput('');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || (ar ? 'فشل الاختبار' : 'Test failed'));
      if (e.response?.data?.data) {
        const d = e.response.data.data;
        setConnectionStatus(d.connection_status || 'error');
        setLastError(d.last_error);
      }
    }
    setTesting(false);
  };

  const statusTone = connectionStatus === 'connected' ? 'connected'
    : connectionStatus === 'error' ? 'error' : 'disconnected';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 gap-2" dir={ar ? 'rtl' : 'ltr'}>
        <Loader2 className="animate-spin" size={22} /> {ar ? 'جاري التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl pb-16" dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageCircle size={26} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ar ? 'واتساب للأعمال' : 'WhatsApp Business'}</h1>
            <p className="text-gray-600 text-sm mt-1 max-w-xl">
              {ar
                ? 'اربط رقم الواتساب عبر WhatsApp Cloud API (Meta). أرسل قوالب معتمدة فقط؛ لكل حالة طلب حدّد اسم القالب وكود اللغة وتسلسل متغيرات النص ليطابق {{1}} {{2}} … في القالب المعتمد.'
                : 'Connect via Meta WhatsApp Cloud API. Only approved templates can be sent; for each order status set the template name, language code, and body variables in the same order as {{1}}, {{2}}, … in Meta.'}
            </p>
            <p className="text-sm mt-2 max-w-xl rounded-xl border border-blue-100 bg-blue-50/80 text-blue-950/90 px-3 py-2 leading-relaxed">
              {ar
                ? 'عندما تقبل Meta الطلب لا يعني ذلك وصول الرسالة للعميل حتماً — التسليم يعتمد على أن تطبيقك «Live» وليس في وضع تجريبي لا يسمح بالإرسال لكل الأرقام، وأن الرقم صحيح وله واتساب، والمفتاح لا يمنع التسليم.'
                : 'Meta “accepting” the send is not proof the customer received it: the app must be Live (not dev-only), the number must be WhatsApp-enabled and allowed for your business number, and routing can still fail — check Meta Insights for the message.'}
            </p>
          </div>
        </div>
        <Badge tone={statusTone}>{connectionStatus}</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700">{ar ? 'تفعيل الإرسال' : 'Enable sending'}</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone number ID</label>
            <input
              className="input-field text-sm font-mono"
              dir="ltr"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="123456789012345"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Graph API version</label>
            <input
              className="input-field text-sm font-mono"
              dir="ltr"
              value={graphVersion}
              onChange={(e) => setGraphVersion(e.target.value.replace(/^\//, ''))}
              placeholder="v21.0"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {ar ? 'مفتاح دولة الواتساب (كود بدون +)' : 'WhatsApp country code'}
            </label>
            <input
              className="input-field text-sm font-mono"
              dir="ltr"
              inputMode="numeric"
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="966"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {ar
                ? 'يُستخدم لتطبيع أرقام الزبائن من عنوان الشحن (مثل 966 للسعودية، 20 لمصر). أرقام محمول مصر 010/011/012/015 تُعالَج تلقائياً كـ +20 حتى لو حُفِظ افتراضي 966.'
                : 'Normalizes checkout phones (966 Saudi, 20 Egypt …). Egyptian mobiles 010/011/012/015 are mapped to +20 automatically even when default shows 966.'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {ar ? 'معرّف حساب واتساب للأعمال (WABA)' : 'WhatsApp Business Account ID (WABA)'}
            </label>
            <input
              className="input-field text-sm font-mono"
              dir="ltr"
              inputMode="numeric"
              value={wabaAccountId}
              onChange={(e) => setWabaAccountId(e.target.value.replace(/\D/g, '').slice(0, 24))}
              placeholder="e.g. 123456789012345"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {ar
                ? 'من Meta → إعداد التطبيق / API للواتساب (أرقام فقط). لجلب قائمة القوالب المعتمدة وتجنب خطأ #132001. احفظ الإعداد ثم استورد القوالب أدناه.'
                : 'From Meta WhatsApp/API setup — digits only. Save, then“Fetch approved templates” below to auto-fill locale + name and avoid (#132001).'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {ar ? 'رمز الدخول (Access token)' : 'Permanent access token'}
              {hasAccessToken && (
                <span className="text-emerald-600 font-normal ms-2">
                  {ar ? '— محفوظ' : '— saved'}
                </span>
              )}
            </label>
            <input
              type="password"
              autoComplete="off"
              className="input-field text-sm font-mono"
              dir="ltr"
              value={accessTokenInput}
              onChange={(e) => setAccessTokenInput(e.target.value)}
              placeholder={ar ? 'اتركه فارغاً للإبقاء على المفتاح الحالي' : 'Leave blank to keep current token'}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={handleSave} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {ar ? 'حفظ' : 'Save'}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-2"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            {ar ? 'اختبار الاتصال' : 'Test connection'}
          </button>
        </div>

        {lastError && (
          <div className="text-xs text-rose-700 bg-rose-50 rounded-xl p-3 border border-rose-100 whitespace-pre-wrap">
            {lastError}
          </div>
        )}
        {lastSentAt && (
          <p className="text-xs text-gray-500">
            {ar ? 'آخر إرسال ناجح:' : 'Last successful send:'}{' '}
            {new Date(lastSentAt).toLocaleString(ar ? 'ar-SA' : 'en-US')}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{ar ? 'قوالب الحالات' : 'Templates per status'}</h2>
        <p className="text-sm text-gray-500 -mt-2">
          {ar
            ? 'يجب أن تطابق المتغيرات ترتيب الحقول في قالب الواتساب المعتمد. الرقم يُؤخذ من عنوان الشحن (phone) ويُنسَّق وفق «مفتاح دولة الواتساب» أعلاه.'
            : 'Variables must match your approved template body order. Phone comes from shipping_address.phone and is formatted using the WhatsApp country code above.'}
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold mb-1">{ar ? 'خطأ Meta (#132001)؟' : 'Meta error (#132001)?'}</p>
          <p className="text-amber-900/95 leading-relaxed">
            {ar
              ? 'لتفادي الخطأ: احفظ «معرّف WABA» والتوكن أعلاه، ثم «استيراد القوالب المعتمدة»، واختَر من القائمة لكل حالة طلب — كي تطابق الاسم واللغة ما في Meta حرفياً.'
              : 'Best fix: save WABA ID + token above, Fetch approved templates, then pick locale per status so name+language match Meta exactly.'}
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-4 py-3 text-sm text-blue-950">
          <p className="font-semibold mb-1">{ar ? 'خطأ Meta (#132000) — عدد المتغيرات؟' : 'Meta error (#132000) — parameter count?'}</p>
          <p className="leading-relaxed text-blue-950/95">
            {ar
              ? 'عدد «متغيرات النص» هنا يجب أن يطابق {{1}}, {{2}}… في القالب المعتمد. قالب بدون متغيرات في النص: اترك القائمة فارغة. احفظ WABA أعلاه ليتحقّق النظام تلقائياً قبل الإرسال.'
              : 'Body variables here must match the count of {{1}}, {{2}}… in Meta. Fully static template: empty the variable list. Save WABA so the backend can validate before send.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-1">
          <button
            type="button"
            disabled={loadingTemplates || saving || testing}
            onClick={fetchApprovedTemplates}
            className="px-4 py-2 text-sm rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 inline-flex items-center gap-2"
          >
            {loadingTemplates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {ar ? 'استيراد القوالب المعتمدة من Meta' : 'Fetch approved templates'}
          </button>
          {approvedMetaTemplates.length > 0 && (
            <span className="text-xs font-medium text-emerald-800">
              {approvedMetaTemplates.length} {ar ? 'قالبًا معتمدًا' : 'approved'}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {ar ? 'خطوات: احفظ WABA أعلاه → استورد القوالب → اختَر لكل حالة.' : 'Steps: Save WABA above → Fetch → Pick per status.'}
          </span>
        </div>

        {STATUSES.map((st) => {
          const cfg = templates[st] || {};
          const tEnabled = !!cfg.enabled;
          return (
            <div key={st} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{STATUS_LABEL_AR[st]}</span>
                  <span className="text-xs text-gray-400">{STATUS_LABEL_EN[st]} · </span>
                  <code className="text-[11px] bg-gray-100 px-2 py-0.5 rounded">{st}</code>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={tEnabled}
                    onChange={(e) => setStatusField(st, { enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  {ar ? 'تفعيل لهذه الحالة' : 'Use for this status'}
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {approvedMetaTemplates.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {ar ? 'اختيار من قائمة Meta (معتمد)' : 'Select from Meta (approved)'}
                    </label>
                    <select
                      key={`meta-p-${st}-${pickKey[st] ?? 0}`}
                      className="input-field text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) return;
                        try {
                          const parsed = JSON.parse(raw);
                          applyMetaTemplate(st, parsed.name, parsed.language);
                        } catch (_) { /* noop */ }
                      }}
                    >
                      <option value="">{ar ? '— لا تغيّر، أو اختَر قالبًا —' : '— Keep / pick template —'}</option>
                      {approvedMetaTemplates.map((t) => (
                        <option
                          key={`${st}-${t.name}|${t.language}`}
                          value={JSON.stringify({ name: t.name, language: t.language })}
                        >
                          {t.name} · {t.language}
                          {t.category ? ` (${t.category})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'اسم القالب في Meta' : 'Template name (Meta)'}</label>
                  <input
                    className="input-field text-sm font-mono"
                    dir="ltr"
                    value={cfg.templateName || ''}
                    onChange={(e) => setStatusField(st, { templateName: e.target.value })}
                    placeholder="order_status_update_v1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'كود اللغة (كما في Meta بالضبط)' : 'Language code (exact Meta locale)'}</label>
                  <input
                    className="input-field text-sm font-mono"
                    dir="ltr"
                    value={cfg.language || 'ar'}
                    onChange={(e) => setStatusField(st, { language: e.target.value })}
                    placeholder="ar / ar_SA / ar_EG / en_US"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {ar
                      ? 'يجب أن يطابق عمود اللغة في القالب المعتمد. (#132001) غالباً بسبب اختلاف اللغة عن المعتمدة.'
                      : 'Must match the approved template’s Language column (#132001 is usually wrong locale vs Meta).'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">{ar ? 'متغيرات النص بالترتيب' : 'Body variables (ordered)'}</label>
                <ul className="space-y-2">
                  {(cfg.bodyVariables || []).map((v, i) => (
                    <li key={`${st}-${i}-${v}`} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono text-primary font-semibold shrink-0">{`{{${i + 1}}}`}</code>
                      <span className="text-sm font-mono flex-1 min-w-0 break-all">{v}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" className="p-1 rounded hover:bg-gray-200" onClick={() => moveVar(st, i, -1)} aria-label="up">
                          <ChevronUp size={16} />
                        </button>
                        <button type="button" className="p-1 rounded hover:bg-gray-200" onClick={() => moveVar(st, i, 1)} aria-label="down">
                          <ChevronDown size={16} />
                        </button>
                        <button type="button" className="p-1 rounded hover:bg-rose-100 text-rose-600" onClick={() => removeVar(st, i)} aria-label="remove">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 mt-3">
                  <select
                    className="input-field text-sm max-w-xs"
                    defaultValue=""
                    onChange={(e) => {
                      addVar(st, e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">{ar ? 'أضف متغيراً…' : 'Add variable…'}</option>
                    {BODY_VAR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.value}{o.hint ? ` (${o.hint})` : ''}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="input-field text-sm flex-1 min-w-[120px] font-mono"
                    dir="ltr"
                    placeholder={ar ? 'مفتاح مخصص (مثال: city)' : 'Custom key (e.g. city)'}
                    value={customAdd[st] || ''}
                    onChange={(e) => setCustomAdd((prev) => ({ ...prev, [st]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm inline-flex items-center gap-1"
                    onClick={() => {
                      addVar(st, customAdd[st]);
                      setCustomAdd((prev) => ({ ...prev, [st]: '' }));
                    }}
                  >
                    <Plus size={16} /> {ar ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={handleSave} className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {ar ? 'حفظ كل التغييرات' : 'Save all changes'}
        </button>
      </div>
    </div>
  );
}
