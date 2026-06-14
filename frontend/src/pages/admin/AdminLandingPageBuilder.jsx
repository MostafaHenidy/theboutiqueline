import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, ArrowRight, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  EyeOff, Eye, Settings2, Globe, FileText, Layout, ShoppingBag, List,
  Clock, Type, Image as ImageIcon, MessageSquare, BarChart2, Megaphone,
  Grid3x3, X, Check, ExternalLink, BarChart3, Monitor, Tablet, Smartphone,
  GripVertical, Pencil,
} from 'lucide-react';
import { SECTION_RENDERERS } from '../../components/landing/SectionRenderers';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/helpers';

// ─── Section type config ──────────────────────────────────────────────────────
const SECTION_TYPES = [
  { type: 'hero',         label_ar: 'قسم Hero',       label_en: 'Hero',         icon: Layout,       color: 'blue'   },
  { type: 'product',      label_ar: 'عرض المنتج',     label_en: 'Product',      icon: ShoppingBag,  color: 'amber'  },
  { type: 'features',     label_ar: 'المميزات',        label_en: 'Features',     icon: List,         color: 'green'  },
  { type: 'countdown',    label_ar: 'عداد تنازلي',    label_en: 'Countdown',    icon: Clock,        color: 'red'    },
  { type: 'text',         label_ar: 'نص حر',           label_en: 'Text',         icon: Type,         color: 'gray'   },
  { type: 'image',        label_ar: 'صورة',            label_en: 'Image',        icon: ImageIcon,    color: 'cyan'   },
  { type: 'testimonials', label_ar: 'آراء العملاء',   label_en: 'Testimonials', icon: MessageSquare,color: 'purple' },
  { type: 'stats',        label_ar: 'إحصائيات',       label_en: 'Stats',        icon: BarChart2,    color: 'indigo' },
  { type: 'cta',          label_ar: 'دعوة للعمل',     label_en: 'CTA',          icon: Megaphone,    color: 'pink'   },
  { type: 'gallery',      label_ar: 'معرض صور',       label_en: 'Gallery',      icon: Grid3x3,      color: 'teal'   },
];
const TYPE_MAP = Object.fromEntries(SECTION_TYPES.map(t => [t.type, t]));

const VIEWPORTS = [
  { id: 'desktop', icon: Monitor,    width: '100%',  label: 'Desktop' },
  { id: 'tablet',  icon: Tablet,     width: '768px', label: 'Tablet'  },
  { id: 'mobile',  icon: Smartphone, width: '390px', label: 'Mobile'  },
];

const ICON_OPTIONS = [
  'Star','Heart','Shield','CheckCircle','Truck','Package','Gift','Award',
  'Sparkles','Clock','Phone','Mail','MapPin','ShoppingBag','CreditCard',
  'Lock','Zap','Smile','ThumbsUp','RefreshCw','Globe','Layers','Tag',
  'Users','Headphones','Camera','Scissors','Feather','Coffee','Gem',
];

// ─── Mini form helpers ────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
    {children}
  </div>
);
const TI = ({ value, onChange, placeholder = '' }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
);
const TA = ({ value, onChange, rows = 3, placeholder = '' }) => (
  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
);
const CI = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
      className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
    <TI value={value} onChange={onChange} placeholder="#ffffff" />
  </div>
);
const Toggle = ({ value, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-200'} relative flex-shrink-0`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'end-0.5' : 'start-0.5'}`} />
    </div>
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);
const Sel = ({ value, onChange, options }) => (
  <select value={value || ''} onChange={e => onChange(e.target.value)}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none bg-white">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ─── Section editors ──────────────────────────────────────────────────────────
function HeroEditor({ c, set }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v => set('title_ar', v)} /></Field>
        <Field label="العنوان EN"><TI value={c.title_en} onChange={v => set('title_en', v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="الوصف ع"><TA value={c.subtitle_ar} onChange={v => set('subtitle_ar', v)} rows={2} /></Field>
        <Field label="الوصف EN"><TA value={c.subtitle_en} onChange={v => set('subtitle_en', v)} rows={2} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="نص الزر ع"><TI value={c.cta_text_ar} onChange={v => set('cta_text_ar', v)} /></Field>
        <Field label="نص الزر EN"><TI value={c.cta_text_en} onChange={v => set('cta_text_en', v)} /></Field>
      </div>
      <Field label="رابط الزر"><TI value={c.cta_link} onChange={v => set('cta_link', v)} placeholder="/products/..." /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="لون الخلفية"><CI value={c.bg_color} onChange={v => set('bg_color', v)} /></Field>
        <Field label="لون النص"><CI value={c.text_color} onChange={v => set('text_color', v)} /></Field>
      </div>
      <Field label="صورة الخلفية URL"><TI value={c.bg_image} onChange={v => set('bg_image', v)} placeholder="https://..." /></Field>
      <Field label={`تعتيم الصورة: ${c.overlay_opacity || 0}`}>
        <input type="range" min="0" max="1" step="0.05" value={c.overlay_opacity || 0}
          onChange={e => set('overlay_opacity', parseFloat(e.target.value))} className="w-full" />
      </Field>
      <Field label="الارتفاع الأدنى">
        <Sel value={String(c.min_height||'500')} onChange={v => set('min_height', v)}
          options={[{value:'300',label:'300px'},{value:'400',label:'400px'},{value:'500',label:'500px'},{value:'600',label:'600px'},{value:'700',label:'700px'}]} />
      </Field>
    </div>
  );
}

function ProductEditor({ c, set, product, language }) {
  const ar = language === 'ar';
  return (
    <div className="space-y-3">
      {product
        ? <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-2.5 border border-amber-100">
            {product.thumbnail && <img src={resolveMediaUrl(product.thumbnail)} className="w-10 h-10 rounded-lg object-cover" />}
            <div><p className="font-semibold text-xs text-gray-800">{product.name_ar}</p><p className="text-amber-600 text-xs">المنتج المرتبط</p></div>
          </div>
        : <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-600">لم يتم ربط منتج. اربط منتجاً من إعدادات الصفحة.</div>
      }
      <Field label={ar ? 'سلوك الشراء والأزرار' : 'Checkout / buttons'}>
        <Sel
          value={c.cta_mode || 'cart'}
          onChange={(v) => set('cta_mode', v)}
          options={[
            { value: 'cart', label: ar ? '🛒 إضافة إلى السلة فقط' : '🛒 Add to cart only' },
            { value: 'quick', label: ar ? '⚡ شراء سريع (الانتقال للدفع)' : '⚡ Quick checkout → payment' },
            { value: 'both', label: ar ? '🔗 الزرين معاً' : '🔗 Both buttons' },
          ]}
        />
      </Field>
      <Toggle value={c.show_quantity === true} onChange={(v) => set('show_quantity', v)} label={ar ? 'إظهار تعديل الكمية (‎+ / −‎)' : 'Show quantity (‎+ / −‎)'} />
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
        <Field label={ar ? 'نص «إضافة للسلة» ع' : 'Add-to-cart AR'}>
          <TI value={c.add_button_text_ar} onChange={(v) => set('add_button_text_ar', v)} placeholder={ar ? 'اتركه لاستخدام الافتراضي' : 'optional'} />
        </Field>
        <Field label={ar ? 'نص «إضافة للسلة» EN' : 'Add-to-cart EN'}>
          <TI value={c.add_button_text_en} onChange={(v) => set('add_button_text_en', v)} placeholder="Add to cart" />
        </Field>
      </div>
      {(c.cta_mode === 'quick' || c.cta_mode === 'both') && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={ar ? 'نص الشراء السريع ع' : 'Quick checkout AR'}>
            <TI value={c.quick_button_text_ar} onChange={(v) => set('quick_button_text_ar', v)} placeholder="اشتري الآن" />
          </Field>
          <Field label={ar ? 'نص الشراء السريع EN' : 'Quick checkout EN'}>
            <TI value={c.quick_button_text_en} onChange={(v) => set('quick_button_text_en', v)} placeholder="Buy now" />
          </Field>
        </div>
      )}
      <p className="text-[11px] text-gray-400 leading-relaxed">
        {ar
          ? '«شراء سريع»: يُضيف المنتج بالكمية المختارة ثم يفتح صفحة إتمام الطلب (الزائر لا يحتاج حساباً).'
          : 'Quick checkout: adds the product with chosen quantity then opens checkout (guests can order without an account).'}
      </p>
      <Field label={ar ? 'تخطيط القسم' : 'Section layout'}>
        <Sel value={c.layout || 'image-left'} onChange={(v) => set('layout', v)}
          options={[
            { value: 'image-left', label: ar ? 'صورة اليسار' : 'Image left' },
            { value: 'image-right', label: ar ? 'صورة اليمين' : 'Image right' },
            { value: 'centered', label: ar ? 'متمركز' : 'Centered' },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={ar ? 'نص الزر (احتياطي إن لم يُملأ النص الجديد)' : 'Legacy button AR'}>
          <TI value={c.buy_button_text_ar} onChange={(v) => set('buy_button_text_ar', v)} />
        </Field>
        <Field label={ar ? 'نص احتياطي EN (قديم)' : 'Legacy fallback EN'}>
          <TI value={c.buy_button_text_en} onChange={(v) => set('buy_button_text_en', v)} />
        </Field>
      </div>
      <Field label="لون الخلفية"><CI value={c.bg_color} onChange={v => set('bg_color', v)} /></Field>
      <div className="space-y-2 pt-1">
        <Toggle value={c.show_price!==false} onChange={v => set('show_price', v)} label="إظهار السعر" />
        <Toggle value={c.show_variants!==false} onChange={v => set('show_variants', v)} label="إظهار الأحجام والألوان" />
        <Toggle value={c.show_buy_button!==false} onChange={v => set('show_buy_button', v)} label="إظهار زر الشراء" />
      </div>
    </div>
  );
}

function FeaturesEditor({ c, set }) {
  const setItem = (idx, k, v) => { const it=[...(c.items||[])]; it[idx]={...it[idx],[k]:v}; set('items', it); };
  const add = () => set('items', [...(c.items||[]), {icon:'Star',title_ar:'ميزة',title_en:'Feature',desc_ar:'',desc_en:''}]);
  const rm = idx => set('items', c.items.filter((_,i)=>i!==idx));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v => set('title_ar', v)} /></Field>
        <Field label="العنوان EN"><TI value={c.title_en} onChange={v => set('title_en', v)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="أعمدة"><Sel value={String(c.columns||3)} onChange={v=>set('columns',parseInt(v))} options={[{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'}]} /></Field>
        <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">العناصر</span>
          <button onClick={add} className="text-xs text-primary flex items-center gap-1"><Plus size={11}/> إضافة</button>
        </div>
        {(c.items||[]).map((item,idx)=>(
          <div key={idx} className="border border-gray-100 rounded-xl p-2.5 mb-2 bg-gray-50">
            <div className="flex justify-between mb-2"><span className="text-xs text-gray-500">#{idx+1}</span><button onClick={()=>rm(idx)} className="text-red-400"><X size={12}/></button></div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Field label="أيقونة">
                <select value={item.icon||'Star'} onChange={e=>setItem(idx,'icon',e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  {ICON_OPTIONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                </select>
              </Field>
              <Field label="عنوان ع"><TI value={item.title_ar} onChange={v=>setItem(idx,'title_ar',v)} /></Field>
            </div>
            <Field label="وصف ع"><TA value={item.desc_ar} onChange={v=>setItem(idx,'desc_ar',v)} rows={2}/></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountdownEditor({ c, set }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v=>set('title_ar',v)} /></Field>
        <Field label="العنوان EN"><TI value={c.title_en} onChange={v=>set('title_en',v)} /></Field>
      </div>
      <Field label="تاريخ الانتهاء">
        <input type="datetime-local" value={c.end_date||''} onChange={e=>set('end_date',e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
        <Field label="مميز"><CI value={c.accent_color} onChange={v=>set('accent_color',v)} /></Field>
      </div>
    </div>
  );
}

function TextEditor({ c, set }) {
  return (
    <div className="space-y-3">
      <Field label="المحتوى ع (HTML)"><TA value={c.html_ar} onChange={v=>set('html_ar',v)} rows={6} placeholder="<h2>عنوان</h2><p>نص...</p>"/></Field>
      <Field label="المحتوى EN (HTML)"><TA value={c.html_en} onChange={v=>set('html_en',v)} rows={4} placeholder="<h2>Title</h2><p>Text...</p>"/></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="المحاذاة"><Sel value={c.text_align||'center'} onChange={v=>set('text_align',v)} options={[{value:'right',label:'يمين'},{value:'left',label:'يسار'},{value:'center',label:'وسط'}]} /></Field>
        <Field label="الحجم"><Sel value={c.padding||'normal'} onChange={v=>set('padding',v)} options={[{value:'small',label:'صغير'},{value:'normal',label:'عادي'},{value:'large',label:'كبير'}]} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
      </div>
    </div>
  );
}

function ImageEditor({ c, set }) {
  return (
    <div className="space-y-3">
      <Field label="رابط الصورة"><TI value={c.src} onChange={v=>set('src',v)} placeholder="https://..." /></Field>
      {c.src && <div className="rounded-xl overflow-hidden border border-gray-100 h-32"><img src={resolveMediaUrl(c.src)} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} /></div>}
      <div className="grid grid-cols-2 gap-2">
        <Field label="النص البديل ع"><TI value={c.alt_ar} onChange={v=>set('alt_ar',v)} /></Field>
        <Field label="تعليق ع"><TI value={c.caption_ar} onChange={v=>set('caption_ar',v)} /></Field>
      </div>
      <Field label="رابط عند النقر"><TI value={c.link} onChange={v=>set('link',v)} /></Field>
      <Toggle value={c.full_width!==false} onChange={v=>set('full_width',v)} label="عرض كامل" />
    </div>
  );
}

function TestimonialsEditor({ c, set }) {
  const setItem=(idx,k,v)=>{const it=[...(c.items||[])];it[idx]={...it[idx],[k]:v};set('items',it);};
  const add=()=>set('items',[...(c.items||[]),{name:'عميل',text_ar:'تجربة رائعة!',rating:5}]);
  const rm=idx=>set('items',c.items.filter((_,i)=>i!==idx));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v=>set('title_ar',v)} /></Field>
        <Field label="العنوان EN"><TI value={c.title_en} onChange={v=>set('title_en',v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
      </div>
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">الآراء</span>
          <button onClick={add} className="text-xs text-primary flex items-center gap-1"><Plus size={11}/> إضافة</button>
        </div>
        {(c.items||[]).map((item,idx)=>(
          <div key={idx} className="border border-gray-100 rounded-xl p-2.5 mb-2 bg-gray-50 space-y-2">
            <div className="flex justify-between"><span className="text-xs text-gray-500">#{idx+1}</span><button onClick={()=>rm(idx)} className="text-red-400"><X size={12}/></button></div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="الاسم"><TI value={item.name} onChange={v=>setItem(idx,'name',v)} /></Field>
              <Field label="تقييم">
                <Sel value={String(item.rating||5)} onChange={v=>setItem(idx,'rating',parseInt(v))} options={[5,4,3,2,1].map(n=>({value:String(n),label:'★'.repeat(n)}))} />
              </Field>
            </div>
            <Field label="النص ع"><TA value={item.text_ar} onChange={v=>setItem(idx,'text_ar',v)} rows={2}/></Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsEditor({ c, set }) {
  const setItem=(idx,k,v)=>{const it=[...(c.items||[])];it[idx]={...it[idx],[k]:v};set('items',it);};
  const add=()=>set('items',[...(c.items||[]),{value:'0',label_ar:'عنوان',label_en:'Label'}]);
  const rm=idx=>set('items',c.items.filter((_,i)=>i!==idx));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
        <Field label="مميز"><CI value={c.accent_color} onChange={v=>set('accent_color',v)} /></Field>
      </div>
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">الأرقام</span>
          <button onClick={add} className="text-xs text-primary flex items-center gap-1"><Plus size={11}/> إضافة</button>
        </div>
        {(c.items||[]).map((item,idx)=>(
          <div key={idx} className="flex gap-2 items-center mb-2">
            <TI value={item.value} onChange={v=>setItem(idx,'value',v)} placeholder="+1000" />
            <TI value={item.label_ar} onChange={v=>setItem(idx,'label_ar',v)} placeholder="العنوان" />
            <button onClick={()=>rm(idx)} className="text-red-400 flex-shrink-0"><X size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CTAEditor({ c, set }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v=>set('title_ar',v)} /></Field>
        <Field label="العنوان EN"><TI value={c.title_en} onChange={v=>set('title_en',v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="الوصف ع"><TA value={c.subtitle_ar} onChange={v=>set('subtitle_ar',v)} rows={2}/></Field>
        <Field label="الوصف EN"><TA value={c.subtitle_en} onChange={v=>set('subtitle_en',v)} rows={2}/></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="نص الزر ع"><TI value={c.button_text_ar} onChange={v=>set('button_text_ar',v)} /></Field>
        <Field label="نص الزر EN"><TI value={c.button_text_en} onChange={v=>set('button_text_en',v)} /></Field>
      </div>
      <Field label="رابط الزر"><TI value={c.button_link} onChange={v=>set('button_link',v)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="خلفية القسم"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
        <Field label="نص القسم"><CI value={c.text_color} onChange={v=>set('text_color',v)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="لون الزر"><CI value={c.button_color} onChange={v=>set('button_color',v)} /></Field>
        <Field label="نص الزر"><CI value={c.button_text_color} onChange={v=>set('button_text_color',v)} /></Field>
      </div>
    </div>
  );
}

function GalleryEditor({ c, set }) {
  const setImg=(idx,v)=>{const imgs=[...(c.images||[])];imgs[idx]=v;set('images',imgs);};
  const rm=idx=>set('images',c.images.filter((_,i)=>i!==idx));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع"><TI value={c.title_ar} onChange={v=>set('title_ar',v)} /></Field>
        <Field label="أعمدة"><Sel value={String(c.columns||3)} onChange={v=>set('columns',parseInt(v))} options={[{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'}]} /></Field>
      </div>
      <Field label="خلفية"><CI value={c.bg_color} onChange={v=>set('bg_color',v)} /></Field>
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">الصور</span>
          <button onClick={()=>set('images',[...(c.images||[]),''])} className="text-xs text-primary flex items-center gap-1"><Plus size={11}/> إضافة</button>
        </div>
        {(c.images||[]).map((img,idx)=>(
          <div key={idx} className="flex gap-2 items-center mb-2">
            <TI value={img} onChange={v=>setImg(idx,v)} placeholder="https://..." />
            {img && <img src={resolveMediaUrl(img)} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" onError={e=>e.target.style.display='none'} />}
            <button onClick={()=>rm(idx)} className="text-red-400 flex-shrink-0"><X size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const EDITORS = {
  hero: HeroEditor, product: ProductEditor, features: FeaturesEditor,
  countdown: CountdownEditor, text: TextEditor, image: ImageEditor,
  testimonials: TestimonialsEditor, stats: StatsEditor, cta: CTAEditor,
  gallery: GalleryEditor,
};

// ─── Page settings form ───────────────────────────────────────────────────────
function PageSettingsForm({ page, products, onSave }) {
  const [f, setF] = useState({
    title_ar: page.title_ar||'', title_en: page.title_en||'',
    product_id: page.product_id||'', status: page.status||'draft',
    meta_title: page.meta_title||'', meta_description: page.meta_description||'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({...p, [k]: v}));

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Field label="العنوان ع *"><TI value={f.title_ar} onChange={v=>set('title_ar',v)} /></Field>
        <Field label="العنوان EN"><TI value={f.title_en} onChange={v=>set('title_en',v)} /></Field>
      </div>
      <Field label="المنتج المرتبط">
        <select value={f.product_id||''} onChange={e=>set('product_id',e.target.value||null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">-- بدون منتج --</option>
          {products.map(p=><option key={p.id} value={p.id}>{p.name_ar}</option>)}
        </select>
      </Field>
      <Field label="الحالة">
        <Sel value={f.status} onChange={v=>set('status',v)} options={[{value:'draft',label:'مسودة'},{value:'published',label:'منشور ✓'}]} />
      </Field>
      <Field label="عنوان SEO"><TI value={f.meta_title} onChange={v=>set('meta_title',v)} /></Field>
      <Field label="وصف SEO"><TA value={f.meta_description} onChange={v=>set('meta_description',v)} rows={3} /></Field>
      <button onClick={async()=>{setSaving(true);await onSave(f);setSaving(false);}}
        disabled={saving}
        className="w-full bg-primary text-white rounded-xl py-2.5 font-medium text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        {saving ? <span className="animate-spin">⟳</span> : <Check size={14}/>} حفظ الإعدادات
      </button>
    </div>
  );
}

// ─── Preview section wrapper ──────────────────────────────────────────────────
function PreviewSection({ section, isActive, content, onClick, onMoveUp, onMoveDown, onDelete, onToggleVis, isFirst, isLast, product, language }) {
  const [hovered, setHovered] = useState(false);
  const cfg = TYPE_MAP[section.type];
  const Icon = cfg?.icon || FileText;
  const Renderer = SECTION_RENDERERS[section.type];

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection ring */}
      <div className={`absolute inset-0 pointer-events-none z-20 transition-all ${
        isActive
          ? 'outline outline-2 outline-offset-0 outline-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
          : hovered
          ? 'outline outline-2 outline-offset-0 outline-blue-300 outline-dashed'
          : ''
      }`} />

      {/* Floating toolbar */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 ${
        hovered || isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
      }`}>
        <div className="flex items-center gap-1 bg-blue-600 text-white rounded-full px-3 py-1.5 shadow-xl text-xs whitespace-nowrap">
          <Icon size={12} className="opacity-80" />
          <span className="font-medium mx-1">{cfg?.label_ar}</span>
          <div className="w-px h-3 bg-white/30 mx-0.5" />
          <button onClick={e=>{e.stopPropagation();onClick();}} title="تعديل"
            className={`p-0.5 rounded hover:bg-white/20 ${isActive ? 'bg-white/20' : ''}`}>
            <Pencil size={11}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={isFirst}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30"><ChevronUp size={11}/></button>
          <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={isLast}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30"><ChevronDown size={11}/></button>
          <button onClick={e=>{e.stopPropagation();onToggleVis();}}
            className="p-0.5 rounded hover:bg-white/20" title="إخفاء/إظهار">
            {section.is_visible ? <Eye size={11}/> : <EyeOff size={11}/>}
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete();}}
            className="p-0.5 rounded hover:bg-red-400/80 text-red-200 hover:text-white"><Trash2 size={11}/></button>
        </div>
      </div>

      {/* Click-to-select overlay (only on inactive sections) */}
      {!isActive && (
        <div className="absolute inset-0 z-10 cursor-pointer" onClick={onClick} />
      )}

      {/* Rendered section */}
      <div className={!section.is_visible ? 'opacity-40 pointer-events-none' : ''}>
        {Renderer && <Renderer content={content} product={product} language={language} previewMode={!isActive} />}
      </div>
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
export default function AdminLandingPageBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';

  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // activeId: null | 'settings' | section.id (number)
  const [activeId, setActiveId] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingType, setAddingType] = useState(null);
  const [viewport, setViewport] = useState('desktop');

  useEffect(() => {
    Promise.all([
      api.get(`/landing-pages/${id}`),
      api.get('/products?limit=100'),
    ]).then(([pr, prodR]) => {
      setPage(pr.data.data);
      setSections(pr.data.data.sections || []);
      setProducts(prodR.data.data || []);
    }).catch(() => {
      toast.error('خطأ في تحميل الصفحة');
      navigate('/admin/landing-pages');
    }).finally(() => setLoading(false));
  }, [id]);

  // ── Helpers ──
  const selectSection = (section) => {
    setActiveId(section.id);
    setActiveDraft({ content: { ...(section.content || {}) } });
  };

  const closeEditor = () => {
    setActiveId(null);
    setActiveDraft(null);
  };

  const setDraftField = (key, val) => {
    setActiveDraft(d => ({ ...d, content: { ...d.content, [key]: val } }));
  };

  // ── Section actions ──
  const moveSection = async (idx, dir) => {
    const newS = [...sections];
    const si = idx + dir;
    if (si < 0 || si >= newS.length) return;
    [newS[idx], newS[si]] = [newS[si], newS[idx]];
    newS.forEach((s, i) => { s.sort_order = i + 1; });
    setSections([...newS]);
    try {
      await api.post(`/landing-pages/${id}/sections/reorder`, { sections: newS.map(s => ({ id: s.id, sort_order: s.sort_order })) });
    } catch { toast.error('خطأ في الترتيب'); }
  };

  const toggleVisibility = async (section) => {
    try {
      await api.put(`/landing-pages/sections/${section.id}`, { is_visible: !section.is_visible });
      setSections(ss => ss.map(s => s.id === section.id ? { ...s, is_visible: !s.is_visible } : s));
    } catch { toast.error('خطأ'); }
  };

  const deleteSection = async (section) => {
    if (!confirm(ar ? 'حذف هذا القسم؟' : 'Delete section?')) return;
    try {
      await api.delete(`/landing-pages/sections/${section.id}`);
      setSections(ss => ss.filter(s => s.id !== section.id));
      if (activeId === section.id) closeEditor();
      toast.success('تم الحذف');
    } catch { toast.error('خطأ'); }
  };

  const addSection = async (type) => {
    setAddingType(type);
    try {
      const { data } = await api.post(`/landing-pages/${id}/sections`, { type });
      setSections(ss => [...ss, data.data]);
      selectSection(data.data);
      setShowAddModal(false);
      toast.success('تم إضافة القسم');
    } catch { toast.error('خطأ في الإضافة'); }
    setAddingType(null);
  };

  const saveSection = async () => {
    if (!activeDraft || typeof activeId !== 'number') return;
    setSectionSaving(true);
    try {
      const { data } = await api.put(`/landing-pages/sections/${activeId}`, { content: activeDraft.content });
      setSections(ss => ss.map(s => s.id === activeId ? { ...s, content: data.data.content } : s));
      toast.success('تم الحفظ');
    } catch { toast.error('خطأ في الحفظ'); }
    setSectionSaving(false);
  };

  const savePage = async (form) => {
    try {
      const { data } = await api.put(`/landing-pages/${id}`, form);
      setPage(data.data);
      // If product changed, reload page data to get product details
      if (form.product_id != page?.product_id) {
        const fresh = await api.get(`/landing-pages/${id}`);
        setPage(fresh.data.data);
      }
      toast.success('تم حفظ الإعدادات');
    } catch { toast.error('خطأ'); }
  };

  const activeSection = sections.find(s => s.id === activeId);
  const EditorComp = activeSection ? EDITORS[activeSection.type] : null;
  const editorIsOpen = activeId !== null;
  const vpWidth = VIEWPORTS.find(v => v.id === viewport)?.width || '100%';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl text-primary">⟳</div>
    </div>
  );

  return (
    <div className="flex flex-col -m-6 bg-gray-100" style={{ height: 'calc(100vh - 4rem)' }} dir={ar ? 'rtl' : 'ltr'}>

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-4 flex-shrink-0 gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Link to="/admin/landing-pages" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            {ar ? <ArrowLeft size={16}/> : <ArrowRight size={16}/>}
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <span className="font-semibold text-gray-800 text-sm">{page?.title_ar}</span>
            <span className={`ms-2 text-xs px-2 py-0.5 rounded-full font-medium ${page?.status==='published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {page?.status==='published' ? (ar?'منشور':'Published') : (ar?'مسودة':'Draft')}
            </span>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {VIEWPORTS.map(vp => {
            const Icon = vp.icon;
            return (
              <button key={vp.id} onClick={() => setViewport(vp.id)} title={vp.label}
                className={`p-1.5 rounded-lg transition-colors ${viewport === vp.id ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={15}/>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/admin/landing-pages/${id}/analytics`}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <BarChart3 size={13}/> {ar?'تقارير':'Analytics'}
          </Link>
          {page?.status==='published' && (
            <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ExternalLink size={13}/> {ar?'معاينة':'Preview'}
            </a>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Sections panel ── */}
        <div className="w-56 bg-white border-e border-gray-200 flex flex-col flex-shrink-0">
          {/* Add section */}
          <div className="p-3 border-b border-gray-100">
            <button onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-primary text-white rounded-xl py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus size={15}/> {ar?'إضافة قسم':'Add Section'}
            </button>
          </div>

          {/* Page settings */}
          <button onClick={() => setActiveId(activeId==='settings' ? null : 'settings')}
            className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100 w-full text-start transition-colors hover:bg-gray-50 ${activeId==='settings' ? 'bg-blue-50 text-blue-600 border-e-2 border-e-blue-500' : 'text-gray-600'}`}>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Settings2 size={13} className="text-gray-500"/>
            </div>
            <span className="text-xs font-semibold">{ar?'إعدادات الصفحة':'Page Settings'}</span>
          </button>

          {/* Sections list */}
          <div className="flex-1 overflow-y-auto py-1">
            {sections.length === 0 && (
              <div className="p-4 text-center text-gray-300 text-xs">{ar?'لا توجد أقسام بعد':'No sections yet'}</div>
            )}
            {sections.map((section, idx) => {
              const cfg = TYPE_MAP[section.type];
              const Icon = cfg?.icon || FileText;
              const isAct = activeId === section.id;
              return (
                <div key={section.id}
                  onClick={() => isAct ? closeEditor() : selectSection(section)}
                  className={`group flex items-center gap-2 px-3 py-2 mx-1 my-0.5 rounded-xl cursor-pointer transition-all ${
                    isAct ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  } ${!section.is_visible ? 'opacity-40' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-${cfg?.color||'gray'}-50`}>
                    <Icon size={13} className={`text-${cfg?.color||'gray'}-500`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{cfg?.[`label_${ar?'ar':'en'}`] || section.type}</p>
                    <p className="text-[10px] text-gray-400">#{idx+1}</p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveSection(idx,-1)} disabled={idx===0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronUp size={11}/></button>
                    <button onClick={() => moveSection(idx,1)} disabled={idx===sections.length-1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown size={11}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Live Preview ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 flex flex-col">
          <div className="flex-1 flex justify-center py-6 px-4">
            <div
              className="bg-white shadow-xl transition-all duration-300 min-h-full relative"
              style={{ width: vpWidth, maxWidth: '100%' }}
            >
              {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <Layout size={48} className="text-gray-200 mb-4"/>
                  <p className="text-gray-400 font-medium">{ar?'ابدأ بإضافة أقسام':'Start adding sections'}</p>
                  <p className="text-gray-300 text-sm mt-1">{ar?'اضغط على "إضافة قسم"':'Click "Add Section"'}</p>
                  <button onClick={() => setShowAddModal(true)}
                    className="mt-4 flex items-center gap-1.5 text-primary text-sm font-medium border border-primary px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
                    <Plus size={15}/> {ar?'إضافة قسم':'Add Section'}
                  </button>
                </div>
              ) : (
                sections.map((section, idx) => {
                  const sectionContent = (activeId === section.id && activeDraft)
                    ? activeDraft.content
                    : (section.content || {});
                  return (
                    <PreviewSection
                      key={section.id}
                      section={section}
                      isActive={activeId === section.id}
                      content={sectionContent}
                      onClick={() => activeId === section.id ? closeEditor() : selectSection(section)}
                      onMoveUp={() => moveSection(idx, -1)}
                      onMoveDown={() => moveSection(idx, 1)}
                      onDelete={() => deleteSection(section)}
                      onToggleVis={() => toggleVisibility(section)}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      product={page?.product}
                      language={language}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Editor Panel (slides in) ── */}
        <AnimatePresence>
          {editorIsOpen && (
            <motion.div
              key="editor-panel"
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-80 bg-white border-s border-gray-200 flex flex-col flex-shrink-0 shadow-xl z-10"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                {activeId === 'settings' ? (
                  <div className="flex items-center gap-2">
                    <Settings2 size={15} className="text-primary"/>
                    <span className="font-semibold text-sm text-gray-800">{ar?'إعدادات الصفحة':'Page Settings'}</span>
                  </div>
                ) : activeSection && (
                  <div className="flex items-center gap-2">
                    {(() => { const cfg = TYPE_MAP[activeSection.type]; const Icon = cfg?.icon || FileText; return <><div className={`w-7 h-7 rounded-lg bg-${cfg?.color}-50 flex items-center justify-center`}><Icon size={13} className={`text-${cfg?.color}-500`}/></div><span className="font-semibold text-sm text-gray-800">{cfg?.[`label_${ar?'ar':'en'}`]}</span></>; })()}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {activeId !== 'settings' && (
                    <button onClick={saveSection} disabled={sectionSaving}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {sectionSaving ? <span className="animate-spin">⟳</span> : <Save size={12}/>}
                      {ar?'حفظ':'Save'}
                    </button>
                  )}
                  <button onClick={closeEditor} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={16}/>
                  </button>
                </div>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                {activeId === 'settings' ? (
                  page && <PageSettingsForm page={page} products={products} onSave={savePage} />
                ) : activeSection && EditorComp && activeDraft ? (
                  <div className="p-4">
                    <EditorComp
                      c={activeDraft.content}
                      set={setDraftField}
                      product={page?.product}
                      language={language}
                    />
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Section Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 w-full max-w-xl shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">{ar?'اختر نوع القسم':'Choose Section Type'}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SECTION_TYPES.map(({ type, label_ar, label_en, icon: Icon, color }) => (
                  <button key={type} onClick={() => addSection(type)} disabled={addingType === type}
                    className={`flex flex-col items-center gap-2.5 p-4 border-2 border-gray-100 rounded-2xl transition-all hover:border-primary hover:bg-primary/5 group ${addingType===type ? 'opacity-60' : ''}`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-${color}-50 group-hover:bg-${color}-100 transition-colors`}>
                      {addingType===type ? <span className="animate-spin text-gray-400 text-base">⟳</span> : <Icon size={22} className={`text-${color}-500`}/>}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{ar ? label_ar : label_en}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
