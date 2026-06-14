import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SECTION_RENDERERS } from '../components/landing/SectionRenderers';
import api from '../utils/api';
import { Package } from 'lucide-react';

export default function LandingPage() {
  const { slug } = useParams();
  const { language } = useSelector((s) => s.ui);
  const ar = language === 'ar';

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/landing-pages/public/${slug}`)
      .then(({ data }) => {
        setPageData(data.data);
        api.post(`/landing-pages/track-view/${data.data.id}`).catch(() => {});
        sessionStorage.setItem('landing_page_id', data.data.id);
        document.title = data.data.meta_title || data.data.title_ar || 'صفحة هبوط';
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400 text-xl">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div>
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{ar ? 'الصفحة غير موجودة' : 'Page Not Found'}</h1>
        <p className="text-gray-500 mb-6">{ar ? 'هذه الصفحة غير متاحة أو تم حذفها.' : 'This page is unavailable or has been removed.'}</p>
        <Link to="/" className="inline-block bg-primary text-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90">
          {ar ? 'العودة للرئيسية' : 'Back to Home'}
        </Link>
      </div>
    </div>
  );

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen">
      {(pageData?.sections || []).map((section) => {
        const Renderer = SECTION_RENDERERS[section.type];
        if (!Renderer) return null;
        return (
          <Renderer
            key={section.id}
            content={section.content || {}}
            product={pageData.product}
            language={language}
          />
        );
      })}
    </div>
  );
}
