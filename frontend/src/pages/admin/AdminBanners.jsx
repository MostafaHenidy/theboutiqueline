import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Edit, Trash2, Upload, ToggleLeft, ToggleRight, ImageIcon, Check, Loader2 } from 'lucide-react';
import api, { apiUpload } from '../../utils/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/helpers';
import { compressHeroImage, uploadErrorMessage } from '../../utils/imageUpload';
import { countSubcategoryNodes } from '../../utils/categoryTree';

const empty = { title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', link: '', type: 'hero', position: 0, is_active: true, mobile_image: '' };

const FALLBACK_HERO = '/photos/Banner2.PNG';

/** Simple hero background editor — upserts the single homepage hero banner. */
function HeroBackgroundPanel({ banners, language, onSaved }) {
  const isAr = language === 'ar';
  const heroRecord = banners.find((b) => b.type === 'hero');
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const desktopPreview = desktopFile
    ? URL.createObjectURL(desktopFile)
    : (heroRecord?.image ? resolveMediaUrl(heroRecord.image) : FALLBACK_HERO);
  const mobilePreview = mobileFile
    ? URL.createObjectURL(mobileFile)
    : (heroRecord?.mobile_image
      ? resolveMediaUrl(heroRecord.mobile_image)
      : (heroRecord?.image ? resolveMediaUrl(heroRecord.image) : FALLBACK_HERO));

  const save = async () => {
    if (!heroRecord?.id && !desktopFile) {
      toast.error(isAr ? 'اختر صورة الهيرو أولاً' : 'Choose a hero image first');
      return;
    }
    if (!desktopFile && !mobileFile && heroRecord?.id) {
      toast.error(isAr ? 'اختر صورة جديدة للحفظ' : 'Choose a new image to save');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', 'hero');
      fd.append('is_active', 'true');
      fd.append('position', '0');
      if (desktopFile) fd.append('image', await compressHeroImage(desktopFile));
      if (mobileFile) fd.append('mobile_image', await compressHeroImage(mobileFile, { maxWidth: 1200 }));

      if (heroRecord?.id) {
        await apiUpload.put(`/admin/banners/${heroRecord.id}`, fd);
      } else {
        await apiUpload.post('/admin/banners', fd);
      }

      toast.success(isAr ? 'تم تحديث خلفية الهيرو' : 'Hero background updated');
      setDesktopFile(null);
      setMobileFile(null);
      onSaved();
    } catch (err) {
      toast.error(uploadErrorMessage(err, isAr));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-100 rounded-2xl px-5 py-4 text-sm text-primary-900 flex items-start gap-3">
        <ImageIcon size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-0.5">
            {isAr ? 'خلفية الهيرو — الصفحة الرئيسية' : 'Homepage hero background'}
          </p>
          <p className="text-primary-800/80">
            {isAr
              ? 'ارفع صورة جديدة للبانر الرئيسي. تظهر مباشرة على الموقع بعد الحفظ.'
              : 'Upload a new image for the main homepage banner. It goes live after you save.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative aspect-[16/10] bg-gray-100">
            <img src={desktopPreview} alt="" className="w-full h-full object-cover" />
            <span className="absolute top-2 start-2 text-[10px] font-bold bg-white/90 px-2 py-1 rounded">
              {isAr ? 'ديسكتوب / تابلت' : 'Desktop / tablet'}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              {isAr ? 'صورة الهيرو (عرض)' : 'Hero image (landscape)'}
            </p>
            <p className="text-xs text-gray-500">
              {isAr ? 'يفضل ~1920×900 أو أعرض' : 'Prefer ~1920×900 or wider'}
            </p>
            <button
              type="button"
              onClick={() => desktopInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={16} />
              {desktopFile ? desktopFile.name : (isAr ? 'اختر صورة' : 'Choose image')}
            </button>
            <input ref={desktopInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setDesktopFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative aspect-[3/4] max-h-72 bg-gray-100 mx-auto w-full">
            <img src={mobilePreview} alt="" className="w-full h-full object-cover" />
            <span className="absolute top-2 start-2 text-[10px] font-bold bg-white/90 px-2 py-1 rounded">
              {isAr ? 'موبايل' : 'Mobile'}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              {isAr ? 'صورة الموبايل (اختياري)' : 'Mobile image (optional)'}
            </p>
            <p className="text-xs text-gray-500">
              {isAr ? 'Portrait للجوال — إن تركتها تُستخدم صورة الديسكتوب' : 'Portrait for phones — if empty, desktop image is used'}
            </p>
            <button
              type="button"
              onClick={() => mobileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-amber-200 bg-amber-50/50 rounded-xl py-3 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={16} />
              {mobileFile ? mobileFile.name : (isAr ? 'اختر صورة موبايل' : 'Choose mobile image')}
            </button>
            <input ref={mobileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setMobileFile(e.target.files?.[0] || null)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || (!desktopFile && !mobileFile)}
          className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {isAr ? 'حفظ خلفية الهيرو' : 'Save hero background'}
        </button>
        {heroRecord && !heroRecord.is_active && (
          <p className="text-sm text-amber-600">
            {isAr ? 'تنبيه: البانر الحالي غير مفعّل — سيتم تفعيله عند الحفظ' : 'Note: current hero is inactive — saving will activate it'}
          </p>
        )}
        {!heroRecord && (
          <p className="text-sm text-gray-500">
            {isAr ? 'لا يوجد بانر محفوظ — يُستخدم الافتراضي حتى ترفع صورة' : 'No saved hero yet — default image is used until you upload'}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Category Image Card ─── */
function CategoryImageCard({ cat, language, onSaved }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(cat.image || null);
  const [saving, setSaving]   = useState(false);
  const inputRef              = useRef();

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.put(`/categories/${cat.id}`, fd);
      toast.success(language === 'ar' ? 'تم تحديث صورة الكاتيجوري' : 'Category image updated');
      setFile(null);
      onSaved();
    } catch {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error saving');
    }
    setSaving(false);
  };

  const name = language === 'ar' ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image preview */}
      <div className="relative h-44 bg-gray-100 group">
        {preview ? (
          <img src={typeof preview === 'string' ? resolveMediaUrl(preview) : preview} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <ImageIcon size={36} />
            <span className="text-sm">{language === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
          </div>
        )}

        {/* Upload overlay on hover */}
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <span className="bg-white text-primary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <Upload size={14} />
            {language === 'ar' ? 'تغيير الصورة' : 'Change Image'}
          </span>
        </button>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        {/* "new" badge when file selected */}
        {file && (
          <div className="absolute top-2 start-2 bg-primary text-gray-950 text-[11px] font-black px-2.5 py-1 rounded-full">
            {language === 'ar' ? 'جديد' : 'NEW'}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="font-bold text-gray-800 text-sm">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {countSubcategoryNodes(cat.subcategories)} {language === 'ar' ? 'قسم فرعي' : 'subcategories'}
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 hover:border-primary hover:text-primary text-xs font-semibold py-2 rounded-xl transition-colors"
          >
            <Upload size={13} />
            {language === 'ar' ? 'اختر صورة' : 'Choose'}
          </button>

          {file && (
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-60"
            >
              {saving
                ? <Loader2 size={13} className="animate-spin" />
                : <Check size={13} />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
          )}
        </div>

        {file && (
          <p className="text-[11px] text-gray-400 mt-2 truncate">{file.name}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function AdminBanners() {
  const { language } = useSelector((s) => s.ui);
  const isAr = language === 'ar';

  const [tab, setTab]           = useState('hero');   // 'hero' | 'banners' | 'categories'
  const [banners, setBanners]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(empty);
  const [editId, setEditId]     = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [mobileImageFile, setMobileImageFile] = useState(null);

  const fetchBanners    = () => api.get('/admin/banners').then(({ data }) => setBanners(data.data)).catch(() => {});
  const fetchCategories = () => api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});

  useEffect(() => { fetchBanners(); fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      const skipMedia = new Set(['image', 'mobile_image']);
      Object.entries(form).forEach(([k, v]) => {
        if (skipMedia.has(k)) return;
        if (v === undefined || v === null) return;
        fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
      });
      if (imageFile) fd.append('image', await compressHeroImage(imageFile));
      if (mobileImageFile) fd.append('mobile_image', await compressHeroImage(mobileImageFile, { maxWidth: 1200 }));
      /* لا تضبط Content-Type يدوياً — axios يضيف boundary تلقائياً؛ بدونه الطلب يفشل */
      if (editId) await apiUpload.put(`/admin/banners/${editId}`, fd);
      else await apiUpload.post('/admin/banners', fd);
      toast.success(isAr ? 'تم الحفظ' : 'Saved');
      fetchBanners(); setShowForm(false); setForm(empty); setEditId(null); setImageFile(null); setMobileImageFile(null);
    } catch (err) {
      toast.error(uploadErrorMessage(err, isAr));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(isAr ? 'هل تريد الحذف؟' : 'Delete?')) return;
    await api.delete(`/admin/banners/${id}`);
    fetchBanners();
  };

  const handleToggle = async (id, active) => {
    await api.put(`/admin/banners/${id}`, { is_active: !active });
    setBanners((bs) => bs.map((b) => b.id === id ? { ...b, is_active: !active } : b));
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {isAr ? 'البانرات والصور' : 'Banners & Images'}
        </h1>
        {tab === 'banners' && (
          <button
            onClick={() => { setShowForm(true); setForm(empty); setEditId(null); setImageFile(null); setMobileImageFile(null); }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Plus size={18} /> {isAr ? 'إضافة بانر' : 'Add Banner'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setTab('hero')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'hero' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {isAr ? 'خلفية الهيرو' : 'Hero Background'}
        </button>
        <button
          onClick={() => setTab('banners')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'banners' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {isAr ? 'البانرات' : 'Banners'}
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'categories' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {isAr ? 'صور الكاتيجوري (الهوم)' : 'Category Images (Home)'}
        </button>
      </div>

      {tab === 'hero' && (
        <HeroBackgroundPanel
          banners={banners}
          language={language}
          onSaved={fetchBanners}
        />
      )}

      {/* ── TAB: Banners ── */}
      {tab === 'banners' && (
        <>
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">
                {editId ? (isAr ? 'تعديل البانر' : 'Edit Banner') : (isAr ? 'بانر جديد' : 'New Banner')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">العنوان بالعربية</label>
                  <input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="input-field" dir="rtl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Title in English</label>
                  <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} className="input-field" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الوصف العربي</label>
                  <input value={form.subtitle_ar} onChange={e => setForm({ ...form, subtitle_ar: e.target.value })} className="input-field" dir="rtl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Subtitle English</label>
                  <input value={form.subtitle_en} onChange={e => setForm({ ...form, subtitle_en: e.target.value })} className="input-field" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{isAr ? 'الرابط' : 'Link'}</label>
                  <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className="input-field" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{isAr ? 'النوع' : 'Type'}</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                    <option value="hero">Hero</option>
                    <option value="promotion">Promotion</option>
                    <option value="category">Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{isAr ? 'الترتيب' : 'Position'}</label>
                  <input type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) })} className="input-field" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{isAr ? 'صورة الديسكتوب (الهيرو)' : 'Desktop hero image'}</label>
                  <p className="text-xs text-gray-500 mb-1.5">
                    {isAr
                      ? 'يُفضّل عريض (~1920×900 تقريباً أو أعرض). تظهر على الشاشات المتوسطة والكبيرة.'
                      : 'Prefer wide (~1920×900 or wider). Shown on tablet/desktop.'}
                  </p>
                  <label className="flex items-center gap-2 border border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-primary transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-400">{imageFile ? imageFile.name : (isAr ? 'اختر صورة' : 'Choose image')}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                {form.type === 'hero' && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{isAr ? 'صورة الموبايل (اختياري)' : 'Mobile hero image (optional)'}</label>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {isAr
                        ? 'Portrait أو مربع يناسب الجوال — يُعرض حتى عرض 767px. إن تركتها فاضية تُستخدم صورة الديسكتوب.'
                        : 'Portrait or square crop for phones — used below 768px. If empty, the desktop image is reused.'}
                    </p>
                    <label className="flex items-center gap-2 border border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-3 cursor-pointer hover:border-primary transition-colors">
                      <Upload size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-400">{mobileImageFile ? mobileImageFile.name : (isAr ? 'اختر صورة موبايل' : 'Choose mobile image')}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setMobileImageFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button type="submit" className="btn-primary px-6">{isAr ? 'حفظ' : 'Save'}</button>
                <button type="button" onClick={() => { setShowForm(false); setMobileImageFile(null); setImageFile(null); }} className="btn-outline px-6">{isAr ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {b.type === 'hero' && b.mobile_image ? (
                  <div className="grid grid-cols-2 gap-px bg-gray-200">
                    <div className="relative h-32 bg-gray-100">
                      <span className="absolute top-1 start-1 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded z-10">Desktop</span>
                      {b.image ? (
                        <img src={resolveMediaUrl(b.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                      )}
                    </div>
                    <div className="relative h-32 bg-gray-100">
                      <span className="absolute top-1 start-1 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded z-10">Mobile</span>
                      <img src={resolveMediaUrl(b.mobile_image)} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : b.image ? (
                  <img src={resolveMediaUrl(b.image)} alt={b.title_en} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-r from-primary to-primary-700 flex items-center justify-center">
                    <p className="text-white/50 text-sm">{isAr ? 'لا توجد صورة' : 'No image'}</p>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-gray-800">{b.title_ar || b.title_en || 'Untitled'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.type} • {isAr ? `الترتيب: ${b.position}` : `Position: ${b.position}`}</p>
                  <div className="flex items-center justify-between mt-3">
                    <button onClick={() => handleToggle(b.id, b.is_active)}>
                      {b.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft  size={22} className="text-gray-300" />}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditId(b.id); setForm({ ...empty, ...b }); setShowForm(true); setImageFile(null); setMobileImageFile(null); }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: Category Images ── */}
      {tab === 'categories' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700 flex items-start gap-3">
            <ImageIcon size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">
                {isAr ? 'صور الكاتيجوري في الهوم بيدج' : 'Home Page Category Images'}
              </p>
              <p className="text-amber-600">
                {isAr
                  ? 'اختر الكاتيجوري التي تريد تغيير صورتها، ثم اضغط على الصورة أو زر "اختر صورة" وارفع الصورة الجديدة واضغط حفظ.'
                  : 'Click on any category card or the "Choose" button to upload a new image, then press Save.'}
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
              <p>{isAr ? 'لا توجد كاتيجوريات' : 'No categories found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {categories.map((cat) => (
                <CategoryImageCard
                  key={cat.id}
                  cat={cat}
                  language={language}
                  onSaved={fetchCategories}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
