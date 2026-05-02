import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealLog, Recipe, UserProfile } from '../types';
import { PREDEFINED_RECIPES } from '../data/recipes';

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
  recipes: PREDEFINED_RECIPES,
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
}

const AppContext = createContext<ContextValue | undefined>(undefined);
const STORAGE_KEY = '@nutricost_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<Omit<State, 'isLoading'>>;
          const customRecipes = (saved.recipes ?? []).filter(r => r.isCustom);
          dispatch({
            type: 'HYDRATE',
            payload: { ...saved, recipes: [...PREDEFINED_RECIPES, ...customRecipes] },
          });
        } catch {
          dispatch({ type: 'HYDRATE', payload: {} });
        }
      } else {
        dispatch({ type: 'HYDRATE', payload: {} });
      }
    });
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      const { isLoading, ...toSave } = state;
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
    <AppContext.Provider value={{ state, dispatch, getTodayLogs, getWeekLogs, getDailyBudget, todayDate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}