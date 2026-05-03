import { DietTag, MealType } from '../types';

export const DIET_TAG_MAP: Record<string, DietTag> = {
  vegan: 'Vegan',
  high_protein: 'Proteica',
  proteica: 'Proteica',
  keto: 'Keto',
  mediterranean: 'Mediterrânica',
  mediterranica: 'Mediterrânica',
  low_carb: 'Low Carb',
  gluten_free: 'Sem Glúten',
  sem_gluten: 'Sem Glúten',
};

export function normalizeMealType(value?: string | null): MealType {
  const raw = (value ?? '').toLowerCase();
  const v = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v === 'breakfast' || v === 'pequeno-almoco') return 'Pequeno-Almoço';
  if (v === 'lunch' || v === 'almoco') return 'Almoço';
  if (v === 'dinner' || v === 'jantar') return 'Jantar';
  if (v === 'snack') return 'Snack';
  return 'Almoço';
}

export function normalizeDietTags(value?: string | null): DietTag[] {
  if (!value) return [];
  const key = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  const mapped = DIET_TAG_MAP[key];
  return mapped ? [mapped] : [];
}

export function toPricePerKg(price?: number | null, pricePerUnit?: number | null, weight?: number | null) {
  if (pricePerUnit && pricePerUnit > 0) return pricePerUnit;
  if (price && weight && weight > 0) {
    const p = price / weight;
    if (p > 500) return p;
    return p * 1000;
  }
  return null;
}

export function parseQuantityToGrams(value?: string | null): number {
  if (!value) return 100;
  const num = parseFloat(value.replace(',', '.').match(/[0-9.]+/)?.[0] ?? '');
  if (!Number.isFinite(num)) return 100;
  const lower = value.toLowerCase();
  if (lower.includes('kg')) return num * 1000;
  if (lower.includes('g')) return num;
  if (lower.includes('ml')) return num;
  return num;
}

export function resolveStore(name: string) {
  const value = name.toLowerCase();
  if (value.includes('continente')) return 'continente';
  if (value.includes('pingo')) return 'pingo_doce';
  return null;
}

const RECIPE_ID_PREFIX = {
  curated: 'c_',
  user: 'u_',
};

export function toCuratedId(id: number) {
  return `${RECIPE_ID_PREFIX.curated}${id}`;
}

export function toUserId(id: number) {
  return `${RECIPE_ID_PREFIX.user}${id}`;
}

export function parseUserRecipeId(id: string) {
  if (id.startsWith(RECIPE_ID_PREFIX.user)) return Number(id.replace(RECIPE_ID_PREFIX.user, ''));
  return null;
}
