import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useScroll, useTransform } from 'framer-motion';

/* ── Section divider ── */
function Divider() {
  return <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0' }} />;
}

/* ── Stat block ── */
function Stat({ number, label }) {
  return (
    <div>
      <p className="font-serif italic font-black text-boutique" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1 }}>
        {number}
      </p>
      <p className="font-mono uppercase text-foreground-dim text-[10px] tracking-widest mt-2" style={{ letterSpacing: '0.15em' }}>
        {label}
      </p>
    </div>
  );
}

/* ── Value block ── */
function ValueBlock({ num, title, desc }) {
  return (
    <div className="py-10 px-8 md:px-10" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="font-mono text-[10px] tracking-widest block mb-4" style={{ color: '#eb301e', letterSpacing: '0.2em' }}>{num}</span>
      <h3 className="font-mono font-bold text-foreground uppercase text-xl md:text-2xl tracking-tight mb-3">{title}</h3>
      <p className="font-mono text-foreground-muted text-xs uppercase leading-relaxed" style={{ letterSpacing: '0.08em' }}>{desc}</p>
    </div>
  );
}

export default function About() {
  /* Parallax hero */
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);

  return (
    <>
      <Helmet>
        <title>About — Theboutiqueline</title>
        <meta name="description" content="Learn about The Boutique Line — a curated destination for fashion, footwear, accessories, and fragrances." />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        {/* ════════════════════════════════
            HERO
        ════════════════════════════════ */}
        <div ref={heroRef} className="page-top-margin relative overflow-hidden" style={{ minHeight: '70vh' }}>
          <motion.div
            className="absolute inset-0 scale-110"
            style={{ y: bgY, background: 'linear-gradient(135deg, #1a0a08 0%, #2d1008 50%, #0a0a0a 100%)' }}
          />
          <div className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 container-custom flex flex-col justify-end pb-16 md:pb-24" style={{ minHeight: '70vh' }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-mono uppercase text-cream/80 text-[10px] tracking-widest mb-4"
              style={{ letterSpacing: '0.2em' }}
            >
              Our Story
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif italic font-black text-cream"
              style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', lineHeight: 1 }}
            >
              The<span style={{ color: '#eb301e' }}>boutique</span><br />line
            </motion.h1>
          </div>
        </div>

        <Divider />

        {/* ════════════════════════════════
            MISSION STATEMENT
        ════════════════════════════════ */}
        <section className="py-16 md:py-24">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="max-w-4xl space-y-6"
            >
              <p
                className="font-serif italic text-foreground-muted"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', lineHeight: 1.6 }}
              >
                The Boutique Line is a curated destination for fashion, footwear, accessories, and fragrances.
              </p>

              <p
                className="font-mono text-foreground-muted uppercase text-xs leading-relaxed"
                style={{ letterSpacing: '0.08em' }}
              >
                Inspired by the modern marketplace model, we connect customers with carefully selected products from a wide range of brands and categories in one place. Our focus is simple: authentic product information, transparent listings, and a seamless shopping experience.
              </p>

              <p
                className="font-mono text-foreground-muted uppercase text-xs leading-relaxed"
                style={{ letterSpacing: '0.08em' }}
              >
                Whether you&apos;re looking for everyday essentials, limited pieces, premium fragrances, or the latest fashion trends, The Boutique Line is built to make discovering and shopping easier.
              </p>

              <p
                className="font-mono text-foreground-muted uppercase text-xs leading-relaxed"
                style={{ letterSpacing: '0.08em' }}
              >
                We believe that great style should be accessible, trusted, and constantly evolving.
              </p>

              <div className="pt-2">
                <p
                  className="font-serif italic text-foreground"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', lineHeight: 1.5 }}
                >
                  <em>The Boutique Line</em>
                </p>
                <p
                  className="font-mono text-foreground-muted uppercase text-xs tracking-widest mt-2"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Discover what&apos;s next.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════
            STATS
        ════════════════════════════════ */}
        <section className="py-16 md:py-20" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { number: '10K+',  label: 'Happy Customers' },
                { number: '500+',  label: 'Curated Pieces' },
                { number: '4.9★',  label: 'Average Rating' },
                { number: '48H',   label: 'Delivery Time' },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <Stat {...s} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════
            VALUES
        ════════════════════════════════ */}
        <section className="py-16 md:py-24">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{ border: '1px solid var(--color-border)' }}>
              <div className="py-10 px-8 md:px-10 md:col-span-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="section-heading">
                  <span className="section-heading-serif text-3xl md:text-4xl">our</span>
                  <span className="section-heading-mono text-3xl md:text-4xl">VALUES</span>
                </div>
              </div>
              {[
                { num: '01', title: 'CURATION',    desc: 'Every item earns its place. We source only what meets our standard of design, quality, and relevance.' },
                { num: '02', title: 'AUTHENTICITY',desc: 'No trends chased for the sake of it. We celebrate genuine style that lasts beyond the season.' },
                { num: '03', title: 'COMMUNITY',   desc: 'Our customers are our culture. We listen, we adapt, and we grow together.' },
                { num: '04', title: 'SUSTAINABILITY',desc: 'Thoughtful sourcing. Less waste. We\'re building a better boutique for the long run.' },
              ].map((v, i) => (
                <motion.div
                  key={v.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{ borderRight: i % 2 === 0 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <ValueBlock {...v} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════
            TEAM
        ════════════════════════════════ */}
        <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="max-w-2xl"
            >
              <p className="font-mono uppercase text-[10px] tracking-widest mb-5" style={{ color: '#eb301e', letterSpacing: '0.2em' }}>The Team</p>
              <h2 className="font-serif italic font-bold text-foreground mb-6" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', lineHeight: 1.15 }}>
                Built by people<br />
                who <span style={{ color: '#eb301e' }}>live</span> fashion.
              </h2>
              <p className="font-mono text-foreground-muted text-xs uppercase leading-relaxed mb-8" style={{ letterSpacing: '0.08em' }}>
                Our team is a collective of buyers, stylists, and designers united by one obsession:
                finding pieces that make you look and feel exactly as intended. No compromises.
              </p>
              <Link
                to="/products"
                className="inline-block border border-line text-foreground font-mono uppercase text-[10px] tracking-widest px-8 py-3 transition-all duration-300 hover:bg-boutique hover:border-boutique"
                style={{ letterSpacing: '0.15em' }}
              >
                SHOP THE COLLECTION ↗
              </Link>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════
            CTA
        ════════════════════════════════ */}
        <section className="py-20 md:py-28 text-center" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="font-mono uppercase text-foreground-dim text-[10px] tracking-widest mb-4" style={{ letterSpacing: '0.2em' }}>
                Ready to discover?
              </p>
              <h2
                className="font-serif italic font-black text-foreground mb-8"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)', lineHeight: 1 }}
              >
                Wear the <span style={{ color: '#eb301e' }}>hype.</span>
              </h2>
              <Link
                to="/products"
                className="inline-block border border-line text-foreground font-mono uppercase text-[11px] tracking-widest px-10 py-4 transition-all duration-300 hover:bg-boutique hover:border-boutique"
                style={{ letterSpacing: '0.2em' }}
              >
                SHOP NOW ↗
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
