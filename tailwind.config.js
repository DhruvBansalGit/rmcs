// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' }
        },
        'wave': {
          '0%, 100%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(10deg)' }
        },
        'sparkle': {
          '0%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.5) rotate(180deg)' },
          '100%': { opacity: '0', transform: 'scale(0) rotate(360deg)' }
        }
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'wave': 'wave 1s ease-in-out infinite',
        'sparkle': 'sparkle 1s ease-out forwards'
      }
    },
  },
  plugins: [],
}
