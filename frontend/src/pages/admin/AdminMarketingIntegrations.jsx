import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  RefreshCw, Zap, Activity, Megaphone, CheckCircle2, XCircle, Loader2, FlaskConical, ListTree, Play,
  Ban, Database, Webhook, ShoppingCart,
} from 'lucide-react';
import api from '../../utils/api';

const STANDARD_EVENTS = [
  'PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist',
  'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead', 'CompleteRegistration',
];

const EMPTY_FORM = {
  meta: {
    pixelId: '', accessToken: '', testEventCode: '',
  },
  snapchat: {
    pixelId: '', accessToken: '',
  },
  google: {
    measurementId: '', apiSecret: '', adsConversionId: '', adsConversionLabel: '',
  },
};

function Badge({ tone, children }) {
  const map = {
    connected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    disconnected: 'bg-gray-50 text-gray-600 ring-gray-100',
    error: 'bg-rose-50 text-rose-700 ring-rose-100',
    testing: 'bg-amber-50 text-amber-800 ring-amber-100',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${map[tone] || map.disconnected}`}>
      {children}
    </span>
  );
}

function ProviderCard({
  lang,
  provider,
  integration,
  form,
  onFormChange,
  onSave,
  onTestConnection,
  onToggleEnabled,
  onToggleTest,
  loading,
}) {
  const statusTone = integration?.connection_status === 'connected' ? 'connected'
    : integration?.connection_status === 'error' ? 'error'
      : integration?.connection_status === 'testing' ? 'testing' : 'disconnected';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Megaphone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{provider.title}</h3>
            <p className="text-xs text-gray-500">{provider.sub}</p>
          </div>
        </div>
        <Badge tone={statusTone}>{integration?.connection_status || 'disconnected'}</Badge>
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-gray-600">{lang === 'ar' ? 'تفعيل' : 'Enable integration'}</span>
        <button
          type="button"
          disabled={loading}
          onClick={() => onToggleEnabled(!integration?.enabled)}
          className={`w-12 h-7 rounded-full transition-colors relative ${integration?.enabled ? 'bg-primary' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${integration?.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-gray-600">{lang === 'ar' ? 'وضع الاختبار' : 'Test mode'}</span>
        <button
          type="button"
          disabled={loading}
          onClick={() => onToggleTest(!integration?.test_mode)}
          className={`w-12 h-7 rounded-full transition-colors relative ${integration?.test_mode ? 'bg-amber-400' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${integration?.test_mode ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        {provider.fields.map((f) => (
          <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
            <input
              type={f.secret ? 'password' : 'text'}
              autoComplete="off"
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={(e) => onFormChange(f.key, e.target.value)}
              className="input-field text-sm"
              dir="ltr"
            />
            {f.hint && <p className="text-[11px] text-gray-400 mt-1">{f.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={onSave} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
          {lang === 'ar' ? 'حفظ' : 'Save'}
        </button>
        <button type="button" disabled={loading} onClick={onTestConnection} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-2">
          <FlaskConical size={16} /> {lang === 'ar' ? 'اختبار الاتصال' : 'Test connection'}
        </button>
      </div>

      <div className="text-xs text-gray-500 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
        <span>{lang === 'ar' ? 'آخر مزامنة:' : 'Last sync:'} {integration?.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : '—'}</span>
        <span>{lang === 'ar' ? 'آخر اختبار:' : 'Last test:'} {integration?.last_test_at ? new Date(integration.last_test_at).toLocaleString() : '—'}</span>
      </div>
      {integration?.last_error && (
        <div className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3 border border-rose-100">
          {integration.last_error}
        </div>
      )}
    </div>
  );
}

export default function AdminMarketingIntegrations() {
  const { language: lang } = useSelector((s) => s.ui);
  const [integrations, setIntegrations] = useState([]);
  const [forms, setForms] = useState(EMPTY_FORM);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [job, setJob] = useState(null);
  const [jobPoll, setJobPoll] = useState(null);
  const [eventPick, setEventPick] = useState('Purchase');
  const [logFilter, setLogFilter] = useState('all');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [i, s, l, q, d] = await Promise.all([
        api.get('/admin/marketing/integrations'),
        api.get('/admin/marketing/stats'),
        api.get('/admin/marketing/logs', { params: { limit: 50, provider: logFilter } }),
        api.get('/admin/marketing/retry-queue', { params: { limit: 80 } }),
        api.get('/admin/marketing/diagnostics'),
      ]);
      setIntegrations(i.data.data || []);
      setStats(s.data.data);
      setLogs(l.data.data || []);
      setQueue(q.data.data || []);
      setDiag(d.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Load failed');
    }
    setLoading(false);
  }, [logFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!jobPoll) return undefined;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/admin/marketing/jobs/${jobPoll}`);
        setJob(data.data);
        if (data.data?.status === 'completed' || data.data?.status === 'failed') {
          clearInterval(t);
          setJobPoll(null);
          toast.success(lang === 'ar' ? 'اكتملت المهمة' : 'Job finished');
          loadAll();
        }
      } catch {
        clearInterval(t);
      }
    }, 700);
    return () => clearInterval(t);
  }, [jobPoll, lang, loadAll]);

  const intByKey = useMemo(() => Object.fromEntries(integrations.map((x) => [x.provider, x])), [integrations]);

  const patchIntegration = async (provider, body) => {
    setSavingId(provider);
    try {
      await api.put(`/admin/marketing/integrations/${provider}`, body);
      toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save error');
    }
    setSavingId(null);
  };

  const handleSave = (provider) => {
    const creds = { ...forms[provider] };
    patchIntegration(provider, {
      enabled: intByKey[provider]?.enabled,
      test_mode: intByKey[provider]?.test_mode,
      credentials: creds,
    });
  };

  const handleToggle = (provider, enabled) => {
    patchIntegration(provider, {
      enabled,
      test_mode: intByKey[provider]?.test_mode,
      credentials: {},
    });
  };

  const handleToggleTest = (provider, test_mode) => {
    patchIntegration(provider, {
      enabled: intByKey[provider]?.enabled,
      test_mode,
      credentials: {},
    });
  };

  const testConn = async (provider) => {
    setSavingId(provider);
    try {
      await api.post(`/admin/marketing/integrations/${provider}/test-connection`);
      toast.success(lang === 'ar' ? 'الاتصال ناجح' : 'Connection OK');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test failed');
    }
    setSavingId(null);
    loadAll();
  };

  const sendSample = async (provider) => {
    setSavingId(provider);
    try {
      await api.post(`/admin/marketing/integrations/${provider}/dispatch-sample`, {
        event_name: eventPick,
        currency: 'EGP',
        value: 99,
        product_ids: [1001],
      });
      toast.success(lang === 'ar' ? 'تم الإرسال' : 'Event sent');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Dispatch failed');
    }
    setSavingId(null);
    loadAll();
  };

  const fullSend = async () => {
    try {
      const { data } = await api.post('/admin/marketing/send-full-events');
      setJob(null);
      setJobPoll(data.data.jobId);
      toast.success(lang === 'ar' ? 'بدأ الإرسال' : 'Full send started');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start');
    }
  };

  const drainQueue = async () => {
    try {
      await api.post('/admin/marketing/retry-queue/drain');
      toast.success('Queue drain triggered');
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Drain failed');
    }
  };

  const retryFailed = async () => {
    try {
      await api.post('/admin/marketing/retry-failed');
      toast.success('Failed events re-queued');
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Retry failed');
    }
  };

  const abandoned = async () => {
    try {
      const { data } = await api.post('/admin/marketing/abandoned-cart-scan', { limit: 40 });
      toast.success(`Abandoned carts: ${data.data?.eventsDispatched ?? 0}`);
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Scan failed');
    }
  };

  const updateForm = (provider, key, val) => {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: val },
    }));
  };

  const providersUI = [
    {
      key: 'meta',
      title: 'Meta (Facebook)',
      sub: 'Pixel + Conversions API',
      fields: [
        { key: 'pixelId', label: 'Pixel ID', placeholder: '1234567890' },
        { key: 'accessToken', label: 'Access token', secret: true, placeholder: 'EAAG...' },
        { key: 'testEventCode', label: 'Test event code (optional)', placeholder: 'TEST12345', hint: 'Shown in Events Manager test tab' },
      ],
    },
    {
      key: 'snapchat',
      title: 'Snapchat',
      sub: 'Pixel + Conversions API',
      fields: [
        { key: 'pixelId', label: 'Pixel ID', placeholder: 'snap-pixel-id' },
        { key: 'accessToken', label: 'Access token', secret: true, placeholder: 'Bearer token' },
      ],
    },
    {
      key: 'google',
      title: 'Google',
      sub: 'GA4 Measurement Protocol + Ads conversion (gtag)',
      fields: [
        { key: 'measurementId', label: 'GA4 Measurement ID', placeholder: 'G-XXXXXXX' },
        { key: 'apiSecret', label: 'GA4 API secret', secret: true, placeholder: 'from GA4 admin' },
        { key: 'adsConversionId', label: 'Google Ads conversion ID', placeholder: 'AW-XXXXXXX' },
        { key: 'adsConversionLabel', label: 'Google Ads label', placeholder: 'YYYYYY' },
      ],
    },
  ];

  if (loading && !integrations.length) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-primary" />
            {lang === 'ar' ? 'تكامل التسويق' : 'Marketing Integrations'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'ar'
              ? 'تتبع الخادم + المتصفح مع تشفير الرموز وتسجيل كامل.'
              : 'Server + browser tracking with encrypted tokens, logs, and retries.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadAll} className="px-4 py-2 rounded-xl border border-gray-200 text-sm flex items-center gap-2 hover:bg-gray-50">
            <RefreshCw size={16} /> {lang === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          <button type="button" onClick={fullSend} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 shadow-lg shadow-primary/20">
            <Play size={18} /> {lang === 'ar' ? 'إرسال كامل للأحداث' : 'Send full events'}
          </button>
        </div>
      </div>

      {jobPoll && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-gray-800">{lang === 'ar' ? 'جاري إرسال الأحداث…' : 'Fan-out job running…'}</p>
            {job && (
              <p className="text-gray-500">
                {job.processed}/{job.total} · OK {job.success_count} · Fail {job.fail_count}
              </p>
            )}
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: lang === 'ar' ? 'نجاح' : 'Success', val: stats.logs?.success, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: lang === 'ar' ? 'فشل' : 'Failed', val: stats.logs?.failed, icon: XCircle, color: 'text-rose-600' },
            { label: lang === 'ar' ? 'طابور' : 'Queue', val: stats.queue_pending, icon: ListTree, color: 'text-amber-600' },
            { label: lang === 'ar' ? '24س' : '24h sent', val: stats.logs?.sent_last_24h, icon: Database, color: 'text-blue-600' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <Icon className={color} size={22} />
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900">{val ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {providersUI.map((p) => (
          <ProviderCard
            key={p.key}
            lang={lang}
            provider={p}
            integration={intByKey[p.key]}
            form={forms[p.key]}
            onFormChange={(k, v) => updateForm(p.key, k, v)}
            onSave={() => handleSave(p.key)}
            onTestConnection={() => testConn(p.key)}
            onToggleEnabled={(v) => handleToggle(p.key, v)}
            onToggleTest={(v) => handleToggleTest(p.key, v)}
            loading={savingId === p.key}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FlaskConical size={18} className="text-primary" /> {lang === 'ar' ? 'مُختبر الأحداث' : 'Event tester'}
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={eventPick} onChange={(e) => setEventPick(e.target.value)} className="input-field text-sm py-2">
              {STANDARD_EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            {['meta', 'snapchat', 'google'].map((prov) => (
              <button
                key={prov}
                type="button"
                disabled={!!savingId}
                onClick={() => sendSample(prov)}
                className="px-3 py-2 text-xs rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              >
                {prov}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ListTree size={18} /> {lang === 'ar' ? 'طابور إعادة المحاولة' : 'Retry queue'}
            </h3>
            <div className="flex gap-2">
              <button type="button" onClick={drainQueue} className="text-xs px-3 py-1.5 rounded-lg border">{lang === 'ar' ? 'معالجة' : 'Drain'}</button>
              <button type="button" onClick={retryFailed} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                {lang === 'ar' ? 'إعادة الفاشل' : 'Retry failed'}
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto text-xs space-y-2">
            {queue.length === 0 && <p className="text-gray-400">{lang === 'ar' ? 'الطابور فارغ' : 'Queue is clear'}</p>}
            {queue.map((q) => (
              <div key={q.id} className="border border-gray-100 rounded-xl p-2 flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{q.provider} · {q.event_name}</p>
                  <p className="text-gray-400 truncate">{q.event_id}</p>
                </div>
                <span className="text-amber-600 whitespace-nowrap">{q.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook size={18} />
            <h3 className="font-bold text-gray-800">{lang === 'ar' ? 'تشخيص' : 'Diagnostics'}</h3>
          </div>
          {diag && (
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Encryption key: {diag.encryption_env_configured ? 'OK' : 'Missing'}</li>
              <li>Meta Graph: {diag.graph_version}</li>
              <li>FRONTEND_URL: {diag.frontend_url_configured ? 'set' : 'missing'}</li>
            </ul>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={abandoned} className="text-xs px-3 py-2 rounded-xl border flex items-center gap-1 hover:bg-gray-50">
              <ShoppingCart size={14} /> {lang === 'ar' ? 'سلة مهجورة' : 'Abandoned carts'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800">{lang === 'ar' ? 'سجل الأحداث' : 'Event logs'}</h3>
          <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="input-field text-sm py-2">
            <option value="all">all</option>
            <option value="meta">meta</option>
            <option value="snapchat">snapchat</option>
            <option value="google">google</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Provider</th>
                <th className="py-2 pr-2">Event</th>
                <th className="py-2 pr-2">HTTP</th>
                <th className="py-2 pr-2">Response / error</th>
                <th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 align-top">
                  <td className="py-2 pr-2">
                    {row.status === 'success' ? <CheckCircle2 className="text-emerald-500" size={16} />
                      : row.status === 'failed' ? <XCircle className="text-rose-500" size={16} />
                        : <Ban className="text-gray-400" size={16} />}
                  </td>
                  <td className="py-2 pr-2 font-medium">{row.provider}</td>
                  <td className="py-2 pr-2">{row.event_name}</td>
                  <td className="py-2 pr-2">{row.http_status ?? '—'}</td>
                  <td className="py-2 pr-2 max-w-xs break-words text-gray-500">
                    {row.error_message || (row.response_body ? String(row.response_body).slice(0, 220) : '—')}
                  </td>
                  <td className="py-2 whitespace-nowrap text-gray-400">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
