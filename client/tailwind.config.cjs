/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
        stats: [
          '1rem',
          { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.02em' },
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
