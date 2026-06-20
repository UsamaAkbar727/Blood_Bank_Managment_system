/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
        'card-hover': '0 4px 6px rgba(15,23,42,0.04), 0 20px 40px rgba(15,23,42,0.1)',
        'glow-brand': '0 0 40px rgba(225,29,72,0.15)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.12)',
        'btn-3d': '0 4px 0 #9f1239, 0 8px 16px rgba(225,29,72,0.25)',
        'btn-3d-hover': '0 2px 0 #9f1239, 0 12px 24px rgba(225,29,72,0.35)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'mesh': 'radial-gradient(at 40% 20%, rgba(225,29,72,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(99,102,241,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(225,29,72,0.05) 0px, transparent 50%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      },
    },
  },
  plugins: [],
};
