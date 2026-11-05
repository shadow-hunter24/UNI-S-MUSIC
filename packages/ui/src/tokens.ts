export const colors = {
  primary: '#7C3AED',
  accent: '#A855F7',
  brandPurple: '#8B2BE2',
  bgDark: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1E1E2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export type ColorToken = keyof typeof colors;
