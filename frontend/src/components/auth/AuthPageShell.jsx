import { motion } from 'framer-motion';
import BrandLogo from '../common/BrandLogo';

export default function AuthPageShell({
  children,
  title,
  subtitle,
  backLink,
  headerExtra,
  email,
}) {
  return (
    <div className="page-auth page-top-margin flex items-center justify-center p-4 py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="auth-card">
          {backLink}
          <div className="text-center mb-6">
            <div className="auth-logo-wrap mx-auto">
              <BrandLogo variant="auth" withLink={false} className="!h-11 !max-h-11" />
            </div>
            {headerExtra}
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            {email && <p className="auth-email text-sm mt-1">{email}</p>}
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
