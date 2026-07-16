/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          25: 'oklch(99.2% 0 0)',
        },
      },
      maxWidth: {
        /** Main app column (nav, content, footer) */
        shell: '56rem',
        /** Slightly under the shell column so dialogs don’t line up edge-to-edge */
        modal: '52rem',
        /** Slightly under `max-w-4xl` for wide picker-style dialogs */
        'modal-wide': '50rem',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
        display: ['Outfit', 'sans-serif'],
      },
      fontSize: {
        'display-lg': [
          '3.9rem',
          { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-md': [
          '2.925rem',
          { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' },
        ],
        'display-sm': [
          '1.95rem',
          { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '500' },
        ],
        'body-lg': ['1.125rem', { lineHeight: '1.5', fontWeight: '400' }],
        body: ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        /** Between `text-sm` and `text-lg`; used for medium body emphasis */
        md: ['1rem', { lineHeight: '1.5' }],
        stats: [
          '1rem',
          { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.02em' },
        ],
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { backgroundColor: 'rgb(209 213 219)' },
          '50%': { backgroundColor: 'rgb(243 244 246)' },
        },
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
