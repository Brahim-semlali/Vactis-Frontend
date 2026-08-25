/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vibrant Primary Teal Accent (VACTIS Identity)
        primary: {
          DEFAULT: '#0d9488',
          hover: '#0f766e',
          light: '#ccfbf1',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Modern Status Colors
        statut: {
          actif: '#059669',
          progression: '#0d9488',
          surveillance: '#d97706',
          onboarding: '#0284c7',
          silence: '#e11d48',
          muted: '#64748b',
        },
        // Segment Colors
        segment: {
          a: '#059669',
          b: '#0284c7',
          c: '#d97706',
          d: '#64748b',
        },
        // Modern Canvas Surfaces
        surface: {
          DEFAULT: '#ffffff',
          canvas: '#f4f7f9',
          soft: '#f8fafc',
          dark: '#0b1220',
        },
        border: '#e2e8f0',
        muted: {
          DEFAULT: '#64748b',
          foreground: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        DEFAULT: '0 4px 20px rgba(15, 23, 42, 0.06)',
        soft: '0 4px 24px rgba(15, 23, 42, 0.06)',
        card: '0 8px 30px rgba(15, 23, 42, 0.05)',
        glow: '0 12px 35px rgba(13, 148, 136, 0.15)',
        primary: '0 8px 24px rgba(13, 148, 136, 0.25)',
      },
      keyframes: {
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-in-from-right': 'slide-in-from-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
