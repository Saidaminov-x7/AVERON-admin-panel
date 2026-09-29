/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Стратегия тёмной темы: добавление класса 'dark' на <html>
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Акцентный primary — динамический через CSS-переменные (AdminThemeInjector)
        primary: {
          DEFAULT: 'var(--color-primary)',
          50:  'color-mix(in srgb, var(--color-primary) 5%, white)',
          100: 'color-mix(in srgb, var(--color-primary) 10%, white)',
          200: 'color-mix(in srgb, var(--color-primary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 40%, white)',
          400: 'color-mix(in srgb, var(--color-primary) 60%, white)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-hover)',
          800: 'color-mix(in srgb, var(--color-primary-hover) 90%, black)',
          900: 'color-mix(in srgb, var(--color-primary-hover) 80%, black)',
          950: 'color-mix(in srgb, var(--color-primary-hover) 70%, black)',
        },
        // Тёмный фон (dark mode)
        dark: {
          bg:      '#0f0f0f',
          surface: '#1a1a1a',
          border:  '#2a2a2a',
          card:    '#1e1e1e',
          sidebar: '#111111',
        },
        // Светлый фон (light mode)
        light: {
          bg:      '#f4f6f9',
          surface: '#ffffff',
          border:  '#e5e7eb',
          card:    '#ffffff',
          sidebar: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Calibri)', 'Calibri', 'system-ui', 'sans-serif'],
        theme: ['var(--font-family, Calibri)', 'Calibri', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        theme: 'var(--radius, var(--border-radius, 0.5rem))',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-dark': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};