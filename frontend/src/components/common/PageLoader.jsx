import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <motion.circle
              cx="50" cy="50" r="40"
              fill="none" stroke="#053E4A" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="251.2"
              animate={{ strokeDashoffset: [251.2, 0, 251.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="50" cy="50" r="25"
              fill="none" stroke="#F9A703" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="157"
              animate={{ strokeDashoffset: [157, 0, 157] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </svg>
        </div>
        <BrandLogo variant="loader" withLink={false} />
      </motion.div>
    </div>
  );
}
