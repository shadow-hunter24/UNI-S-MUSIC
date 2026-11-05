import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7C3AED', light: '#A855F7', dark: '#5B21B6' },
        accent: '#A855F7',
        brand: '#8B2BE2',
        bg: { DEFAULT: '#0A0A0F', surface: '#13131A', elevated: '#1E1E2E' },
        text: { primary: '#FFFFFF', secondary: '#A1A1AA' },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        brand: '0.75rem',
      },
    },
  },
  plugins: [forms],
};

export default config;
