import { MealLog, Recipe, UserProfile } from '../types';

export interface State {
  profile: UserProfile;
  recipes: Recipe[];
  mealLogs: MealLog[];
  isLoading: boolean;
}

export type Action =
  | { type: 'HYDRATE'; payload: Partial<Omit<State, 'isLoading'>> }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'SET_PROFILE_NAME'; payload: string }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'ADD_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_RECIPE'; payload: Recipe }
  | { type: 'DELETE_RECIPE'; payload: string }
  | { type: 'ADD_MEAL_LOG'; payload: MealLog }
  | { type: 'REMOVE_MEAL_LOG'; payload: string };

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Utilizador',
  age: 25,
  weightKg: 70,
  heightCm: 170,
  goal: 'Manutenção',
  weeklyBudget: 50,
  macroGoals: { calories: 2000, protein: 120, carbs: 200, fat: 60 },
};

export const initialState: State = {
  profile: DEFAULT_PROFILE,
  recipes: [],
  mealLogs: [],
  isLoading: true,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_PROFILE_NAME':
      return { ...state, profile: { ...state.profile, name: action.payload } };
    case 'SET_RECIPES':
      return { ...state, recipes: action.payload };
    case 'ADD_RECIPE':
      return { ...state, recipes: [...state.recipes, action.payload] };
    case 'UPDATE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.map(r => r.id === action.payload.id ? action.payload : r),
      };
    case 'DELETE_RECIPE':
      return { ...state, recipes: state.recipes.filter(r => r.id !== action.payload) };
    case 'ADD_MEAL_LOG':
      return { ...state, mealLogs: [...state.mealLogs, action.payload] };
    case 'REMOVE_MEAL_LOG':
      return { ...state, mealLogs: state.mealLogs.filter(l => l.id !== action.payload) };
    default:
      return state;
  }
}
