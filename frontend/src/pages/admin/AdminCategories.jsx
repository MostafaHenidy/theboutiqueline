import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Upload, ImageIcon, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/helpers';
import { countSubcategoryNodes, flattenSubcategoryOptions } from '../../utils/categoryTree';

const emptyForm = {
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  coming_soon_label_ar: '',
  coming_soon_label_en: '',
  is_active: true,
  sort_order: 0,
};

const emptySubForm = {
  name_ar: '',
  name_en: '',
  category_id: '',
  parent_id: null,
  is_active: true,
  sort_order: 0,
};

const isActive = (row) => row?.is_active !== false && row?.is_active !== 0;

function buildCategoryFormData(form, imageFile) {
  const fd = new FormData();
  const skip = new Set(['image', 'id', 'slug', 'subcategories', 'created_at', 'updated_at']);
  Object.entries(form).forEach(([k, v]) => {
    if (skip.has(k)) return;
    if (v === undefined || v === null) return;
    fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
  });
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

function CategoryImageField({ language, preview, imageFile, onPick, onClear }) {
  const inputRef = useRef();
  const isAr = language === 'ar';
  const src = imageFile ? preview : (preview ? resolveMediaUrl(preview) : null);

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium mb-1.5">
        {isAr ? 'صورة الفئة' : 'Category image'}
      </label>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="relative w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
          {src ? (
            <img src={src} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300">
              <ImageIcon size={28} />
              <span className="text-xs">{isAr ? 'لا توجد صورة' : 'No image'}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-colors"
          >
            <Upload size={16} />
            {isAr ? 'اختر من الجهاز' : 'Choose from device'}
          </button>
          {(imageFile || preview) && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-red-500 text-start"
            >
              {isAr ? 'إزالة الصورة المختارة' : 'Remove selected image'}
            </button>
          )}
          {imageFile && (
            <p className="text-xs text-gray-400 truncate max-w-[220px]">{imageFile.name}</p>
          )}
          <p className="text-xs text-gray-400">
            {isAr ? 'تظهر في الصفحة الرئيسية وقوائم الفئات.' : 'Shown on the home page and category listings.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function CategoryListImage({ cat, language, onUpdated }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const isAr = language === 'ar';

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.put(`/categories/${cat.id}`, fd);
      toast.success(isAr ? 'تم تحديث الصورة' : 'Image updated');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? 'فشل رفع الصورة' : 'Upload failed'));
    }
    setUploading(false);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!uploading) inputRef.current?.click();
      }}
      className={`relative w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-gray-200 ${!isActive(cat) ? 'opacity-50 grayscale' : ''}`}
      title={isAr ? 'رفع صورة' : 'Upload image'}
    >
      {cat.image ? (
        <img src={resolveMediaUrl(cat.image)} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={16} />}
        </span>
      )}
      {uploading && cat.image && (
        <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-white" />
        </span>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
    </button>
  );
}

function SubcategoryTree({
  nodes,
  categoryId,
  depth,
  language,
  subExpanded,
  setSubExpanded,
  addSubFormKey,
  onAddChild,
  onEdit,
  onToggle,
  onDelete,
}) {
  if (!nodes?.length) return null;

  return (
    <div className="space-y-1">
      {nodes.map((sub) => {
        const hasChildren = sub.children?.length > 0;
        const expanded = subExpanded[sub.id] !== false;
        const formKey = `${categoryId}:${sub.id}`;

        return (
          <div key={sub.id}>
            <div
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-xl"
              style={{ paddingInlineStart: `${24 + depth * 20}px` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => setSubExpanded((prev) => ({ ...prev, [sub.id]: !expanded }))}
                    className="text-gray-400 flex-shrink-0"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="w-[14px] flex-shrink-0" />
                )}
                <p className={`text-sm truncate ${isActive(sub) ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                  {sub.name_ar} / {sub.name_en}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onToggle(sub)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                  title={language === 'ar' ? 'تفعيل / تعطيل' : 'Enable / disable'}
                >
                  {isActive(sub) ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => onAddChild(categoryId, sub.id)}
                  className="p-1 text-green-500 hover:bg-green-50 rounded-lg"
                  title={language === 'ar' ? 'إضافة فرعي' : 'Add child'}
                >
                  <Plus size={14} />
                </button>
                <button type="button" onClick={() => onEdit(sub, categoryId)} className="p-1 text-gray-400 hover:text-primary rounded-lg">
                  <Edit size={14} />
                </button>
                <button type="button" onClick={() => onDelete(sub.id)} className="p-1 text-gray-300 hover:text-red-500 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {addSubFormKey === formKey && (
              <SubcategoryForm
                language={language}
                depth={depth + 1}
                onCancel={() => onAddChild(null, null, true)}
                categoryId={categoryId}
                parentId={sub.id}
                onSaved={() => onAddChild(null, null, true)}
              />
            )}

            {hasChildren && expanded && (
              <SubcategoryTree
                nodes={sub.children}
                categoryId={categoryId}
                depth={depth + 1}
                language={language}
                subExpanded={subExpanded}
                setSubExpanded={setSubExpanded}
                addSubFormKey={addSubFormKey}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubcategoryForm({ language, depth, categoryId, parentId, onCancel, onSaved, initial }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(
    initial
      ? {
          name_ar: initial.name_ar || '',
          name_en: initial.name_en || '',
          category_id: categoryId,
          parent_id: initial.parent_id ?? null,
          is_active: isActive(initial),
          sort_order: initial.sort_order ?? 0,
        }
      : { ...emptySubForm, category_id: categoryId, parent_id: parentId ?? null },
  );
  const [parentOptions, setParentOptions] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    api.get('/categories/admin/all').then(({ data }) => {
      const cat = (data.data || []).find((c) => c.id === categoryId);
      const flat = flattenSubcategoryOptions(cat?.subcategories || [], language);
      setParentOptions(flat.filter((o) => o.id !== initial.id));
    });
  }, [isEdit, categoryId, initial?.id, language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/categories/subcategories/${initial.id}`, form);
      } else {
        await api.post('/categories/subcategories', form);
      }
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || (language === 'ar' ? 'خطأ' : 'Error'));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 rounded-xl p-4 mb-3 mt-2"
      style={{ marginInlineStart: `${24 + depth * 20}px` }}
    >
      <p className="text-sm font-semibold mb-3">
        {isEdit
          ? (language === 'ar' ? 'تعديل فئة فرعية' : 'Edit subcategory')
          : parentId
            ? (language === 'ar' ? 'إضافة فئة فرعية متداخلة' : 'Add nested subcategory')
            : (language === 'ar' ? 'إضافة فئة فرعية' : 'Add subcategory')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="الاسم بالعربية *" className="input-field text-sm py-2" required dir="rtl" />
        <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Name in English *" className="input-field text-sm py-2" required dir="ltr" />
        <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} placeholder={language === 'ar' ? 'الترتيب' : 'Sort order'} className="input-field text-sm py-2" />
        {isEdit && (
          <select
            value={form.parent_id ?? ''}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value ? parseInt(e.target.value, 10) : null })}
            className="input-field text-sm py-2 sm:col-span-2"
          >
            <option value="">{language === 'ar' ? 'مستوى رئيسي (تحت الفئة)' : 'Top level (under category)'}</option>
            {parentOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
          {language === 'ar' ? 'نشطة' : 'Active'}
        </label>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="btn-primary px-4 py-2 text-sm">{language === 'ar' ? 'حفظ' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-sm">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </form>
  );
}

export default function AdminCategories() {
  const { language } = useSelector((s) => s.ui);
  const isAr = language === 'ar';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addSubFormKey, setAddSubFormKey] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [subExpanded, setSubExpanded] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const resetFormState = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const pickCategoryImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearCategoryImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const openCreateForm = () => {
    resetFormState();
    setShowForm(true);
  };

  const openEditForm = (cat) => {
    setEditId(cat.id);
    setForm({ ...emptyForm, ...cat, is_active: isActive(cat) });
    setImageFile(null);
    setImagePreview(cat.image || null);
    setShowForm(true);
  };

  const fetchCats = () => {
    setLoading(true);
    api.get('/categories/admin/all')
      .then(({ data }) => setCategories(data.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchCats(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = buildCategoryFormData(form, imageFile);
      if (editId) await api.put(`/categories/${editId}`, fd);
      else await api.post('/categories', fd);
      toast.success(isAr ? 'تم الحفظ' : 'Saved');
      fetchCats();
      resetFormState();
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? 'خطأ' : 'Error'));
    }
  };

  const handleToggleCategory = async (id, active) => {
    try {
      await api.put(`/categories/${id}`, { is_active: !active });
      setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, is_active: !active } : c)));
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
    } catch {
      toast.error(isAr ? 'خطأ' : 'Error');
    }
  };

  const handleToggleSub = async (sub) => {
    try {
      await api.put(`/categories/subcategories/${sub.id}`, { is_active: !isActive(sub) });
      fetchCats();
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
    } catch {
      toast.error(isAr ? 'خطأ' : 'Error');
    }
  };

  const handleDelete = async (id, type = 'category') => {
    if (!confirm(isAr ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
    try {
      if (type === 'sub') await api.delete(`/categories/subcategories/${id}`);
      else await api.delete(`/categories/${id}`);
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      fetchCats();
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? 'خطأ' : 'Error'));
    }
  };

  const openAddSub = (categoryId, parentId = null, cancel = false) => {
    if (cancel) {
      setAddSubFormKey(null);
      return;
    }
    setEditSub(null);
    setAddSubFormKey(parentId ? `${categoryId}:${parentId}` : `${categoryId}:root`);
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{isAr ? 'الفئات' : 'Categories'}</h1>
        <button onClick={openCreateForm} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus size={18} /> {isAr ? 'إضافة فئة' : 'Add Category'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-4">{editId ? (isAr ? 'تعديل الفئة' : 'Edit Category') : (isAr ? 'فئة جديدة' : 'New Category')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1.5">الاسم بالعربية *</label><input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="input-field" required dir="rtl" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Name in English *</label><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="input-field" required dir="ltr" /></div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{isAr ? 'ترتيب العرض' : 'Sort order'}</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input-field" />
            </div>
            <div className="flex items-center gap-3 pt-6 sm:col-span-2">
              <input id="cat-is-active" type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="cat-is-active" className="text-sm font-medium text-gray-700">
                {isAr ? 'نشطة (تظهر للعملاء — المعطّلة تظهر مع تنبيه)' : 'Active (disabled categories show with overlay on storefront)'}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{isAr ? 'تاريخ / ملصق القريباً (إنجليزي)' : 'Coming soon label (English)'}</label>
              <input value={form.coming_soon_label_en} onChange={(e) => setForm({ ...form, coming_soon_label_en: e.target.value })} className="input-field" dir="ltr" placeholder="(2027) or SEP" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{isAr ? 'تاريخ / ملصق القريباً (عربي)' : 'Coming soon label (Arabic)'}</label>
              <input value={form.coming_soon_label_ar} onChange={(e) => setForm({ ...form, coming_soon_label_ar: e.target.value })} className="input-field" dir="rtl" placeholder="(2027) أو (سبتمبر)" />
            </div>
            <CategoryImageField
              language={language}
              preview={imagePreview}
              imageFile={imageFile}
              onPick={pickCategoryImage}
              onClear={clearCategoryImage}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-primary px-6">{isAr ? 'حفظ' : 'Save'}</button>
            <button type="button" onClick={resetFormState} className="btn-outline px-6">{isAr ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </form>
      )}

      {editSub && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <SubcategoryForm
            language={language}
            depth={0}
            categoryId={editSub.categoryId}
            parentId={editSub.sub.parent_id}
            initial={editSub.sub}
            onCancel={() => setEditSub(null)}
            onSaved={() => { setEditSub(null); fetchCats(); }}
          />
        </div>
      )}

      <div className="space-y-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />) :
          categories.map((cat) => (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl shadow-sm border ${isActive(cat) ? 'border-gray-100' : 'border-amber-200 bg-amber-50/30'}`}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CategoryListImage cat={cat} language={language} onUpdated={fetchCats} />
                  <button type="button" onClick={() => setExpanded({ ...expanded, [cat.id]: !expanded[cat.id] })} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                    {expanded[cat.id] ? <ChevronDown size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{cat.name_ar} / {cat.name_en}</p>
                      <p className="text-xs text-gray-400">
                        {countSubcategoryNodes(cat.subcategories)} {isAr ? 'فئة فرعية' : 'subcategories'}
                        {!isActive(cat) && (
                          <span className="ms-2 text-amber-700 font-medium">
                            · {isAr ? 'معطّلة على المتجر' : 'Disabled on storefront'}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleToggleCategory(cat.id, isActive(cat))} className="p-1.5 rounded-lg hover:bg-gray-50">
                    {isActive(cat) ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                  </button>
                  <button type="button" onClick={() => openAddSub(cat.id)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title={isAr ? 'إضافة فئة فرعية' : 'Add subcategory'}>
                    <Plus size={16} />
                  </button>
                  <button type="button" onClick={() => openEditForm(cat)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg"><Edit size={16} /></button>
                  <button type="button" onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>

              {expanded[cat.id] && (
                <div className="border-t border-gray-50 px-4 pb-4">
                  {addSubFormKey === `${cat.id}:root` && (
                    <SubcategoryForm
                      language={language}
                      depth={0}
                      categoryId={cat.id}
                      parentId={null}
                      onCancel={() => openAddSub(null, null, true)}
                      onSaved={() => { openAddSub(null, null, true); fetchCats(); }}
                    />
                  )}
                  <SubcategoryTree
                    nodes={cat.subcategories}
                    categoryId={cat.id}
                    depth={0}
                    language={language}
                    subExpanded={subExpanded}
                    setSubExpanded={setSubExpanded}
                    addSubFormKey={addSubFormKey}
                    onAddChild={openAddSub}
                    onEdit={(sub, categoryId) => { setEditSub({ sub, categoryId }); setAddSubFormKey(null); }}
                    onToggle={handleToggleSub}
                    onDelete={(id) => handleDelete(id, 'sub')}
                  />
                  {!cat.subcategories?.length && addSubFormKey !== `${cat.id}:root` && (
                    <p className="text-xs text-gray-400 ps-6 pt-2">{isAr ? 'لا توجد فئات فرعية' : 'No subcategories yet'}</p>
                  )}
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}
