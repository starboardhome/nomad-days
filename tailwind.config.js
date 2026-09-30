/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0F766E', soft: '#CCFBF1', dark: '#5EEAD4' },
        ok: { DEFAULT: '#15803D', soft: '#DCFCE7' },
        warn: { DEFAULT: '#B45309', soft: '#FEF3C7' },
        danger: { DEFAULT: '#B91C1C', soft: '#FEE2E2' },
      },
    },
  },
  plugins: [],
};
