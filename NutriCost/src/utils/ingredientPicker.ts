import { Ingredient, Store } from '../types';

type PickerCallback = (ingredient: Ingredient, weightG: number, store: Store) => void;

let _callback: PickerCallback | null = null;

export const ingredientPicker = {
  set: (cb: PickerCallback) => { _callback = cb; },
  call: (ingredient: Ingredient, weightG: number, store: Store) => {
    _callback?.(ingredient, weightG, store);
  },
  clear: () => { _callback = null; },
};