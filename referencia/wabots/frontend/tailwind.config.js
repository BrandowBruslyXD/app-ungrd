/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Superficies oscuras por elevación (base azul-carbón, con profundidad).
        ink: {
          950: '#070a11',
          900: '#0a0e17',
          800: '#111726',
          700: '#1a2233',
          600: '#2a3446',
          500: '#3a465c',
        },
        // Verde WhatsApp refinado (identidad de marca).
        brand: { DEFAULT: '#25d366', dark: '#1eae57', light: '#4ade80' },
        // Acento frío para datos/acciones secundarias.
        accent: { DEFAULT: '#818cf8', dark: '#6366f1' },
        cyan: { glow: '#22d3ee' },
        danger: { DEFAULT: '#fb7185', dark: '#f43f5e' },
        warn: { DEFAULT: '#fbbf24' },
        // Informativo (logs, mensajes entrantes/info) — azul frío del sistema.
        info: { DEFAULT: '#38bdf8' },
      },
      boxShadow: {
        // Sombras para tema claro: suaves, azuladas, difusas.
        soft: '0 1px 2px rgba(15,23,42,0.05), 0 10px 30px -14px rgba(15,23,42,0.16)',
        lift: '0 18px 44px -18px rgba(15,23,42,0.24)',
        'glow-brand': '0 0 0 1px rgba(37,211,102,0.3), 0 10px 30px -8px rgba(37,211,102,0.4)',
        'glow-accent': '0 0 0 1px rgba(129,140,248,0.3), 0 10px 30px -8px rgba(129,140,248,0.4)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #25d366 0%, #1eae57 100%)',
        'accent-gradient': 'linear-gradient(135deg, #818cf8 0%, #22d3ee 100%)',
        'app-radial':
          'radial-gradient(50rem 50rem at 12% -10%, rgba(37,211,102,0.07), transparent 55%), radial-gradient(44rem 44rem at 100% 0%, rgba(129,140,248,0.07), transparent 50%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(37,211,102,0.5)' },
          '70%': { boxShadow: '0 0 0 6px rgba(37,211,102,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(37,211,102,0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-sm': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)', opacity: '0.55' },
          '50%': { transform: 'translate(4%,-6%) scale(1.15)', opacity: '0.85' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        float: 'float 6s ease-in-out infinite',
        'float-sm': 'float-sm 5s ease-in-out infinite',
        aurora: 'aurora 16s ease-in-out infinite',
        marquee: 'marquee 26s linear infinite',
      },
    },
  },
  plugins: [],
};
