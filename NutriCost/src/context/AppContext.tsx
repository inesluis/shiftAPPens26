import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DietTag, MealLog, MealType, Recipe, Store, UserProfile } from '../types';
import { supabase } from '../supabase';

interface State {
  profile: UserProfile;
  recipes: Recipe[];
  mealLogs: MealLog[];
  isLoading: boolean;
}

type Action =
  | { type: 'HYDRATE'; payload: Partial<Omit<State, 'isLoading'>> }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'SET_PROFILE_NAME'; payload: string }
  | { type: 'ADD_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_RECIPE'; payload: Recipe }
  | { type: 'DELETE_RECIPE'; payload: string }
  | { type: 'ADD_MEAL_LOG'; payload: MealLog }
  | { type: 'REMOVE_MEAL_LOG'; payload: string };

const DEFAULT_PROFILE: UserProfile = {
  name: 'João',
  age: 27,
  weightKg: 78,
  heightCm: 182,
  goal: 'Aumento Muscular',
  weeklyBudget: 70,
  macroGoals: { calories: 2200, protein: 160, carbs: 220, fat: 65 },
};

const initialState: State = {
  profile: DEFAULT_PROFILE,
  recipes: [],
  mealLogs: [],
  isLoading: true,
};

type AuthUserLike = {
  user_metadata?: {
    name?: string | null;
    full_name?: string | null;
  } | null;
  email?: string | null;
} | null | undefined;

function getAuthDisplayName(user: AuthUserLike) {
  const rawName = user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email ?? '';
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  return name || DEFAULT_PROFILE.name;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_PROFILE_NAME':
      return { ...state, profile: { ...state.profile, name: action.payload } };
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

interface ContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  getTodayLogs: () => MealLog[];
  getWeekLogs: () => MealLog[];
  getDailyBudget: () => number;
  todayDate: string;
  addRecipe: (recipe: Recipe) => Promise<Recipe | null>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  reloadRecipes: () => Promise<void>;
}

const AppContext = createContext<ContextValue | undefined>(undefined);
const STORAGE_KEY = '@nutricost_v1';
const RECIPE_ID_PREFIX = {
  curated: 'c_',
  user: 'u_',
};

const DIET_TAG_MAP: Record<string, DietTag> = {
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

function normalizeMealType(value?: string | null): MealType {
  const raw = (value ?? '').toLowerCase();
  const v = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v === 'breakfast' || v === 'pequeno-almoco') return 'Pequeno-Almoço';
  if (v === 'lunch' || v === 'almoco') return 'Almoço';
  if (v === 'dinner' || v === 'jantar') return 'Jantar';
  if (v === 'snack') return 'Snack';
  return 'Almoço';
}

function normalizeDietTags(value?: string | null): DietTag[] {
  if (!value) return [];
  const key = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  const mapped = DIET_TAG_MAP[key];
  return mapped ? [mapped] : [];
}

function toCuratedId(id: number) {
  return `${RECIPE_ID_PREFIX.curated}${id}`;
}

function toUserId(id: number) {
  return `${RECIPE_ID_PREFIX.user}${id}`;
}

function parseUserRecipeId(id: string) {
  if (id.startsWith(RECIPE_ID_PREFIX.user)) return Number(id.replace(RECIPE_ID_PREFIX.user, ''));
  return null;
}

function resolveStore(name: string) {
  const value = name.toLowerCase();
  if (value.includes('continente')) return 'continente';
  if (value.includes('pingo')) return 'pingo_doce';
  return null;
}

function toPricePerKg(price?: number | null, pricePerUnit?: number | null, weight?: number | null) {
  if (pricePerUnit && pricePerUnit > 0) return pricePerUnit;
  if (price && weight && weight > 0) return (price / weight) * 1000;
  return null;
}

function parseQuantityToGrams(value?: string | null): number {
  if (!value) return 100;
  const num = parseFloat(value.replace(',', '.').match(/[0-9.]+/)?.[0] ?? '');
  if (!Number.isFinite(num)) return 100;
  const lower = value.toLowerCase();
  if (lower.includes('kg')) return num * 1000;
  if (lower.includes('g')) return num;
  if (lower.includes('ml')) return num;
  return num;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const API_BASE_URL = 'http://192.168.20.79:8080/jakartApp/api';

  const fetchCuratedRecipeCost = async (recipeId: number): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/costs`);
      if (!response.ok) return 0;

      const costs = await response.json();
      if (!Array.isArray(costs) || costs.length === 0) return 0;

      const best = costs.reduce((currentBest: any, candidate: any) => {
        const currentValue = Number(currentBest?.totalCost ?? Number.POSITIVE_INFINITY);
        const candidateValue = Number(candidate?.totalCost ?? Number.POSITIVE_INFINITY);
        return candidateValue < currentValue ? candidate : currentBest;
      }, costs[0]);

      return Number(best?.totalCost ?? 0);
    } catch {
      return 0;
    }
  };

  const fetchRecipesFromApi = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      const url = `${API_BASE_URL}/recipes${userId ? `?userId=${userId}` : ''}`;
      console.log('Fetching recipes from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch recipes: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Data received:', JSON.stringify(data).substring(0, 200) + '...');

      if (!data || (typeof data !== 'object')) {
        console.error('Invalid data format received:', data);
        return [];
      }
      
      const curated = await Promise.all((data.curated || []).map(async (r: any) => ({
        id: toCuratedId(r.recipeId),
        name: r.recipeName ?? 'Recipe',
        mealType: 'Almoço' as MealType,
        dietTags: [],
        macros: {
          calories: Math.round(r.nutritionalValue ?? 0),
          protein: Math.round(r.protein ?? 0),
          carbs: Math.round(r.carbs ?? 0),
          fat: Math.round(r.fat ?? 0),
        },
        cost: await fetchCuratedRecipeCost(r.recipeId),
        ingredients: [],
        instructions: r.instructions ?? undefined,
        isCustom: false,
      })));

      const user = (data.user || []).map((r: any) => ({
        id: toUserId(r.userRecipeId),
        name: r.recipeName ?? 'Recipe',
        mealType: normalizeMealType(r.mealType),
        dietTags: normalizeDietTags(r.dietType),
        macros: {
          calories: Math.round(r.totalEnergyKcal ?? 0),
          protein: Math.round(r.totalProtein ?? 0),
          carbs: Math.round(r.totalCarbohydrates ?? 0),
          fat: Math.round(r.totalFats ?? 0),
        },
        cost: parseFloat((r.totalCost ?? 0).toFixed(2)),
        ingredients: [],
        instructions: r.instructions ?? undefined,
        isCustom: true,
      }));

      return [...curated, ...user];
    } catch (err) {
      console.error('fetchRecipesFromApi caught error:', err);
      throw err;
    }
  };

  const reloadRecipes = async () => {
    const recipes = await fetchRecipesFromApi();
    dispatch({ type: 'HYDRATE', payload: { recipes } });
  };

  const addRecipe = async (recipe: Recipe) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error('No authenticated user found.');

    const payload = {
      userId: authData.user.id,
      recipeName: recipe.name,
      instructions: recipe.instructions ?? null,
      totalEnergyKcal: recipe.macros.calories,
      totalProtein: recipe.macros.protein,
      totalCarbohydrates: recipe.macros.carbs,
      totalFats: recipe.macros.fat,
      totalCost: recipe.cost,
      mealType: recipe.mealType.toLowerCase(),
      dietType: recipe.dietTags[0]?.toLowerCase() ?? null,
    };

    const response = await fetch(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Failed to add recipe');
    const data = await response.json();

    const saved: Recipe = {
      ...recipe,
      id: toUserId(data.userRecipeId),
      isCustom: true,
    };

    dispatch({ type: 'ADD_RECIPE', payload: saved });
    return saved;
  };

  const updateRecipe = async (recipe: Recipe) => {
    if (!recipe.isCustom) return;
    const userRecipeId = parseUserRecipeId(recipe.id);
    if (!userRecipeId) return;

    const payload = {
      recipeName: recipe.name,
      instructions: recipe.instructions ?? null,
      totalEnergyKcal: recipe.macros.calories,
      totalProtein: recipe.macros.protein,
      totalCarbohydrates: recipe.macros.carbs,
      totalFats: recipe.macros.fat,
      totalCost: recipe.cost,
      mealType: recipe.mealType.toLowerCase(),
      dietType: recipe.dietTags[0]?.toLowerCase() ?? null,
    };

    const response = await fetch(`${API_BASE_URL}/recipes/${userRecipeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Failed to update recipe');
    
    dispatch({ type: 'UPDATE_RECIPE', payload: recipe });
  };

  const deleteRecipe = async (recipeId: string) => {
    const userRecipeId = parseUserRecipeId(recipeId);
    if (!userRecipeId) return;

    const response = await fetch(`${API_BASE_URL}/recipes/${userRecipeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete recipe');

    dispatch({ type: 'DELETE_RECIPE', payload: recipeId });
  };

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? (JSON.parse(raw) as Partial<Omit<State, 'isLoading'>>) : {};
        const { data: authData } = await supabase.auth.getUser();
        const recipes = await fetchRecipesFromApi();
        if (!isMounted) return;

        const profile = saved.profile ?? DEFAULT_PROFILE;
        dispatch({
          type: 'HYDRATE',
          payload: {
            ...saved,
            profile: { ...profile, name: getAuthDisplayName(authData.user ?? null) },
            recipes,
          },
        });
      } catch {
        if (!isMounted) return;
        dispatch({ type: 'HYDRATE', payload: {} });
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_PROFILE_NAME', payload: getAuthDisplayName(session?.user ?? null) });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      const { isLoading, recipes, ...toSave } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state]);

  const todayDate = new Date().toISOString().split('T')[0];

  const getTodayLogs = () => state.mealLogs.filter(l => l.date === todayDate);

  const getWeekLogs = () => {
    const logs: MealLog[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      logs.push(...state.mealLogs.filter(l => l.date === ds));
    }
    return logs;
  };

  const getDailyBudget = () => parseFloat((state.profile.weeklyBudget / 7).toFixed(2));

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        getTodayLogs,
        getWeekLogs,
        getDailyBudget,
        todayDate,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        reloadRecipes,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}