import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Star, Heart, Shield, Check, Truck, Package, Gift, Award, Sparkles,
  Clock, Phone, Mail, MapPin, ShoppingBag, CreditCard, Lock, Zap,
  Smile, ThumbsUp, RefreshCw, Globe, Layers, Tag, Users, Headphones,
  Camera, Scissors, Feather, Coffee, Gem,
} from 'lucide-react';
import { addToCart } from '../../store/slices/cartSlice';
import { formatPrice, resolveMediaUrl, parseJsonStringArray } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ─── Icon map ─────────────────────────────────────────────────────────────────
export const ICONS = {
  Star, Heart, Shield, Check, CheckCircle: Check, Truck, Package, Gift, Award,
  Sparkles, Clock, Phone, Mail, MapPin, ShoppingBag, CreditCard, Lock, Zap,
  Smile, ThumbsUp, RefreshCw, Globe, Layers, Tag, Users, Headphones,
  Camera, Scissors, Feather, Coffee, Gem,
};

export function DynIcon({ name, ...props }) {
  const Ic = ICONS[name] || Star;
  return <Ic {...props} />;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
export function useCountdown(endDate) {
  const calc = () => {
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [endDate]);
  return time;
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
export function HeroSection({ content, language }) {
  const ar = language === 'ar';
  const title = ar ? content.title_ar : (content.title_en || content.title_ar);
  const subtitle = ar ? content.subtitle_ar : (content.subtitle_en || content.subtitle_ar);
  const ctaText = ar ? content.cta_text_ar : (content.cta_text_en || content.cta_text_ar);
  const minH = `${content.min_height || 500}px`;
  const bgUrl = content.bg_image ? resolveMediaUrl(content.bg_image) : '';

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        minHeight: minH,
        backgroundColor: content.bg_color || '#1a1a2e',
        backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        color: content.text_color || '#ffffff',
      }}
    >
      {bgUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${content.overlay_opacity || 0.4})` }} />
      )}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto py-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">{title || (ar ? 'عنوان القسم' : 'Section Title')}</h1>
        {subtitle && <p className="text-lg md:text-xl mb-8 opacity-90">{subtitle}</p>}
        {ctaText && (
          <span className="inline-block px-8 py-4 rounded-2xl font-bold text-lg cursor-pointer"
            style={{ backgroundColor: content.text_color || '#ffffff', color: content.bg_color || '#1a1a2e' }}>
            {ctaText}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCT ──────────────────────────────────────────────────────────────────
export function ProductSection({ content, product, language, previewMode = false }) {
  const ar = language === 'ar';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [mainImg, setMainImg] = useState(0);
  const [qty, setQty] = useState(1);

  const maxStock = Math.max(1, Number(product?.stock) || 1);

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxStock));
  }, [maxStock, product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const sz = parseJsonStringArray(product.sizes);
    const cl = parseJsonStringArray(product.colors);
    if (sz.length) setSelectedSize(sz[0]);
    if (cl.length) setSelectedColor(cl[0]);
  }, [product?.id]);

  const ctaMode = content.cta_mode || 'cart';
  /** Backward-compatible: كان يعتمد على buy_button_* فقط */
  const addLabel = ar
    ? (content.add_button_text_ar || content.buy_button_text_ar || 'أضف إلى السلة')
    : (content.add_button_text_en || content.buy_button_text_en || 'Add to Cart');
  const quickLabel = ar
    ? (content.quick_button_text_ar || 'إتمام الشراء')
    : (content.quick_button_text_en || 'Buy now');

  const showQuantity = content.show_quantity === true;

  if (!product) return (
    <div style={{ backgroundColor: content.bg_color || '#ffffff' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-2xl">
        <div className="text-center text-gray-300">
          <Package size={40} className="mx-auto mb-2" />
          <p className="text-sm">{ar ? 'لم يتم ربط منتج' : 'No product linked'}</p>
        </div>
      </div>
    </div>
  );

  const name = product.name_en || product.name_ar;
  const desc = ar ? product.description_ar : (product.description_en || product.description_ar);
  const sizeList = parseJsonStringArray(product.sizes);
  const colorList = parseJsonStringArray(product.colors);
  const allImages = [product.thumbnail, ...(product.images || []).map(i => i.url)].filter(Boolean);
  const layout = content.layout || 'image-left';

  const runCartAction = async (goCheckout) => {
    if (previewMode) return;
    if (sizeList.length && !selectedSize) {
      toast.error(ar ? 'يرجى اختيار المقاس' : 'Please select a size');
      return;
    }
    try {
      await dispatch(addToCart({
        product_id: product.id,
        quantity: qty,
        size: selectedSize,
        color: selectedColor,
        product,
      })).unwrap();
      toast.success(ar ? 'تمت الإضافة للسلة' : 'Added to cart');
      if (goCheckout) navigate('/checkout');
    } catch {
      toast.error(ar ? 'تعذّرت العملية' : 'Something went wrong');
    }
  };

  const imageBlock = (
    <div>
      <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-square">
        {allImages[mainImg]
          ? <img src={resolveMediaUrl(allImages[mainImg])} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={64} /></div>
        }
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {allImages.map((img, i) => (
            <button key={i} onClick={() => setMainImg(i)}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === mainImg ? 'border-primary' : 'border-gray-100'}`}>
              <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const infoBlock = (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold text-gray-800">{name}</h2>
      {content.show_price !== false && (
        <div className="flex items-center gap-3">
          {product.sale_price
            ? <><span className="text-3xl font-bold text-primary">{formatPrice(product.sale_price)}</span><span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span></>
            : <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
          }
        </div>
      )}
      {product.rating_count > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} size={16} className={i <= Math.round(product.rating_avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}</div>
          <span className="text-sm text-gray-500">({product.rating_count} {ar ? 'تقييم' : 'reviews'})</span>
        </div>
      )}
      {desc && <p className="text-gray-600 leading-relaxed">{desc}</p>}
      {content.show_variants !== false && (
        <>
          {sizeList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{ar ? 'المقاس' : 'Size'}</p>
              <div className="flex flex-wrap gap-2">
                {sizeList.map(size => (
                  <button key={size} onClick={() => !previewMode && setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${selectedSize === size ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-primary'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          {colorList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{ar ? 'اللون' : 'Color'}</p>
              <div className="flex flex-wrap gap-2">
                {colorList.map(color => (
                  <button key={color} onClick={() => !previewMode && setSelectedColor(color)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm transition-colors ${selectedColor === color ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-200 hover:border-primary'}`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {content.show_buy_button !== false && (
        <div className="space-y-4">
          {showQuantity && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">{ar ? 'الكمية' : 'Quantity'}</span>
              <div className="inline-flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  disabled={previewMode || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-12 text-center font-semibold text-gray-800">{qty}</span>
                <button
                  type="button"
                  disabled={previewMode || qty >= maxStock}
                  onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                  className="w-11 h-11 text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          )}
          <div className={`flex flex-col ${ctaMode === 'both' ? 'sm:flex-row' : ''} gap-3`}>
            {(ctaMode === 'cart' || ctaMode === 'both') && (
              <button type="button" onClick={() => runCartAction(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                disabled={previewMode}>
                <ShoppingBag size={22} /> {addLabel}
              </button>
            )}
            {(ctaMode === 'quick' || ctaMode === 'both') && (
              <button type="button" onClick={() => runCartAction(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 ${ctaMode === 'both'
                  ? 'border-2 border-primary text-primary bg-white hover:bg-primary/5'
                  : 'bg-primary text-white hover:bg-primary/90'}`}
                disabled={previewMode}>
                <Zap size={22} /> {quickLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ backgroundColor: content.bg_color || '#ffffff' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {layout === 'centered' ? (
          <div className="max-w-md mx-auto text-center">{imageBlock}<div className="mt-8">{infoBlock}</div></div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center`}
            style={{ direction: layout === 'image-right' ? 'rtl' : 'ltr' }}>
            <div>{imageBlock}</div>
            <div style={{ direction: ar ? 'rtl' : 'ltr' }}>{infoBlock}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────
export function FeaturesSection({ content, language }) {
  const ar = language === 'ar';
  const cols = content.columns || 3;
  const gridClass = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols] || 'grid-cols-3';
  return (
    <div style={{ backgroundColor: content.bg_color || '#f8f9fa', color: content.text_color || '#1a1a1a' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {(content.title_ar || content.title_en) && (
          <h2 className="text-3xl font-bold text-center mb-12">{ar ? content.title_ar : (content.title_en || content.title_ar)}</h2>
        )}
        <div className={`grid ${gridClass} gap-8`}>
          {(content.items || []).map((item, idx) => (
            <div key={idx} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DynIcon name={item.icon || 'Star'} size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{ar ? item.title_ar : (item.title_en || item.title_ar)}</h3>
              <p className="opacity-70 text-sm leading-relaxed">{ar ? item.desc_ar : (item.desc_en || item.desc_ar)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────
export function CountdownSection({ content, language }) {
  const ar = language === 'ar';
  const time = useCountdown(content.end_date);
  const labels = ar ? ['يوم', 'ساعة', 'دقيقة', 'ثانية'] : ['Days', 'Hours', 'Minutes', 'Seconds'];
  return (
    <div style={{ backgroundColor: content.bg_color || '#1a1a2e', color: content.text_color || '#ffffff' }} className="py-16 px-6 text-center">
      <div className="max-w-3xl mx-auto">
        {(content.title_ar || content.title_en) && (
          <h2 className="text-2xl md:text-3xl font-bold mb-10">{ar ? content.title_ar : (content.title_en || content.title_ar)}</h2>
        )}
        <div className="flex justify-center gap-4 md:gap-8">
          {[time.d, time.h, time.m, time.s].map((val, i) => (
            <div key={i} className="text-center">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-3xl md:text-5xl font-bold"
                style={{ backgroundColor: content.accent_color || '#9FBE45', color: content.bg_color || '#1a1a2e' }}>
                {String(val).padStart(2, '0')}
              </div>
              <p className="mt-2 text-sm opacity-80">{labels[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TEXT ─────────────────────────────────────────────────────────────────────
export function TextSection({ content, language }) {
  const ar = language === 'ar';
  const html = ar ? content.html_ar : (content.html_en || content.html_ar);
  const padMap = { small: 'py-8', normal: 'py-16', large: 'py-24' };
  return (
    <div style={{ backgroundColor: content.bg_color || '#ffffff', color: content.text_color || '#1a1a1a' }}
      className={`${padMap[content.padding] || 'py-16'} px-6`}>
      <div className="max-w-3xl mx-auto prose max-w-none"
        style={{ textAlign: content.text_align || 'center', color: content.text_color || '#1a1a1a' }}
        dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:0.3">أضف محتوى نصي...</p>' }}
      />
    </div>
  );
}

// ─── IMAGE ────────────────────────────────────────────────────────────────────
export function ImageSection({ content }) {
  if (!content.src) return (
    <div className="py-8 px-6 bg-white">
      <div className="max-w-5xl mx-auto h-40 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300">
        <div className="text-center"><Package size={32} className="mx-auto mb-2" /><p className="text-sm">أضف رابط صورة</p></div>
      </div>
    </div>
  );
  const img = <img src={resolveMediaUrl(content.src)} alt={content.alt_ar || ''} className={`${content.full_width !== false ? 'w-full' : 'max-w-3xl mx-auto'} rounded-2xl`} />;
  return (
    <div className="py-8 px-6 bg-white">
      <div className={content.full_width !== false ? '' : 'max-w-5xl mx-auto text-center'}>
        {content.link ? <a href={content.link} target="_blank" rel="noreferrer">{img}</a> : img}
        {content.caption_ar && <p className="text-center text-gray-500 text-sm mt-3">{content.caption_ar}</p>}
      </div>
    </div>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
export function TestimonialsSection({ content, language }) {
  const ar = language === 'ar';
  return (
    <div style={{ backgroundColor: content.bg_color || '#f8f9fa', color: content.text_color || '#1a1a1a' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {(content.title_ar || content.title_en) && (
          <h2 className="text-3xl font-bold text-center mb-12">{ar ? content.title_ar : (content.title_en || content.title_ar)}</h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(content.items || []).map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex mb-3">{[1,2,3,4,5].map(i => <Star key={i} size={16} className={i <= (item.rating || 5) ? 'text-primary fill-primary' : 'text-gray-200'} />)}</div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">"{ar ? item.text_ar : (item.text_en || item.text_ar)}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{item.name?.[0]}</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                  <p className="text-gray-400 text-xs">{ar ? 'عميل موثوق' : 'Verified Customer'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
export function StatsSection({ content, language }) {
  const ar = language === 'ar';
  return (
    <div style={{ backgroundColor: content.bg_color || '#1a1a2e', color: content.text_color || '#ffffff' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {(content.items || []).map((item, idx) => (
          <div key={idx} className="text-center">
            <p className="text-4xl md:text-5xl font-bold mb-2" style={{ color: content.accent_color || '#9FBE45' }}>{item.value}</p>
            <p className="opacity-80 text-sm">{ar ? item.label_ar : (item.label_en || item.label_ar)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
export function CTASection({ content, language }) {
  const ar = language === 'ar';
  const title = ar ? content.title_ar : (content.title_en || content.title_ar);
  const subtitle = ar ? content.subtitle_ar : (content.subtitle_en || content.subtitle_ar);
  const btnText = ar ? content.button_text_ar : (content.button_text_en || content.button_text_ar);
  return (
    <div style={{ backgroundColor: content.bg_color || '#9FBE45', color: content.text_color || '#171b12' }} className="py-20 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        {title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>}
        {subtitle && <p className="text-lg mb-8 opacity-80">{subtitle}</p>}
        {btnText && (
          <span className="inline-block px-10 py-4 rounded-2xl font-bold text-lg cursor-pointer"
            style={{ backgroundColor: content.button_color || '#1a1a1a', color: content.button_text_color || '#ffffff' }}>
            {btnText}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── GALLERY ──────────────────────────────────────────────────────────────────
export function GallerySection({ content, language }) {
  const ar = language === 'ar';
  const cols = content.columns || 3;
  const gridClass = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols] || 'grid-cols-3';
  return (
    <div style={{ backgroundColor: content.bg_color || '#ffffff' }} className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {content.title_ar && <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">{ar ? content.title_ar : (content.title_en || content.title_ar)}</h2>}
        {(content.images || []).filter(Boolean).length === 0 ? (
          <div className="h-40 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300">
            <p className="text-sm">أضف صوراً للمعرض</p>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-3`}>
            {(content.images || []).filter(Boolean).map((img, idx) => (
              <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
export const SECTION_RENDERERS = {
  hero: HeroSection, product: ProductSection, features: FeaturesSection,
  countdown: CountdownSection, text: TextSection, image: ImageSection,
  testimonials: TestimonialsSection, stats: StatsSection, cta: CTASection,
  gallery: GallerySection,
};
