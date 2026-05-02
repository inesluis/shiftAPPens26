export type DietTag = 'Vegan' | 'High Protein' | 'Keto' | 'Mediterranean' | 'Low Carb' | 'Gluten Free';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type Store = 'continente' | 'pingo_doce' | 'lidl';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient {
  id: string;
  name: string;
  brand: string;
  prices: Partial<Record<Store, number>>; // price per kg
  macrosPer100g: Macros;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  brand: string;
  weightG: number;
  selectedStore: Store;
  pricePerKg: number;
  macrosPer100g?: Macros;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  dietTags: DietTag[];
  macros: Macros;
  cost: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  isCustom: boolean;
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  recipeId: string;
  recipeName: string;
  mealType: MealType;
  macros: Macros;
  cost: number;
}

export interface UserProfile {
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: string;
  weeklyBudget: number;
  macroGoals: Macros;
}