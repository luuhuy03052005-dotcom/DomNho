/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-dom-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        canvas: '#FAF7F1',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F6F2',
        },
        ink: {
          DEFAULT: '#15251F',
          secondary: '#52605A',
        },
        brand: {
          DEFAULT: '#123F35',
          hover: '#0C3028',
          soft: '#E4EDDD',
        },
        rescue: {
          DEFAULT: '#AF421F',
          soft: '#FFF0E5',
        },
        lost: {
          DEFAULT: '#80570D',
          soft: '#FFF3D8',
        },
        accent: '#D8724D',
        border: '#DDE2DC',
        focus: '#176CBA',
        dom: {
          morning: '#FAF7F1',
          pine: '#ECF2EE',
          sunset: '#FCEEE9',
          twilight: '#232730',
          coffee: '#142820',
          red: '#AF421F',
          orange: '#D8724D',
          yellow: '#80570D',
          green: '#0E513B',
        },
      },
      borderRadius: {
        btn: '10px',
        card: '14px',
        '4xl': '32px',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.16)' },
          '45%': { transform: 'scale(0.96)' },
          '65%': { transform: 'scale(1.12)' },
        },
        radarPulse: {
          '0%': { transform: 'scale(0.85)', opacity: '0.75' },
          '70%': { transform: 'scale(2.6)', opacity: '0.12' },
          '100%': { transform: 'scale(3.1)', opacity: '0' },
        },
        shimmerWarm: {
          '0%, 100%': { opacity: '0.82', transform: ' translateY(0px)' },
          '50%': { opacity: '1', transform: 'translateY(-3px)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 1.8s ease-in-out infinite',
        radar: 'radarPulse 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        shimmer: 'shimmerWarm 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

