import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const EXCHANGE_CONDITIONS = [
  'Exchange requests must be submitted within 48 hours of delivery.',
  'The item must be unused and in original condition.',
  'Original packaging, tags, accessories, and labels must remain intact.',
  'Any sign of wear, washing, perfume, odor, damage, or alteration will void exchange eligibility.',
  'Exchange approval is subject to inspection by our team.',
  'Customers are responsible for exchange shipping costs unless the error originated from The Boutique Line.',
  'Perfumes, personal-use products, customized products, clearance items, and limited-edition releases are not eligible for exchange.',
  'Stock availability may affect exchange options.',
  'If the requested replacement item is unavailable, store credit may be issued at the sole discretion of The Boutique Line.',
];

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('privacy')} — The Boutique Line</title>
        <meta name="description" content="Privacy Policy and Exchange Policy for The Boutique Line." />
      </Helmet>

      <div className="min-h-screen page-top-margin" style={{ backgroundColor: 'var(--color-bg)' }}>
        <section className="py-16 md:py-24 border-b border-line">
          <div className="container-custom max-w-4xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-mono uppercase text-[10px] tracking-widest mb-4"
              style={{ color: '#eb301e', letterSpacing: '0.2em' }}
            >
              Legal
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif italic font-black text-foreground"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1.05 }}
            >
              {t('privacy')}
            </motion.h1>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container-custom max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2
                className="font-mono font-bold text-foreground uppercase text-xl md:text-2xl tracking-tight mb-6"
                style={{ letterSpacing: '0.08em' }}
              >
                Exchange Policy
              </h2>

              <p
                className="font-mono text-foreground-muted text-xs uppercase leading-relaxed mb-8"
                style={{ letterSpacing: '0.08em' }}
              >
                At The Boutique Line, customer satisfaction is important to us. While we do not offer refunds, eligible products may qualify for exchange under the following conditions:
              </p>

              <ul className="space-y-4 mb-8">
                {EXCHANGE_CONDITIONS.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-foreground-muted text-xs uppercase leading-relaxed pl-5 relative"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    <span
                      className="absolute left-0 top-[0.45em] w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#eb301e' }}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p
                className="font-mono text-foreground uppercase text-xs leading-relaxed border-t border-line pt-8"
                style={{ letterSpacing: '0.08em' }}
              >
                No refunds are offered under any circumstances after successful delivery and acceptance of the order.
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
