/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Teammates' Dashboard Color Tokens
        brand: {
          primary: 'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
          red: 'var(--brand-red)',
          'red-hover': 'var(--brand-red-hover)',
          hover: 'var(--brand-hover)',
          ring: 'var(--brand-ring)',
        },
        surface: {
          page: 'var(--bg-page)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--surface-hover)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          main: 'var(--text-primary)',
        },
        subtle: {
          border: 'var(--border-color)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
        },

        // LearnSpace Warm Three-Color Theme Tokens
        mocha: {
          DEFAULT: '#E8DCC6',
          surface: '#FAF6EE',
          card: '#FFFAF2',
          border: '#D8CBB5',
        },
        cosmic: {
          DEFAULT: '#B7A89A',
          light: '#DDD1C4',
          dark: '#938577',
        },
        burgundy: {
          DEFAULT: '#722F37',
          hover: '#5C242B',
          dark: '#4A1D23',
          light: '#8B3A44',
        },
        brown: {
          soft: '#3A271C',
          muted: '#634A3C',
          cream: '#FFFDF9',
        },
        accent: {
          gold: '#F2C078',
          terracotta: '#E8A08A',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 2px 8px -2px rgba(58, 39, 28, 0.08), 0 1px 3px -1px rgba(58, 39, 28, 0.05)',
        'warm-md': '0 6px 20px -4px rgba(58, 39, 28, 0.12), 0 2px 6px -2px rgba(58, 39, 28, 0.06)',
        'warm-lg': '0 12px 32px -6px rgba(58, 39, 28, 0.16), 0 4px 12px -3px rgba(58, 39, 28, 0.08)',
      }
    },
  },
  plugins: [],
}
