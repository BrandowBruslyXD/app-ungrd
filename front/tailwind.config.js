/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        ungrd: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#b0c4d8',
          300: '#7a9cbf',
          400: '#4a7aab',
          500: '#1a5c96',
          600: '#003876',
          700: '#002d61',
          800: '#00224a',
          900: '#001836',
          950: '#000f22',
        },
        gold: {
          50: '#fffdf0',
          100: '#fff9d6',
          200: '#fff0a3',
          300: '#ffe670',
          400: '#ffd93d',
          500: '#FFC72C',
          600: '#e6ab00',
          700: '#b38500',
          800: '#806000',
          900: '#4d3a00',
          950: '#332600',
        },
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
    },
  },
  plugins: [],
};
