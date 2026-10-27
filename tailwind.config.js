/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'win-accent': 'var(--accent)',
        'win-blue': '#0078D7',
        'win-taskbar': '#101010',
        'win-chrome': 'var(--chrome-bg)',
        'win-text': 'var(--text-primary)',
        'win-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: [
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        'win-2xs': ['10px', '14px'],
        'win-xs': ['11px', '15px'],
        'win-sm': ['12px', '16px'],
        'win-base': ['13px', '18px'],
        'win-md': ['15px', '20px'],
        'win-lg': ['20px', '28px'],
        'win-xl': ['28px', '36px'],
      },
      boxShadow: {
        window: '0 12px 40px rgba(0, 0, 0, 0.36), 0 2px 8px rgba(0, 0, 0, 0.22)',
        'window-active': '0 18px 55px rgba(0, 0, 0, 0.48), 0 2px 10px rgba(0, 0, 0, 0.3)',
        menu: '0 10px 34px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.12)',
      },
      keyframes: {
        'start-menu-in': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'menu-in': {
          from: { transform: 'scale(0.97) translateY(-4px)', opacity: '0' },
          to: { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'tile-flip': {
          '0%, 45%': { transform: 'translateY(0)' },
          '50%, 95%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        'tile-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
      },
      animation: {
        'start-menu-in': 'start-menu-in 180ms cubic-bezier(0.1, 0.9, 0.2, 1) both',
        'menu-in': 'menu-in 110ms ease-out both',
        'fade-in': 'fade-in 160ms ease-out both',
        'tile-pulse': 'tile-pulse 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
