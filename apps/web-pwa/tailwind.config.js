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
      colors: {
        dom: {
          morning: '#F7F4EF',
          pine: '#ECF2EE',
          sunset: '#FCEEE9',
          twilight: '#232730',
          coffee: '#2C2623',
          red: '#E63946',
          orange: '#E07A5F',
          yellow: '#F4A261',
          green: '#2A9D8F',
        },
      },
      borderRadius: {
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

