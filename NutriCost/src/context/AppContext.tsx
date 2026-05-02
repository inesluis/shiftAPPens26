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

  const computeCuratedRecipeCosts = async (recipeIds: number[]) => {
    if (!recipeIds.length) return new Map<number, number>();

    const { data: recipeIngredients, error: recipeIngError } = await supabase
      .from('fact_recipeingredient')
      .select('recipe_id, ingredient_id, ingredient_quantity')
      .in('recipe_id', recipeIds);

    if (recipeIngError || !recipeIngredients?.length) return new Map<number, number>();

    const ingredientIds = Array.from(new Set(recipeIngredients.map(r => r.ingredient_id)));
    const { data: priceRows, error: priceError } = await supabase
      .from('fact_productprice')
      .select('ingredient_id, price, price_per_unit, product:dim_product(weight), supermarket:dim_supermarket(supermarket_name)')
      .in('ingredient_id', ingredientIds);

    if (priceError || !priceRows) return new Map<number, number>();

    const bestPriceByIngredientStore = new Map<string, number>();

    (priceRows as Array<{ ingredient_id: number; price: number | null; price_per_unit: number | null; product: { weight: number | null } | { weight: number | null }[] | null; supermarket: { supermarket_name: string | null } | { supermarket_name: string | null }[] | null; }>).forEach(row => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      const supermarket = Array.isArray(row.supermarket) ? row.supermarket[0] : row.supermarket;
      if (!product || !supermarket) return;

      const store = resolveStore(supermarket.supermarket_name ?? '');
      if (!store) return;

      const pricePerKg = toPricePerKg(row.price, row.price_per_unit, product.weight);
      if (pricePerKg == null) return;

      const key = `${row.ingredient_id}:${store}`;
      const existing = bestPriceByIngredientStore.get(key);
      if (existing == null || pricePerKg < existing) {
        bestPriceByIngredientStore.set(key, pricePerKg);
      }
    });

    const totalsByRecipe = new Map<number, { totals: Record<Store, number>; counts: Record<Store, number> }>();
    const totalIngredientsByRecipe = new Map<number, number>();

    recipeIngredients.forEach(ri => {
      const weightG = parseQuantityToGrams(ri.ingredient_quantity);
      const entry = totalsByRecipe.get(ri.recipe_id) ?? {
        totals: { continente: 0, pingo_doce: 0 },
        counts: { continente: 0, pingo_doce: 0 },
      };

      totalIngredientsByRecipe.set(ri.recipe_id, (totalIngredientsByRecipe.get(ri.recipe_id) ?? 0) + 1);

      (['continente', 'pingo_doce'] as Store[]).forEach(store => {
        const pricePerKg = bestPriceByIngredientStore.get(`${ri.ingredient_id}:${store}`);
        if (pricePerKg == null) {
          return;
        }
        entry.totals[store] = (entry.totals[store] ?? 0) + (pricePerKg / 1000) * weightG;
        entry.counts[store] = (entry.counts[store] ?? 0) + 1;
      });

      totalsByRecipe.set(ri.recipe_id, entry);
    });

    const result = new Map<number, number>();
    totalsByRecipe.forEach((entry, recipeId) => {
      const totalIngredients = totalIngredientsByRecipe.get(recipeId) ?? 0;
      const candidates = (Object.entries(entry.totals) as Array<[Store, number]>).map(([store, total]) => ({
        store,
        total,
        count: entry.counts[store] ?? 0,
      }));

      const fullCoverage = candidates.filter(c => c.count === totalIngredients && totalIngredients > 0);
      const shortlist = fullCoverage.length ? fullCoverage : candidates.filter(c => c.count > 0);
      if (!shortlist.length) return;

      const best = shortlist.reduce((acc, cur) => {
        if (!acc) return cur;
        if (cur.count !== acc.count) return cur.count > acc.count ? cur : acc;
        return cur.total < acc.total ? cur : acc;
      }, null as typeof shortlist[number] | null);

      if (best) {
        const rounded = Math.round(best.total * 100) / 100;
        result.set(recipeId, rounded);
      }
    });

    return result;
  };

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

    const curatedCosts = await computeCuratedRecipeCosts((curatedRes.data ?? []).map(r => r.recipe_id));

    const curated = (curatedRes.data ?? []).map(r => ({
      id: toCuratedId(r.recipe_id),
      name: r.recipe_name ?? 'Recipe',
      mealType: 'Almoço' as MealType,
      dietTags: [],
      macros: {
        calories: Math.round(r.nutritional_value ?? 0),
        protein: Math.round(r.protein ?? 0),
        carbs: Math.round(r.carbs ?? 0),
        fat: Math.round(r.fat ?? 0),
      },
      cost: curatedCosts.get(r.recipe_id) ?? 0,
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

    const productRows = recipe.ingredients
      .map(ing => ({
        user_recipe_id: data.user_recipe_id,
        product_id: ing.productId ?? ing.ingredientId,
        quantity_used: ing.weightG,
        quantity_unit: 'g',
      }))
      .filter(row => row.product_id);

    if (productRows.length) {
      const { error: productError } = await supabase
        .from('fact_user_recipe_product')
        .insert(productRows);
      if (productError) throw productError;
    }

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

    const { error: clearError } = await supabase
      .from('fact_user_recipe_product')
      .delete()
      .eq('user_recipe_id', userRecipeId);
    if (clearError) throw clearError;

    const productRows = recipe.ingredients
      .map(ing => ({
        user_recipe_id: userRecipeId,
        product_id: ing.productId ?? ing.ingredientId,
        quantity_used: ing.weightG,
        quantity_unit: 'g',
      }))
      .filter(row => row.product_id);

    if (productRows.length) {
      const { error: productError } = await supabase
        .from('fact_user_recipe_product')
        .insert(productRows);
      if (productError) throw productError;
    }

    dispatch({ type: 'UPDATE_RECIPE', payload: recipe });
  };

  const deleteRecipe = async (recipeId: string) => {
    const userRecipeId = parseUserRecipeId(recipeId);
    if (!userRecipeId) return;

    const { error: productError } = await supabase
      .from('fact_user_recipe_product')
      .delete()
      .eq('user_recipe_id', userRecipeId);
    if (productError) throw productError;

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