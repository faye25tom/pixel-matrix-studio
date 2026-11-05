/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          darkest: '#0A0A0C',
          darker: '#121216',
          dark: '#18181F',
          panel: '#1E1E26',
          border: '#2E2E3A',
          muted: '#8E8E9E',
          accent: '#6366F1',
          accentHover: '#4F46E5',
        }
      }
    },
  },
  plugins: [],
}
