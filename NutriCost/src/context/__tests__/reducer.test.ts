import { reducer, initialState, DEFAULT_PROFILE, State } from '../reducer';
import { Recipe, MealLog } from '../../types';

describe('reducer', () => {
  it('handles HYDRATE action', () => {
    const payload = { recipes: [{ id: '1', name: 'Test' } as Recipe] };
    const newState = reducer(initialState, { type: 'HYDRATE', payload });
    expect(newState.recipes).toHaveLength(1);
    expect(newState.isLoading).toBe(false);
  });

  it('handles SET_PROFILE action', () => {
    const newProfile = { ...DEFAULT_PROFILE, name: 'New Name' };
    const newState = reducer(initialState, { type: 'SET_PROFILE', payload: newProfile });
    expect(newState.profile.name).toBe('New Name');
  });

  it('handles SET_PROFILE_NAME action', () => {
    const newState = reducer(initialState, { type: 'SET_PROFILE_NAME', payload: 'Jane Doe' });
    expect(newState.profile.name).toBe('Jane Doe');
  });

  it('handles SET_RECIPES action', () => {
    const recipes = [{ id: '1', name: 'Recipe 1' } as Recipe];
    const newState = reducer(initialState, { type: 'SET_RECIPES', payload: recipes });
    expect(newState.recipes).toBe(recipes);
  });

  it('handles ADD_RECIPE action', () => {
    const recipe = { id: '1', name: 'New Recipe' } as Recipe;
    const newState = reducer(initialState, { type: 'ADD_RECIPE', payload: recipe });
    expect(newState.recipes).toContain(recipe);
  });

  it('handles UPDATE_RECIPE action', () => {
    const initial: State = { 
      ...initialState, 
      recipes: [{ id: '1', name: 'Old' } as Recipe] 
    };
    const updated = { id: '1', name: 'New' } as Recipe;
    const newState = reducer(initial, { type: 'UPDATE_RECIPE', payload: updated });
    expect(newState.recipes[0].name).toBe('New');
  });

  it('handles DELETE_RECIPE action', () => {
    const initial: State = { 
      ...initialState, 
      recipes: [{ id: '1', name: 'To Delete' } as Recipe] 
    };
    const newState = reducer(initial, { type: 'DELETE_RECIPE', payload: '1' });
    expect(newState.recipes).toHaveLength(0);
  });

  it('handles ADD_MEAL_LOG action', () => {
    const log = { id: 'l1', recipeName: 'Meal' } as MealLog;
    const newState = reducer(initialState, { type: 'ADD_MEAL_LOG', payload: log });
    expect(newState.mealLogs).toContain(log);
  });

  it('handles REMOVE_MEAL_LOG action', () => {
    const initial: State = { 
      ...initialState, 
      mealLogs: [{ id: 'l1', recipeName: 'Meal' } as MealLog] 
    };
    const newState = reducer(initial, { type: 'REMOVE_MEAL_LOG', payload: 'l1' });
    expect(newState.mealLogs).toHaveLength(0);
  });
});
