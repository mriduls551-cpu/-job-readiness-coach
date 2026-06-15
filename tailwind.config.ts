import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Aliased from CSS custom properties in globals.css.
        // Usage: text-brand, bg-accent-ink, border-ink-muted, etc.
        brand: 'var(--brand-ink)',
        'accent-ink': 'var(--accent-ink)',
        'accent-saffron': 'var(--accent-saffron)',
        'accent-blue': 'var(--accent-blue)',
        'accent-lilac': 'var(--accent-lilac)',
        'ink-strong': 'var(--ink-strong)',
        'ink-soft': 'var(--ink-soft)',
        'ink-muted': 'var(--ink-muted)',
        'bg-page': 'var(--bg-page)',
        'bg-warm': 'var(--bg-warm)',
      },
      boxShadow: {
        // Aligned with --shadow-* tokens in globals.css
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        devanagari: ['var(--font-devanagari)'],
      },
      borderRadius: {
        pill: '9999px',
        card: '1.75rem',
        input: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
