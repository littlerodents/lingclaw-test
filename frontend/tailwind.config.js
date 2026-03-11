/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        accent: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
