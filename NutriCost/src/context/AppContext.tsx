import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealLog, Recipe, UserProfile, MealType } from '../types';
import { supabase } from '../supabase';
import { 
  normalizeMealType, 
  normalizeDietTags,
  toCuratedId,
  toUserId,
  parseUserRecipeId
} from '../utils/normalization';
import { 
  fetchRecipes, 
  fetchCuratedRecipeCost, 
  createRecipe, 
  updateRecipeApi, 
  deleteRecipeApi 
} from '../api/recipes';
import { 
  State, 
  Action, 
  reducer, 
  initialState, 
  DEFAULT_PROFILE 
} from './reducer';

import { 
  getTodayDateString,
  getTodayLogs as filterTodayLogs,
  getWeekLogs as filterWeekLogs,
  getDailyBudget as calculateDailyBudget
} from '../utils/logs';

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchRecipesFromApi = async (): Promise<Recipe[]> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      const data = await fetchRecipes(userId);
      
      const curated = await Promise.all((data.curated || []).map(async (r) => ({
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

      const user = (data.user || []).map((r) => ({
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
      throw err;
    }
  };

  const reloadRecipes = async () => {
    try {
      const recipes = await fetchRecipesFromApi();
      dispatch({ type: 'SET_RECIPES', payload: recipes });
    } catch {
      // Silently fail or handle error
    }
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

    const data = await createRecipe(payload);

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

    await updateRecipeApi(userRecipeId, payload);
    
    dispatch({ type: 'UPDATE_RECIPE', payload: recipe });
  };

  const deleteRecipe = async (recipeId: string) => {
    const userRecipeId = parseUserRecipeId(recipeId);
    if (!userRecipeId) return;

    await deleteRecipeApi(userRecipeId);

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

  const todayDate = getTodayDateString();

  const getTodayLogs = () => filterTodayLogs(state.mealLogs);

  const getWeekLogs = () => filterWeekLogs(state.mealLogs);

  const getDailyBudget = () => calculateDailyBudget(state.profile);

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
