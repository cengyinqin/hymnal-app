export const colors = {
  primary: '#1a5276',
  primaryLight: '#2980b9',
  accent: '#c0392b',
  background: '#faf8f5',
  surface: '#ffffff',
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  heart: '#e74c3c',
  heartEmpty: '#d1d5db',
  badge: '#fef3c7',
  badgeText: '#92400e',
  chipActive: '#1a5276',
  chipInactive: '#f3f4f6',
  highlight: '#fef08a',
};

export const typography = {
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.primaryLight,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 999,
};

export function fontScaleForSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 0.85;
    case 'large': return 1.2;
    default: return 1.0;
  }
}
