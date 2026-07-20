/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        caeduc: {
          pink: '#E91E63',
          pinkDark: '#C2185B',
          pinkLight: '#FCE4EC',
          blue: '#1a5276',
          blueDark: '#123650',
          blueLight: '#EAF2F8',
          slate: '#64748b',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(16,24,40,0.05), 0 1px 3px 0 rgba(16,24,40,0.06)',
        card: '0 1px 3px 0 rgba(16,24,40,0.07), 0 4px 12px -2px rgba(16,24,40,0.06)',
      },
      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
};
