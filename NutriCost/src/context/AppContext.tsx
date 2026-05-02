import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DietTag, MealLog, MealType, Recipe, UserProfile } from '../types';
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
  goal: 'Muscle Gain',
  weeklyBudget: 70,
  macroGoals: { calories: 2200, protein: 160, carbs: 220, fat: 65 },
};

const initialState: State = {
  profile: DEFAULT_PROFILE,
  recipes: [],
  mealLogs: [],
  isLoading: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
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
  high_protein: 'High Protein',
  keto: 'Keto',
  mediterranean: 'Mediterranean',
  low_carb: 'Low Carb',
  gluten_free: 'Gluten Free',
};

function normalizeMealType(value?: string | null): MealType {
  const v = (value ?? '').toLowerCase();
  if (v === 'breakfast') return 'Breakfast';
  if (v === 'lunch') return 'Lunch';
  if (v === 'dinner') return 'Dinner';
  if (v === 'snack') return 'Snack';
  return 'Lunch';
}

function normalizeDietTags(value?: string | null): DietTag[] {
  if (!value) return [];
  const key = value.toLowerCase().replace(/\s+/g, '_');
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchSupabaseRecipes = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const curatedPromise = supabase
      .from('dim_recipe')
      .select('recipe_id, recipe_name, nutritional_value, protein, carbs, fat, instructions');

    const userPromise = authData.user
      ? supabase
          .from('fact_user_recipe')
          .select('user_recipe_id, recipe_name, instructions, total_energy_kcal, total_protein, total_carbohydrates, total_fats, total_cost, meal_type, diet_type')
          .eq('user_id', authData.user.id)
      : Promise.resolve({ data: [], error: null });

    const [curatedRes, userRes] = await Promise.all([curatedPromise, userPromise]);
    if (curatedRes.error) throw curatedRes.error;
    if (userRes.error) throw userRes.error;

    const curated = (curatedRes.data ?? []).map(r => ({
      id: toCuratedId(r.recipe_id),
      name: r.recipe_name ?? 'Recipe',
      mealType: 'Lunch' as MealType,
      dietTags: [],
      macros: {
        calories: Math.round(r.nutritional_value ?? 0),
        protein: Math.round(r.protein ?? 0),
        carbs: Math.round(r.carbs ?? 0),
        fat: Math.round(r.fat ?? 0),
      },
      cost: 0,
      ingredients: [],
      instructions: r.instructions ?? undefined,
      isCustom: false,
    }));

    const user = (userRes.data ?? []).map(r => ({
      id: toUserId(r.user_recipe_id),
      name: r.recipe_name ?? 'Recipe',
      mealType: normalizeMealType(r.meal_type),
      dietTags: normalizeDietTags(r.diet_type),
      macros: {
        calories: Math.round(r.total_energy_kcal ?? 0),
        protein: Math.round(r.total_protein ?? 0),
        carbs: Math.round(r.total_carbohydrates ?? 0),
        fat: Math.round(r.total_fats ?? 0),
      },
      cost: parseFloat((r.total_cost ?? 0).toFixed(2)),
      ingredients: [],
      instructions: r.instructions ?? undefined,
      isCustom: true,
    }));

    return [...curated, ...user];
  };

  const reloadRecipes = async () => {
    const recipes = await fetchSupabaseRecipes();
    dispatch({ type: 'HYDRATE', payload: { recipes } });
  };

  const addRecipe = async (recipe: Recipe) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error('No authenticated user found.');

    const insertPayload = {
      user_id: authData.user.id,
      recipe_name: recipe.name,
      instructions: recipe.instructions ?? null,
      total_energy_kcal: recipe.macros.calories,
      total_protein: recipe.macros.protein,
      total_carbohydrates: recipe.macros.carbs,
      total_fats: recipe.macros.fat,
      total_cost: recipe.cost,
      meal_type: recipe.mealType.toLowerCase(),
      diet_type: recipe.dietTags[0]?.toLowerCase() ?? null,
    };

    const { data, error } = await supabase
      .from('fact_user_recipe')
      .insert(insertPayload)
      .select('user_recipe_id, recipe_name, instructions, total_energy_kcal, total_protein, total_carbohydrates, total_fats, total_cost, meal_type, diet_type')
      .single();

    if (error) throw error;

    const saved: Recipe = {
      id: toUserId(data.user_recipe_id),
      name: data.recipe_name ?? recipe.name,
      mealType: normalizeMealType(data.meal_type),
      dietTags: normalizeDietTags(data.diet_type),
      macros: {
        calories: Math.round(data.total_energy_kcal ?? recipe.macros.calories),
        protein: Math.round(data.total_protein ?? recipe.macros.protein),
        carbs: Math.round(data.total_carbohydrates ?? recipe.macros.carbs),
        fat: Math.round(data.total_fats ?? recipe.macros.fat),
      },
      cost: parseFloat((data.total_cost ?? recipe.cost).toFixed(2)),
      ingredients: recipe.ingredients,
      instructions: data.instructions ?? recipe.instructions,
      isCustom: true,
    };

    dispatch({ type: 'ADD_RECIPE', payload: saved });
    return saved;
  };

  const updateRecipe = async (recipe: Recipe) => {
    if (!recipe.isCustom) {
      return;
    }

    const userRecipeId = parseUserRecipeId(recipe.id);
    if (!userRecipeId) return;

    const updatePayload = {
      recipe_name: recipe.name,
      instructions: recipe.instructions ?? null,
      total_energy_kcal: recipe.macros.calories,
      total_protein: recipe.macros.protein,
      total_carbohydrates: recipe.macros.carbs,
      total_fats: recipe.macros.fat,
      total_cost: recipe.cost,
      meal_type: recipe.mealType.toLowerCase(),
      diet_type: recipe.dietTags[0]?.toLowerCase() ?? null,
    };

    const { error } = await supabase
      .from('fact_user_recipe')
      .update(updatePayload)
      .eq('user_recipe_id', userRecipeId);

    if (error) throw error;
    dispatch({ type: 'UPDATE_RECIPE', payload: recipe });
  };

  const deleteRecipe = async (recipeId: string) => {
    const userRecipeId = parseUserRecipeId(recipeId);
    if (!userRecipeId) return;

    const { error } = await supabase
      .from('fact_user_recipe')
      .delete()
      .eq('user_recipe_id', userRecipeId);

    if (error) throw error;
    dispatch({ type: 'DELETE_RECIPE', payload: recipeId });
  };

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? (JSON.parse(raw) as Partial<Omit<State, 'isLoading'>>) : {};
        const recipes = await fetchSupabaseRecipes();
        if (!isMounted) return;
        dispatch({
          type: 'HYDRATE',
          payload: { ...saved, recipes },
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