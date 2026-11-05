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
        neon: '#c026d3',
        bg: {
          DEFAULT: '#0d0121',
          surface: '#1a0533',
          elevated: '#2a0d4a',
        },
        text: { primary: '#FFFFFF', secondary: '#c4b5d4' },
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
      backgroundImage: {
        'gradient-hero': `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,43,226,0.45) 0%, transparent 70%),
                          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(168,85,247,0.2) 0%, transparent 60%),
                          linear-gradient(180deg, #0d0121 0%, #130329 50%, #0d0121 100%)`,
        'gradient-card': 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.05))',
        'gradient-brand': 'linear-gradient(135deg, #c026d3, #a855f7, #7c3aed)',
        'gradient-button': 'linear-gradient(135deg, #7c3aed, #a855f7)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(168, 85, 247, 0.3)',
        'glow-md': '0 0 25px rgba(168, 85, 247, 0.4)',
        'glow-lg': '0 0 40px rgba(124, 58, 237, 0.5)',
        'neon': '0 0 20px rgba(124, 58, 237, 0.5), 0 4px 15px rgba(124, 58, 237, 0.3)',
      },
    },
  },
  plugins: [forms],
};

export default config;
