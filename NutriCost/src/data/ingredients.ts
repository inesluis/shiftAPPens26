import { Ingredient } from '../types';

export const INGREDIENTS_DB: Ingredient[] = [
  {
    id: 'i1', name: 'Oat Milk', brand: 'Oatly Barista',
    prices: { continente: 2.79, pingo_doce: 2.99 },
    macrosPer100g: { calories: 45, protein: 1.0, carbs: 6.5, fat: 1.5 },
  },
  {
    id: 'i2', name: 'Oat Milk', brand: 'Biotrends Oat Milk',
    prices: { lidl: 1.69 },
    macrosPer100g: { calories: 44, protein: 1.2, carbs: 6.8, fat: 1.4 },
  },
  {
    id: 'i3', name: 'Oat Milk', brand: 'Continente Bio Oat',
    prices: { continente: 1.99 },
    macrosPer100g: { calories: 43, protein: 1.1, carbs: 6.2, fat: 1.3 },
  },
  {
    id: 'i4', name: 'Coconut Milk', brand: 'Naturas Coconut Milk',
    prices: { continente: 1.49, pingo_doce: 1.65, lidl: 1.39 },
    macrosPer100g: { calories: 152, protein: 1.4, carbs: 2.8, fat: 14.7 },
  },
  {
    id: 'i5', name: 'Coconut Milk', brand: 'Blue Dragon Coconut Milk',
    prices: { continente: 2.19, pingo_doce: 1.99 },
    macrosPer100g: { calories: 150, protein: 1.3, carbs: 2.5, fat: 14.5 },
  },
  {
    id: 'i6', name: 'Atlantic Salmon', brand: 'Salmon Fillet (per kg)',
    prices: { continente: 14.99, pingo_doce: 13.50, lidl: 12.99 },
    macrosPer100g: { calories: 208, protein: 20.0, carbs: 0, fat: 13.0 },
  },
  {
    id: 'i7', name: 'Jasmine Rice', brand: 'Jasmine Rice (1kg)',
    prices: { continente: 1.49, pingo_doce: 1.39, lidl: 1.09 },
    macrosPer100g: { calories: 130, protein: 2.7, carbs: 28.0, fat: 0.3 },
  },
  {
    id: 'i8', name: 'Basmati Rice', brand: 'Basmati Rice (1kg)',
    prices: { continente: 1.89, pingo_doce: 1.99, lidl: 1.49 },
    macrosPer100g: { calories: 121, protein: 3.5, carbs: 25.2, fat: 0.4 },
  },
  {
    id: 'i9', name: 'Olive Oil', brand: 'Gallo Extra Virgin (750ml)',
    prices: { continente: 5.49, pingo_doce: 5.99, lidl: 4.99 },
    macrosPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
  },
  {
    id: 'i10', name: 'Olive Oil', brand: 'Continente Bio Olive Oil',
    prices: { continente: 4.29 },
    macrosPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
  },
  {
    id: 'i11', name: 'Free Range Eggs', brand: 'Free Range Eggs (12)',
    prices: { continente: 2.99, pingo_doce: 2.79, lidl: 2.49 },
    macrosPer100g: { calories: 155, protein: 13.0, carbs: 1.1, fat: 11.0 },
  },
  {
    id: 'i12', name: 'Chicken Breast', brand: 'Chicken Breast (per kg)',
    prices: { continente: 7.99, pingo_doce: 8.49, lidl: 6.99 },
    macrosPer100g: { calories: 165, protein: 31.0, carbs: 0, fat: 3.6 },
  },
  {
    id: 'i13', name: 'Greek Yogurt', brand: 'Danone Greek (500g)',
    prices: { continente: 2.49, pingo_doce: 2.29, lidl: 1.99 },
    macrosPer100g: { calories: 97, protein: 9.0, carbs: 4.0, fat: 5.0 },
  },
  {
    id: 'i14', name: 'Quinoa', brand: 'Quinoa (500g)',
    prices: { continente: 4.99, pingo_doce: 5.49 },
    macrosPer100g: { calories: 368, protein: 14.0, carbs: 64.0, fat: 6.0 },
  },
  {
    id: 'i15', name: 'Tuna Can', brand: 'Rio Mare (160g)',
    prices: { continente: 2.49, pingo_doce: 2.69, lidl: 1.99 },
    macrosPer100g: { calories: 103, protein: 23.0, carbs: 0, fat: 0.7 },
  },
];