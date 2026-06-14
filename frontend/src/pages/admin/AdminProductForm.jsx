import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, X, Plus, Check } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { parseJsonStringArray, resolveMediaUrl } from '../../utils/helpers';
import { flattenSubcategoryOptions } from '../../utils/categoryTree';
import {
  buildVariantCombinations,
  variantsFromProduct,
  variantRowsToPayload,
} from '../../utils/productVariants';

function ProductImageThumb({ src, alt, onRemove, removeLabel }) {
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <img src={src} alt={alt} className="w-full h-full object-cover rounded-xl border border-gray-100" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -end-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
        aria-label={removeLabel}
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function numStr(v) {
  if (v === null || v === undefined || v === '') return '';
  return typeof v === 'object' && v !== null ? String(Number(v.toString())) : String(v);
}

function productDtoToForm(p) {
  if (!p) return null;
  return {
    name_ar: p.name_ar ?? '',
    name_en: p.name_en ?? '',
    description_ar: p.description_ar ?? '',
    description_en: p.description_en ?? '',
    price: numStr(p.price),
    sale_price: numStr(p.sale_price),
    cost_price: numStr(p.cost_price),
    stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : '0',
    category_id: p.category_id != null ? String(p.category_id) : '',
    subcategory_id: p.subcategory_id != null ? String(p.subcategory_id) : '',
    sku: p.sku ?? '',
    slug: p.slug ?? '',
    is_active: !!p.is_active,
    is_featured: !!p.is_featured,
    is_new_arrival: !!p.is_new_arrival,
    is_best_seller: !!p.is_best_seller,
    is_on_sale: !!p.is_on_sale,
    is_hero_ticker: !!p.is_hero_ticker,
    hero_ticker_order: p.hero_ticker_order != null ? String(p.hero_ticker_order) : '',
    hero_ticker_image_id: p.hero_ticker_image_id != null ? String(p.hero_ticker_image_id) : '',
    sizes: parseJsonStringArray(p.sizes),
    colors: parseJsonStringArray(p.colors),
    tags: parseJsonStringArray(p.tags),
    meta_title_ar: p.meta_title_ar ?? '',
    meta_title_en: p.meta_title_en ?? '',
    meta_description_ar: p.meta_description_ar ?? '',
    meta_description_en: p.meta_description_en ?? '',
    weight: p.weight != null && p.weight !== '' ? String(p.weight) : '',
    low_stock_threshold: p.low_stock_threshold != null ? String(p.low_stock_threshold) : '5',
  };
}

/** Keys safe to send when creating/updating a product (avoid nested Sequelize fields). */
function formToPayload(f) {
  return {
    name_ar: f.name_ar,
    name_en: f.name_en,
    description_ar: f.description_ar,
    description_en: f.description_en,
    price: f.price !== '' ? f.price : 0,
    sale_price: f.sale_price || null,
    cost_price: f.cost_price || null,
    stock: f.stock !== '' ? parseInt(f.stock, 10) || 0 : 0,
    category_id: f.category_id ? parseInt(f.category_id, 10) : undefined,
    subcategory_id: f.subcategory_id ? parseInt(f.subcategory_id, 10) : null,
    sku: f.sku || undefined,
    slug: f.slug || undefined,
    is_active: f.is_active,
    is_featured: f.is_featured,
    is_new_arrival: f.is_new_arrival,
    is_best_seller: f.is_best_seller,
    is_on_sale: f.is_on_sale,
    is_hero_ticker: f.is_hero_ticker,
    ...(f.is_hero_ticker && f.hero_ticker_order !== ''
      ? { hero_ticker_order: parseInt(f.hero_ticker_order, 10) }
      : {}),
    ...(f.is_hero_ticker
      ? {
          hero_ticker_image_id: f.hero_ticker_image_id !== ''
            ? parseInt(f.hero_ticker_image_id, 10)
            : null,
        }
      : {}),
    sizes: f.sizes || [],
    colors: f.colors || [],
    tags: f.tags || [],
    meta_title_ar: f.meta_title_ar,
    meta_title_en: f.meta_title_en,
    meta_description_ar: f.meta_description_ar,
    meta_description_en: f.meta_description_en,
    ...(f.weight !== '' ? { weight: f.weight } : {}),
    ...(f.low_stock_threshold !== '' ? { low_stock_threshold: parseInt(f.low_stock_threshold, 10) || 5 } : {}),
  };
}

const INITIAL_FORM = {
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  price: '',
  sale_price: '',
  cost_price: '',
  stock: '0',
  category_id: '',
  subcategory_id: '',
  sku: '',
  slug: '',
  is_active: true,
  is_featured: false,
  is_new_arrival: true,
  is_best_seller: false,
  is_on_sale: false,
  is_hero_ticker: false,
  hero_ticker_order: '',
  hero_ticker_image_id: '',
  sizes: [],
  colors: [],
  tags: [],
  meta_title_ar: '',
  meta_title_en: '',
  meta_description_ar: '',
  meta_description_en: '',
  weight: '',
  low_stock_threshold: '5',
};

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useSelector((s) => s.ui);
  const isAr = language === 'ar';
  const isEdit = !!id && id !== 'new';

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const imageInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [variantStocks, setVariantStocks] = useState({});
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [heroTickerSlots, setHeroTickerSlots] = useState([]);

  const subcategoryOptions = useMemo(() => {
    const cat = categories.find((c) => String(c.id) === String(form.category_id));
    return flattenSubcategoryOptions(cat?.subcategories || [], language);
  }, [categories, form.category_id, language]);

  const variantCombinations = buildVariantCombinations(form.sizes, form.colors);
  const usesVariantStock = variantCombinations.length > 0;

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data || [])).catch(() => {
      toast.error(isAr ? 'تعذر تحميل التصنيفات' : 'Failed to load categories');
    });
    api.get('/products?hero_ticker=true&limit=100')
      .then(({ data }) => setHeroTickerSlots(data.data || []))
      .catch(() => {});
  }, [isAr]);

  const heroTickerCount = heroTickerSlots.length;

  const loadProduct = useCallback(async () => {
    if (!isEdit) return;
    setLoadingProduct(true);
    try {
      const { data } = await api.get(`/admin/products/${id}`);
      const dto = productDtoToForm(data.data);
      if (dto) setForm((prev) => ({ ...prev, ...dto }));
      else toast.error(isAr ? 'بيانات المنتج غير صالحة' : 'Invalid product data');
      setExistingImages(data.data?.images || []);
      setVariantStocks(variantsFromProduct(data.data));
    } catch {
      toast.error(isAr ? 'تعذر تحميل المنتج' : 'Could not load product');
    } finally {
      setLoadingProduct(false);
    }
  }, [id, isEdit, isAr]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    const combos = buildVariantCombinations(form.sizes, form.colors);
    if (!combos.length) return;
    setVariantStocks((prev) => {
      const next = { ...prev };
      combos.forEach(({ key }) => {
        if (next[key] === undefined) next[key] = '0';
      });
      Object.keys(next).forEach((key) => {
        if (!combos.some((c) => c.key === key)) delete next[key];
      });
      return next;
    });
  }, [form.sizes, form.colors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formToPayload(form),
        ...(usesVariantStock
          ? { variants: variantRowsToPayload(variantStocks, form.sizes, form.colors) }
          : {}),
      };
      let savedProduct;
      if (isEdit) {
        const { data } = await api.put(`/products/${id}`, payload);
        savedProduct = data.data;
      } else {
        const { data } = await api.post('/products', payload);
        savedProduct = data.data;
      }
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('images', f));
        await api.post(`/products/${savedProduct.id}/images`, formData);
      }
      toast.success(isEdit ? (isAr ? 'تم التحديث' : 'Updated') : isAr ? 'تم الإنشاء' : 'Created');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
    setLoading(false);
  };

  const addTag = (type, val) => {
    if (!val.trim() || form[type].includes(val.trim())) return;
    setForm({ ...form, [type]: [...form[type], val.trim()] });
  };
  const removeTag = (type, val) => setForm({ ...form, [type]: form[type].filter((v) => v !== val) });

  const newImagePreviews = useMemo(
    () => imageFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [imageFiles],
  );

  useEffect(() => () => {
    newImagePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [newImagePreviews]);

  const addImageFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;
    setImageFiles((prev) => [...prev, ...incoming]);
  };

  const handleImageInputChange = (e) => {
    addImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addImageFiles(e.dataTransfer.files);
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (img) => {
    if (!isEdit) return;
    try {
      await api.delete(`/products/${id}/images/${img.id}`);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
      setForm((prev) => (
        String(prev.hero_ticker_image_id) === String(img.id)
          ? { ...prev, hero_ticker_image_id: '' }
          : prev
      ));
      toast.success(isAr ? 'تم حذف الصورة' : 'Image removed');
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? 'تعذر حذف الصورة' : 'Could not remove image'));
    }
  };

  const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];
  const hasImages = existingImages.length > 0 || imageFiles.length > 0;

  if (loadingProduct) {
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} className="py-12 text-center text-gray-500">
        {isAr ? 'جاري تحميل المنتج...' : 'Loading product...'}
      </div>
    );
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? (isAr ? 'تعديل المنتج' : 'Edit Product') : isAr ? 'إضافة منتج جديد' : 'Add New Product'}</h1>
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost">
          {isAr ? 'رجوع' : 'Back'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'معلومات المنتج' : 'Product Info'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم بالعربية *</label>
                  <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="input-field" required dir="rtl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name in English *</label>
                  <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="input-field" required dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الوصف بالعربية</label>
                  <textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={8} className="input-field resize-y min-h-[8rem]" dir="rtl" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description in English</label>
                  <textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={8} className="input-field resize-y min-h-[8rem]" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'التسعير والمخزون' : 'Pricing & Stock'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { field: 'price', label: isAr ? 'السعر *' : 'Price *' },
                  { field: 'sale_price', label: isAr ? 'سعر التخفيض' : 'Sale Price' },
                  { field: 'cost_price', label: isAr ? 'التكلفة' : 'Cost' },
                  ...(!usesVariantStock ? [{ field: 'stock', label: isAr ? 'المخزون' : 'Stock' }] : []),
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input
                      type="number"
                      min="0"
                      step={field === 'stock' ? '1' : '0.01'}
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="input-field"
                      dir="ltr"
                      required={field === 'price'}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-field" dir="ltr" placeholder={isEdit ? '' : 'Auto-generated'} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'المقاسات والألوان' : 'Sizes & Colors'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'المقاسات' : 'Sizes'}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => (form.sizes.includes(s) ? removeTag('sizes', s) : addTag('sizes', s))}
                        className={`px-3 py-1 rounded-lg text-sm border transition-colors ${form.sizes.includes(s) ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:border-primary'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder={isAr ? 'مقاس مخصص' : 'Custom size'} className="input-field flex-1 text-sm py-2" />
                    <button type="button" onClick={() => { addTag('sizes', newSize); setNewSize(''); }} className="btn-outline px-3 py-2">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{isAr ? 'الألوان' : 'Colors'}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.colors.map((c) => (
                      <span key={c} className="flex items-center gap-1 bg-primary-50 text-primary px-3 py-1 rounded-lg text-sm">
                        {c}{' '}
                        <button type="button" onClick={() => removeTag('colors', c)} className="hover:text-red-500">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder={isAr ? 'أضف لوناً' : 'Add color'} className="input-field flex-1 text-sm py-2" />
                    <button type="button" onClick={() => { addTag('colors', newColor); setNewColor(''); }} className="btn-outline px-3 py-2">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {usesVariantStock && (
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isAr ? 'المخزون لكل مقاس ولون' : 'Stock per size & color'}
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      {isAr
                        ? 'حدّد الكمية المتوفرة لكل تركيبة مقاس/لون.'
                        : 'Set quantity available for each size/color combination.'}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse min-w-[280px]">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            {form.sizes.length > 0 && <th className="py-2 pr-3 font-semibold">{isAr ? 'المقاس' : 'Size'}</th>}
                            {form.colors.length > 0 && <th className="py-2 pr-3 font-semibold">{isAr ? 'اللون' : 'Color'}</th>}
                            <th className="py-2 font-semibold">{isAr ? 'المخزون' : 'Stock'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantCombinations.map(({ size, color, key }) => (
                            <tr key={key} className="border-b border-gray-50">
                              {form.sizes.length > 0 && (
                                <td className="py-2 pr-3 text-gray-700">{size || '—'}</td>
                              )}
                              {form.colors.length > 0 && (
                                <td className="py-2 pr-3 text-gray-700">{color || '—'}</td>
                              )}
                              <td className="py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={variantStocks[key] ?? '0'}
                                  onChange={(e) => setVariantStocks((prev) => ({ ...prev, [key]: e.target.value }))}
                                  className="input-field w-24 py-1.5 text-sm"
                                  dir="ltr"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {isAr ? 'إجمالي المخزون:' : 'Total stock:'}{' '}
                      <span className="font-semibold text-gray-700">
                        {variantCombinations.reduce((sum, { key }) => sum + (parseInt(variantStocks[key], 10) || 0), 0)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'صور المنتج' : 'Product Images'}</h3>
              <label
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center cursor-pointer hover:border-primary transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleImageDrop}
              >
                <Upload size={32} className="text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">{isAr ? 'اضغط أو اسحب لإضافة صور' : 'Click or drag to add images'}</p>
                <p className="text-gray-300 text-xs mt-1">{isAr ? 'يمكنك إضافة عدة صور' : 'You can add multiple images'}</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageInputChange}
                />
              </label>
              {hasImages && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">{isAr ? 'الصور المرفقة' : 'Attached images'}</p>
                  <div className="flex gap-3 flex-wrap">
                    {existingImages.map((img) => (
                      <ProductImageThumb
                        key={`existing-${img.id}`}
                        src={resolveMediaUrl(img.url)}
                        alt=""
                        onRemove={() => removeExistingImage(img)}
                        removeLabel={isAr ? 'حذف الصورة' : 'Remove image'}
                      />
                    ))}
                    {newImagePreviews.map(({ file, url }, i) => (
                      <ProductImageThumb
                        key={`new-${file.name}-${file.size}-${file.lastModified}-${i}`}
                        src={url}
                        alt=""
                        onRemove={() => removeNewImage(i)}
                        removeLabel={isAr ? 'إزالة الصورة' : 'Remove image'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'الفئة' : 'Category'}</h3>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })} className="input-field mb-3">
                <option value="">{isAr ? 'اختر الفئة' : 'Select category'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
              {subcategoryOptions.length > 0 && (
                <select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })} className="input-field">
                  <option value="">{isAr ? 'الفئة الفرعية' : 'Subcategory'}</option>
                  {subcategoryOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">{isAr ? 'خصائص المنتج' : 'Product Flags'}</h3>
              <div className="space-y-3">
                {[
                  { field: 'is_active', label: isAr ? 'نشط' : 'Active' },
                  { field: 'is_featured', label: isAr ? 'مميز' : 'Featured' },
                  { field: 'is_new_arrival', label: isAr ? 'وصل حديثاً' : 'New Arrival' },
                  { field: 'is_best_seller', label: isAr ? 'الأكثر مبيعاً' : 'Best Seller' },
                  { field: 'is_on_sale', label: isAr ? 'في التخفيضات' : 'On Sale' },
                  { field: 'is_hero_ticker', label: isAr ? 'شريط الصفحة الرئيسية' : 'Homepage Slider' },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-600">{label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => {
                          const turningOff = field === 'is_hero_ticker' && prev[field];
                          const turningOn = field === 'is_hero_ticker' && !prev[field];
                          return {
                            ...prev,
                            [field]: !prev[field],
                            ...(turningOff ? { hero_ticker_order: '', hero_ticker_image_id: '' } : {}),
                            ...(turningOn && existingImages.length && !prev.hero_ticker_image_id
                              ? { hero_ticker_image_id: String(existingImages[0].id) }
                              : {}),
                          };
                        });
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative ${form[field] ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
              {form.is_hero_ticker && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm text-gray-600 mb-2">
                    {isAr ? 'ترتيب العرض في الشريط' : 'Slider display order'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.hero_ticker_order}
                    onChange={(e) => setForm({ ...form, hero_ticker_order: e.target.value })}
                    placeholder={isAr ? 'تلقائي' : 'Auto'}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {isAr
                      ? `${heroTickerCount} منتج${heroTickerCount === 1 ? '' : 'ات'} في الشريط حالياً. يجب أن يكون المنتج نشطاً وله صورة.`
                      : `${heroTickerCount} product${heroTickerCount === 1 ? '' : 's'} currently in the slider. Product must be active and have an image.`}
                  </p>
                  {!form.is_active && (
                    <p className="text-xs text-amber-600 mt-1">
                      {isAr ? 'هذا المنتج غير نشط ولن يظهر في الشريط حتى تفعّله.' : 'This product is inactive and will not appear in the slider until activated.'}
                    </p>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">
                      {isAr ? 'صورة الشريط' : 'Slider image'}
                    </label>
                    {existingImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {existingImages.map((img) => {
                          const selected = String(form.hero_ticker_image_id) === String(img.id);
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setForm({ ...form, hero_ticker_image_id: String(img.id) })}
                              className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
                                selected ? 'border-primary ring-2 ring-primary/30' : 'border-gray-100 hover:border-gray-300'
                              }`}
                              aria-pressed={selected}
                              aria-label={isAr ? 'اختر صورة الشريط' : 'Select slider image'}
                            >
                              <img
                                src={resolveMediaUrl(img.url)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {selected && (
                                <span className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {isAr
                          ? 'ارفع صور المنتج واحفظها أولاً، ثم اختر صورة الشريط.'
                          : 'Upload and save product images first, then choose the slider image.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base disabled:opacity-50">
              {loading ? '...' : isEdit ? (isAr ? 'تحديث المنتج' : 'Update Product') : isAr ? 'إضافة المنتج' : 'Add Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
