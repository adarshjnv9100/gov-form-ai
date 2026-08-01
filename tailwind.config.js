/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#bae0ff',
          300: '#7cc2ff',
          400: '#389e0d',
          500: '#2563eb',
          600: '#004ac6',
          700: '#003ea8',
          800: '#002f87',
          900: '#001d57',
        },
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
        },
        surface: {
          light: '#faf8ff',
          card: '#ffffff',
          dark: '#0f172a',
          glass: 'rgba(255, 255, 255, 0.75)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.25)',
        'teal-glow': '0 0 20px rgba(20, 184, 166, 0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #004ac6 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
        'civic-blue-gradient': 'linear-gradient(135deg, #2563eb 0%, #004ac6 100%)',
      }
    },
  },
  plugins: [],
};
