import { 
  normalizeMealType, 
  normalizeDietTags, 
  parseQuantityToGrams, 
  toPricePerKg,
  resolveStore,
  toCuratedId,
  toUserId,
  parseUserRecipeId
} from '../normalization';

describe('normalizeMealType', () => {
  it('maps "breakfast" to Pequeno-Almoço', () => {
    expect(normalizeMealType('breakfast')).toBe('Pequeno-Almoço');
  });
  it('maps accented "almoço" to Almoço', () => {
    expect(normalizeMealType('almoço')).toBe('Almoço');
  });
  it('falls back to Almoço for unknown values', () => {
    expect(normalizeMealType('brunch')).toBe('Almoço');
  });
});

describe('normalizeDietTags', () => {
  it('maps "vegan" to Vegan', () => {
    expect(normalizeDietTags('vegan')).toEqual(['Vegan']);
  });
  it('maps "high_protein" to Proteica', () => {
    expect(normalizeDietTags('high_protein')).toEqual(['Proteica']);
  });
  it('returns empty array for unknown values', () => {
    expect(normalizeDietTags('paleo')).toEqual([]);
  });
});

describe('parseQuantityToGrams', () => {
  it('converts kg to grams', () => {
    expect(parseQuantityToGrams('1.5kg')).toBe(1500);
  });
  it('returns plain grams', () => {
    expect(parseQuantityToGrams('250g')).toBe(250);
  });
  it('defaults to 100 for null/undefined', () => {
    expect(parseQuantityToGrams(null)).toBe(100);
  });
  it('handles comma as decimal separator', () => {
    expect(parseQuantityToGrams('0,5kg')).toBe(500);
  });
});

describe('toPricePerKg', () => {
  it('prefers pricePerUnit if available', () => {
    expect(toPricePerKg(10, 5, 2)).toBe(5);
  });
  it('calculates price per kg from price and weight (grams)', () => {
    // 2€ for 500g = 4€/kg
    expect(toPricePerKg(2, null, 500)).toBe(4);
  });
  it('handles high price per gram as price per kg', () => {
    // If price/weight > 500, it's assumed to be already per kg?
    // 1000€ for 1g = 1000€/kg (unlikely but logic does this)
    expect(toPricePerKg(1000, null, 1)).toBe(1000);
  });
  it('converts small p to price per kg (assuming weight was grams)', () => {
    // 0.5€ for 100g = 0.005 -> * 1000 = 5€/kg
    expect(toPricePerKg(0.5, null, 100)).toBe(5);
  });
  it('returns null if weight is zero', () => {
    expect(toPricePerKg(10, null, 0)).toBeNull();
  });
});

describe('resolveStore', () => {
  it('identifies Continente', () => {
    expect(resolveStore('Continente Online')).toBe('continente');
  });
  it('identifies Pingo Doce', () => {
    expect(resolveStore('Pingo Doce Super')).toBe('pingo_doce');
  });
  it('returns null for unknown stores', () => {
    expect(resolveStore('Lidl')).toBeNull();
  });
});

describe('ID conversion', () => {
  it('creates curated IDs', () => {
    expect(toCuratedId(123)).toBe('c_123');
  });
  it('creates user IDs', () => {
    expect(toUserId(456)).toBe('u_456');
  });
  it('parses user recipe IDs', () => {
    expect(parseUserRecipeId('u_789')).toBe(789);
  });
  it('returns null for curated IDs when parsing user ID', () => {
    expect(parseUserRecipeId('c_123')).toBeNull();
  });
});
