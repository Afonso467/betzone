/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#09090B',
        bg2:      '#111113',
        bg3:      '#18181B',
        bg4:      '#1c1c1f',
        border:   '#27272a',
        border2:  '#3f3f46',
        orange:   '#F59E0B',
        orange2:  '#D97706',
        orange3:  '#92400e',
        success:  '#10b981',
        danger:   '#ef4444',
        info:     '#3b82f6',
        purple:   '#8b5cf6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        card2: '18px',
      },
      boxShadow: {
        glow:   '0 0 20px rgba(245,158,11,0.15)',
        card:   '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
