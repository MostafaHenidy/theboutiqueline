import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    paragraphs: [
      'By accessing or purchasing from The Boutique Line, the customer agrees to comply with and be bound by these Terms & Conditions.',
    ],
  },
  {
    title: '2. Product Information',
    paragraphs: [
      'We strive to provide accurate product descriptions, images, and specifications. However, slight variations in color, packaging, measurements, or appearance may occur due to photography, lighting, screen settings, manufacturing updates, or supplier changes.',
    ],
  },
  {
    title: '3. Product Categories',
    paragraphs: [
      'The Boutique Line may offer products including but not limited to:',
      'Products may include original, imported, mirror-quality, or premium-grade items depending on the description provided on the product page.',
      'Customers are responsible for reviewing product details before completing a purchase.',
    ],
    list: ['Clothing', 'Footwear', 'Bags', 'Perfumes', 'Accessories', 'Lifestyle Products'],
  },
  {
    title: '4. Pricing',
    paragraphs: [
      'All prices displayed are subject to change without prior notice.',
      'The Boutique Line reserves the right to modify prices, discontinue products, or limit quantities at any time.',
    ],
  },
  {
    title: '5. Order Confirmation',
    paragraphs: [
      'Placing an order does not guarantee acceptance.',
      'The Boutique Line reserves the right to:',
      'Orders may be canceled due to stock availability, pricing errors, suspected fraud, or operational issues.',
    ],
    list: ['Cancel any order.', 'Refuse service.', 'Limit quantities.', 'Request additional verification.'],
  },
  {
    title: '6. Shipping & Delivery',
    paragraphs: [
      'Estimated delivery times are provided for convenience only.',
      'Delays caused by shipping companies, customs, weather conditions, supplier issues, force majeure events, or circumstances beyond our control shall not result in compensation liability.',
      'Customers must provide accurate shipping information.',
    ],
  },
  {
    title: '7. Inspection Upon Delivery',
    paragraphs: [
      'Customers are required to inspect their order immediately upon receipt.',
      'Any issue regarding:',
      'must be reported within 24 hours of delivery with clear photos and videos.',
      'Claims submitted after this period may not be accepted.',
    ],
    list: ['Wrong item', 'Damaged item', 'Missing item'],
  },
  {
    title: '8. No Refund Policy',
    paragraphs: [
      'ALL SALES ARE FINAL.',
      'The Boutique Line does not offer refunds, cash returns, bank reversals, or credit card reimbursements after an order has been delivered.',
      'By completing a purchase, the customer acknowledges and agrees to this policy.',
    ],
    emphasized: true,
  },
  {
    title: '9. Exchange Policy',
    paragraphs: [
      'Exchanges may be accepted only under the following conditions:',
      'Exchange approval remains solely at the discretion of The Boutique Line.',
    ],
    list: [
      'Exchange request submitted within 48 hours of delivery.',
      'Item remains unused.',
      'Original packaging is intact.',
      'Original tags, labels, and accessories are attached.',
      'Item is free from perfume, odors, stains, washing, or damage.',
    ],
  },
  {
    title: '10. Exchange Shipping Fees',
    paragraphs: [
      'The customer bears all shipping costs associated with exchanges unless the error was caused by The Boutique Line.',
    ],
  },
  {
    title: '11. Non-Exchangeable Items',
    paragraphs: ['The following categories cannot be exchanged or returned:'],
    list: [
      'Perfumes',
      'Personal care items',
      'Underwear',
      'Swimwear',
      'Customized products',
      'Clearance items',
      'Limited edition items',
      'Gift cards',
    ],
  },
  {
    title: '12. Authenticity & Product Representation',
    paragraphs: [
      'Where applicable, authenticity status is disclosed in the product description.',
      'Customers acknowledge that product quality categories may differ depending on the listing and agree to review all product details prior to purchase.',
    ],
  },
  {
    title: '13. Fraud Prevention',
    paragraphs: ['The Boutique Line reserves the right to:'],
    list: [
      'Cancel suspicious orders.',
      'Verify customer identity.',
      'Refuse transactions deemed high risk.',
      'Restrict future purchases.',
    ],
  },
  {
    title: '14. Intellectual Property',
    paragraphs: [
      'All content, logos, branding, graphics, text, product presentations, and website materials are the exclusive property of The Boutique Line.',
      'Unauthorized use, copying, reproduction, or distribution is prohibited.',
    ],
  },
  {
    title: '15. Limitation of Liability',
    paragraphs: [
      'The Boutique Line shall not be liable for:',
      'Maximum liability shall not exceed the value of the purchased item.',
    ],
    list: [
      'Indirect damages.',
      'Consequential losses.',
      'Lost profits.',
      'Delayed deliveries.',
      'Third-party shipping issues.',
      'Product misuse.',
    ],
  },
  {
    title: '16. Force Majeure',
    paragraphs: [
      'The Boutique Line shall not be responsible for delays or failure to perform due to events beyond reasonable control including:',
    ],
    list: [
      'Natural disasters',
      'Government actions',
      'Customs delays',
      'Transportation disruptions',
      'Supplier shortages',
      'Technical failures',
    ],
  },
  {
    title: '17. Account Termination',
    paragraphs: ['We reserve the right to suspend or terminate customer accounts for:'],
    list: ['Fraudulent activity', 'Abuse of exchange policies', 'Harassment', 'Violation of these Terms'],
  },
  {
    title: '18. Changes to Terms',
    paragraphs: [
      'The Boutique Line reserves the right to update, modify, or replace these Terms & Conditions at any time without prior notice.',
      'Continued use of the website constitutes acceptance of any revisions.',
    ],
  },
  {
    title: '19. Governing Law',
    paragraphs: [
      'These Terms & Conditions shall be governed by and interpreted in accordance with the laws of the Arab Republic of Egypt.',
      'Any disputes shall be subject to the exclusive jurisdiction of the competent courts of Cairo, Egypt.',
    ],
  },
];

function TermsSection({ section }) {
  const textClass = section.emphasized
    ? 'font-mono text-foreground uppercase text-xs leading-relaxed'
    : 'font-mono text-foreground-muted uppercase text-xs leading-relaxed';

  return (
    <article className="pb-12 border-b border-line last:border-b-0 last:pb-0">
      <h2
        className="font-mono font-bold text-foreground uppercase text-lg md:text-xl tracking-tight mb-5"
        style={{ letterSpacing: '0.08em' }}
      >
        {section.title}
      </h2>

      <div className="space-y-4">
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className={textClass} style={{ letterSpacing: '0.08em' }}>
            {paragraph}
          </p>
        ))}

        {section.list && (
          <ul className="space-y-3">
            {section.list.map((item) => (
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
        )}
      </div>
    </article>
  );
}

export default function Terms() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('terms')} — The Boutique Line</title>
        <meta name="description" content="Terms & Conditions for The Boutique Line." />
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
              {t('terms')}
            </motion.h1>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container-custom max-w-4xl space-y-12">
            {SECTIONS.map((section) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <TermsSection section={section} />
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
