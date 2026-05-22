/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#031d44',
          dark: '#04395e',
          accent: '#70a288',
          sand: '#dab785',
          clay: '#d5896f'
        }
      },
      fontFamily: {
        mono: ['"Spline Sans Mono"', 'monospace'],
        sans: ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}