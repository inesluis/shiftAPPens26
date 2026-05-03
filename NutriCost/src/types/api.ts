export interface CuratedRecipeDTO {
  recipeId: number;
  recipeName: string | null;
  nutritionalValue: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  instructions: string | null;
}

export interface UserRecipeDTO {
  userRecipeId: number;
  recipeName: string | null;
  mealType: string | null;
  dietType: string | null;
  totalEnergyKcal: number | null;
  totalProtein: number | null;
  totalCarbohydrates: number | null;
  totalFats: number | null;
  totalCost: number | null;
  instructions: string | null;
}

export interface RecipeCostDTO {
  totalCost: number;
}

export interface AIRecipeRequest {
  name: string;
  type: string;
  ingredients: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AIRecipeResponse {
  name: string;
  type: string;
  instructions: string | string[] | null;
}
