/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#151820',
        panel: '#1a1e26',
        'panel-raised': '#1c212b',
        input: '#12151c',
        border: {
          DEFAULT: '#3a4252',
          soft: '#4a5568',
        },
        text: {
          DEFAULT: '#f0f2f5',
        },
        muted: '#9aa3b2',
        dim: '#6b7382',
        accent: {
          DEFAULT: '#d99e32',
          bright: '#e8b84a',
          soft: 'rgba(217, 158, 50, 0.12)',
        },
        'grey-btn': {
          DEFAULT: '#1e2430',
          hover: '#272e3c',
        },
        danger: '#c45c5c',
        green: {
          DEFAULT: '#4ade80',
          bright: '#6ee7a0',
        },
        surface: {
          DEFAULT: '#151820',
          raised: '#1a1e26',
          overlay: '#1c212b',
          border: '#3a4252',
        },
        event: {
          session: '#e8b84a',
          combat: '#e5534b',
          inventory: '#4ade80',
          vehicle: '#e8b060',
          action: '#79c0ff',
          position: '#9aa3b2',
          zombie: '#ff7b72',
          animal: '#6ee7a0',
          world: '#79c0ff',
          default: '#9aa3b2',
        },
      },
      fontFamily: {
        sans: ['"Google Sans Code"', '"Cascadia Code"', 'Consolas', 'monospace'],
        mono: ['"Google Sans Code"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 4px 24px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        sm: '2px',
      },
      keyframes: {
        'feed-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'feed-in': 'feed-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
