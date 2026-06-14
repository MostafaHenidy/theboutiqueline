/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        foreground: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
        },
        surface: {
          DEFAULT: 'var(--color-bg)',
          card: 'var(--color-bg-card)',
          elevated: 'var(--color-bg-surface)',
        },
        line: 'var(--color-border)',
        icon: 'var(--color-icon)',
        /* ─── Theboutiqueline brand ─── */
        ink: '#0a0a0a',          // near-black background
        crimson: '#eb301e',      // Rawline hero CTA bar
        cream:   '#F5F0E8',      // editorial headline / CTA text
        boutique: {
          DEFAULT: '#eb301e',    // brand red accent
          50:  '#fef2f1',
          100: '#fde4e1',
          200: '#fbc9c4',
          300: '#f79d94',
          400: '#f0675a',
          500: '#eb301e',
          600: '#d42a1a',
          700: '#eb301e',        // primary accent
          800: '#b82416',
          900: '#991e12',
          950: '#4a0f09',
        },
        red: {
          50:  '#fef2f1',
          100: '#fde4e1',
          200: '#fbc9c4',
          300: '#f79d94',
          400: '#f0675a',
          500: '#eb301e',
          600: '#d42a1a',
          700: '#b82416',
          800: '#991e12',
          900: '#7a180e',
          950: '#420c07',
        },

        /* ─── Keep legacy colours for admin panel ─── */
        sunshine: '#FBCD5D',
        sea: { DEFAULT: '#00A6B2', dark: '#008999' },
        primary: {
          DEFAULT: '#39BABD',
          50: '#ecfbfc', 100: '#d2f4f6', 200: '#a8e8ec', 300: '#71d6dc',
          400: '#39BABD', 500: '#22a2a8', 600: '#1e858f', 700: '#1d6b75',
          800: '#1d5660', 900: '#1b4852', 950: '#0c2f36',
        },
        cta: {
          DEFAULT: '#FC853D',
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#FC853D', 600: '#ea6f2a', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
        accent: {
          DEFAULT: '#00A6B2',
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#00A6B2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63',
        },
        gold: '#FC853D',
        dark: '#0a0a0a',
      },

      fontFamily: {
        cairo:   ['var(--font-cairo)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        serif:   ['var(--font-serif)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        arabic:  ['var(--font-arabic)', 'Cairo', 'Noto Sans Arabic', 'Tahoma', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        english: ['var(--font-cairo)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-sans)', 'Cairo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
      },

      letterSpacing: {
        widest2: '0.2em',
      },

      animation: {
        'fade-in':   'fadeIn 0.5s ease-in-out',
        'slide-up':  'slideUp 0.6s ease-out',
        'slide-down':'slideDown 0.3s ease-out',
        'scale-in':  'scaleIn 0.3s ease-out',
        shimmer:     'shimmer 1.5s infinite linear',
        marquee:     'marquee 30s linear infinite',
      },

      keyframes: {
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:   { '0%': { transform: 'translateY(30px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideDown: { '0%': { transform: 'translateY(-10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        scaleIn:   { '0%': { transform: 'scale(0.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        marquee:   { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },

      boxShadow: {
        luxury:    '0 4px 24px rgba(0,0,0,0.25)',
        'luxury-lg':'0 12px 48px rgba(0,0,0,0.35)',
        boutique:  '0 4px 20px rgba(235,48,30,0.40)',
        gold:      '0 4px 20px rgba(252,133,61,0.35)',
      },
    },
  },
  plugins: [],
};
