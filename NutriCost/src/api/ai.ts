import { API_BASE_URL } from '../config';
import { AIRecipeRequest, AIRecipeResponse } from '../types/api';

export async function generateRecipeInstructions(request: AIRecipeRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/recipes/AiGenerated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate AI suggestions');
  
  const data: AIRecipeResponse = await response.json();
  return Array.isArray(data.instructions)
    ? data.instructions.join('\n')
    : (data.instructions ?? '');
}
