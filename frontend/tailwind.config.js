/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
