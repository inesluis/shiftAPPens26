export const C = {
  bg:         '#D4C4B0',
  surface:    '#E8D9CB',
  surface2:   '#F0E5DB',
  border:     'rgba(42,36,32,0.08)',
  borderMed:  'rgba(42,36,32,0.12)',
  accent:     '#C4A574',
  accentBg:   'rgba(196,165,116,0.12)',
  text:       '#2A2420',
  textSub:    '#4A4338',
  textMuted:  '#7A6F65',
  // Macro colors (muted and earthy)
  protein:    '#C97586',
  carbs:      '#9A9A6F',
  fat:        '#9D8BA8',
  // Meal colors (muted pastels)
  breakfast:  '#C4A76B',
  lunch:      '#6BA89E',
  dinner:     '#9B8FB0',
  snack:      '#B88A8A',
  danger:     '#EF4444',
  // Weekly spending colors (Cronometer-inspired, muted)
  spending1:  '#7BA8A6',
  spending2:  '#B4956D',
  spending3:  '#9B8FA8',
  spending4:  '#8FA79B',
} as const;

export const R = { sm: 8, md: 10, lg: 13, xl: 16, full: 9999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const MEAL_COLOR: Record<string, string> = {
  Breakfast: C.breakfast,
  Lunch:     C.lunch,
  Dinner:    C.dinner,
  Snack:     C.snack,
  'Pequeno-Almoço': C.breakfast,
  'Almoço':         C.lunch,
  'Jantar':         C.dinner,
};

// Cronometer-inspired spending colors (used in weekly chart)
export const SPENDING_COLORS: string[] = [
  '#7BA8A6',  // Teal
  '#B4956D',  // Warm tan
  '#9B8FA8',  // Muted mauve
  '#8FA79B',  // Sage green
];