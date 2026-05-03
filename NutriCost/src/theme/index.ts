export const C = {
  bg:         '#0D0D0D',
  surface:    '#1A1A1A',
  surface2:   '#242424',
  border:     'rgba(255,255,255,0.08)',
  borderMed:  'rgba(255,255,255,0.12)',
  accent:     '#FFB800',
  accentBg:   'rgba(255,184,0,0.14)',
  text:       '#FFFFFF',
  textSub:    '#B0B0B0',
  textMuted:  '#696969',
  protein:    '#22C55E',
  carbs:      '#3B82F6',
  fat:        '#FF4757',
  breakfast:  '#FFB800',
  lunch:      '#3B82F6',
  dinner:     '#22C55E',
  snack:      '#FF4757',
  danger:     '#FF4757',
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