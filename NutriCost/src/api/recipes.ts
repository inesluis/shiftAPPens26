import { API_BASE_URL } from '../config';
import { Recipe } from '../types';
import { CuratedRecipeDTO, UserRecipeDTO, RecipeCostDTO } from '../types/api';

export async function fetchCuratedRecipeCost(recipeId: number): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/costs`);
    if (!response.ok) return 0;

    const costs: RecipeCostDTO[] = await response.json();
    if (!Array.isArray(costs) || costs.length === 0) return 0;

    const best = costs.reduce((currentBest, candidate) => {
      const currentValue = Number(currentBest?.totalCost ?? Number.POSITIVE_INFINITY);
      const candidateValue = Number(candidate?.totalCost ?? Number.POSITIVE_INFINITY);
      return candidateValue < currentValue ? candidate : currentBest;
    }, costs[0]);

    return Number(best?.totalCost ?? 0);
  } catch {
    return 0;
  }
}

export async function fetchRecipes(userId?: string): Promise<{ curated: CuratedRecipeDTO[], user: UserRecipeDTO[] }> {
  const url = `${API_BASE_URL}/recipes${userId ? `?userId=${userId}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch recipes: ${response.status}`);
  return response.json();
}

export async function createRecipe(payload: any): Promise<{ userRecipeId: number }> {
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create recipe');
  return response.json();
}

export async function updateRecipeApi(userRecipeId: number, payload: any): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/recipes/${userRecipeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update recipe');
}

export async function deleteRecipeApi(userRecipeId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/recipes/${userRecipeId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete recipe');
}
