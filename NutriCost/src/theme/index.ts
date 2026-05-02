export const C = {
  bg:         '#0E0D0B',
  surface:    '#1A1815',
  surface2:   '#242018',
  border:     'rgba(255,255,255,0.06)',
  borderMed:  'rgba(255,255,255,0.09)',
  accent:     '#E8A820',
  accentBg:   'rgba(232,168,32,0.12)',
  text:       '#F0EDE6',
  textSub:    '#7A7874',
  textMuted:  '#4A4845',
  protein:    '#58C47A',
  carbs:      '#6AAAE8',
  fat:        '#EE7060',
  breakfast:  '#E8A820',
  lunch:      '#6AAAE8',
  dinner:     '#58C47A',
  snack:      '#EE7060',
  danger:     '#EE7060',
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