import { Recipe } from '../types';

export const PREDEFINED_RECIPES: Recipe[] = [
  {
    id: 'r1', name: 'Quinoa Power Bowl', mealType: 'Almoço',
    dietTags: ['Vegan', 'Proteica'],
    macros: { calories: 480, protein: 22, carbs: 65, fat: 12 },
    cost: 3.40, isCustom: false,
    ingredients: [
      { ingredientId: 'i14', name: 'Quinoa', brand: 'Continente Bio', weightG: 150, selectedStore: 'continente', pricePerKg: 4.99 },
      { ingredientId: 'i4',  name: 'Coconut Milk', brand: 'Naturas', weightG: 80, selectedStore: 'pingo_doce', pricePerKg: 1.39 },
      { ingredientId: 'i12', name: 'Chicken Breast', brand: 'Fresh', weightG: 100, selectedStore: 'pingo_doce', pricePerKg: 8.49 },
    ],
  },
  {
    id: 'r2', name: 'Greek Chicken Bowl', mealType: 'Jantar',
    dietTags: ['Proteica', 'Mediterrânica'],
    macros: { calories: 640, protein: 52, carbs: 45, fat: 18 },
    cost: 4.80, isCustom: false,
    ingredients: [
      { ingredientId: 'i12', name: 'Chicken Breast', brand: 'Continente', weightG: 250, selectedStore: 'continente', pricePerKg: 7.99 },
      { ingredientId: 'i13', name: 'Greek Yogurt', brand: 'Danone', weightG: 100, selectedStore: 'pingo_doce', pricePerKg: 3.50 },
    ],
  },
  {
    id: 'r3', name: 'Avocado Toast', mealType: 'Pequeno-Almoço',
    dietTags: ['Vegan', 'Low Carb'],
    macros: { calories: 320, protein: 12, carbs: 34, fat: 16 },
    cost: 2.10, isCustom: false,
    ingredients: [],
  },
  {
    id: 'r4', name: 'Salmon & Sweet Potato', mealType: 'Jantar',
    dietTags: ['Proteica', 'Keto'],
    macros: { calories: 580, protein: 44, carbs: 52, fat: 22 },
    cost: 5.60, isCustom: false,
    ingredients: [
      { ingredientId: 'i6', name: 'Atlantic Salmon', brand: 'Continente', weightG: 200, selectedStore: 'pingo_doce', pricePerKg: 12.99 },
    ],
  },
  {
    id: 'r5', name: 'Overnight Oats', mealType: 'Pequeno-Almoço',
    dietTags: ['Vegan'],
    macros: { calories: 380, protein: 14, carbs: 60, fat: 8 },
    cost: 1.20, isCustom: false,
    ingredients: [
      { ingredientId: 'i1', name: 'Oat Milk', brand: 'Oatly Barista', weightG: 200, selectedStore: 'continente', pricePerKg: 2.79 },
    ],
  },
  {
    id: 'r6', name: 'Egg & Veggie Scramble', mealType: 'Pequeno-Almoço',
    dietTags: ['Keto', 'Low Carb', 'Proteica'],
    macros: { calories: 290, protein: 20, carbs: 8, fat: 18 },
    cost: 1.80, isCustom: false,
    ingredients: [
      { ingredientId: 'i11', name: 'Free Range Eggs', brand: 'Continente Bio', weightG: 150, selectedStore: 'pingo_doce', pricePerKg: 2.49 },
    ],
  },
  {
    id: 'r7', name: 'Lentil Soup', mealType: 'Almoço',
    dietTags: ['Vegan', 'Mediterrânica'],
    macros: { calories: 360, protein: 18, carbs: 58, fat: 5 },
    cost: 1.50, isCustom: false,
    ingredients: [],
  },
  {
    id: 'r8', name: 'Tuna Rice Bowl', mealType: 'Almoço',
    dietTags: ['Proteica', 'Low Carb'],
    macros: { calories: 430, protein: 38, carbs: 48, fat: 7 },
    cost: 2.80, isCustom: false,
    ingredients: [
      { ingredientId: 'i15', name: 'Tuna Can', brand: 'Rio Mare', weightG: 150, selectedStore: 'pingo_doce', pricePerKg: 1.99 },
      { ingredientId: 'i7',  name: 'Jasmine Rice', brand: 'Continente', weightG: 150, selectedStore: 'pingo_doce', pricePerKg: 1.09 },
    ],
  },
];