/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf7ee',
          100: '#f5ebd0',
          200: '#ebd79f',
          300: '#e0c271',
          400: '#d4a853',
          500: '#c19339',
          600: '#a3762e',
          700: '#7f5a26',
          800: '#6a4d25',
          900: '#5a4223',
        },
      },
    },
  },
  plugins: [],
};
