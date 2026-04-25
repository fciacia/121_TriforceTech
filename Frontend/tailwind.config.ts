import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          accent:  '#16A37A',
          subtle:  '#16A37A18',
          border:  '#16A37A30',
          dark:    '#0D9268',
        },
        red: {
          danger: '#DC2626',
        },
        amber: {
          warn: '#D97706',
        },
        surface: {
          bg:       '#08090E',
          card:     '#0F1117',
          border:   '#1C1E26',
          elevated: '#161820',
        },
        text: {
          primary:   '#EAEAEA',
          secondary: '#71747D',
          muted:     '#3E414D',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in':  'fadeIn 0.3s ease-out',
        'shimmer':  'shimmer 2s linear infinite',
        'blink':    'blink 1s step-end infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
