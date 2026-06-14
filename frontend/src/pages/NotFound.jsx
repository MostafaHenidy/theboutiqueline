import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

export default function NotFound() {
  const { language } = useSelector((s) => s.ui);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="text-9xl font-black text-primary/10 mb-4">404</div>
        <h1 className="text-3xl font-black text-primary mb-2">{language === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}</h1>
        <p className="text-gray-400 mb-8">{language === 'ar' ? 'عذراً، الصفحة التي تبحث عنها غير موجودة' : 'Sorry, the page you are looking for does not exist'}</p>
        <Link to="/" className="btn-primary px-10 py-4 text-lg">{language === 'ar' ? 'العودة للرئيسية' : 'Go Home'}</Link>
      </motion.div>
    </div>
  );
}
