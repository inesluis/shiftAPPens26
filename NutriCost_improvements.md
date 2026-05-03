# NutriCost — Hackathon Improvement Plan

> Priority order: **Tests → API layer → Env vars → TypeScript types**

---

## 1. 🧪 Tests (most urgent — explicitly judged)

The challenge states *"sim, testes lol"* — currently there are **zero test files**, no testing library installed, and no `test` script in `package.json`.

### Setup

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
```

Add to `package.json`:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
},
"jest": {
  "preset": "jest-expo"
}
```

### What to test

The pure functions in `AppContext.tsx` are ideal — no mocking needed:

| Function | What to test |
|---|---|
| `normalizeMealType` | All valid inputs (PT + EN), accented chars, unknown fallback |
| `normalizeDietTags` | Known keys map correctly, unknown returns `[]` |
| `parseQuantityToGrams` | `kg`, `g`, `ml`, plain numbers, commas, invalid input |
| `toPricePerKg` | Each price calculation branch, null/zero guards |
| `reducer` | Every `Action` type produces the correct new state |

### Example test file — `src/utils/__tests__/normalization.test.ts`

```ts
import { normalizeMealType, normalizeDietTags, parseQuantityToGrams } from '../normalization';

describe('normalizeMealType', () => {
  it('maps "breakfast" to Pequeno-Almoço', () => {
    expect(normalizeMealType('breakfast')).toBe('Pequeno-Almoço');
  });
  it('maps accented "almoço" to Almoço', () => {
    expect(normalizeMealType('almoço')).toBe('Almoço');
  });
  it('falls back to Almoço for unknown values', () => {
    expect(normalizeMealType('brunch')).toBe('Almoço');
  });
});

describe('parseQuantityToGrams', () => {
  it('converts kg to grams', () => {
    expect(parseQuantityToGrams('1.5kg')).toBe(1500);
  });
  it('returns plain grams', () => {
    expect(parseQuantityToGrams('250g')).toBe(250);
  });
  it('defaults to 100 for null/undefined', () => {
    expect(parseQuantityToGrams(null)).toBe(100);
  });
  it('handles comma as decimal separator', () => {
    expect(parseQuantityToGrams('0,5kg')).toBe(500);
  });
});
```

> **Note:** To make these testable, move the pure functions out of `AppContext.tsx` into `src/utils/normalization.ts` (see Architecture section).

---

## 2. 🔒 Security

### 2a. `.env` committed with real credentials

The `.env` file is included in the repository with real Supabase credentials. This is a security risk.

**Fix — add to `.gitignore`:**

```
.env
.env.local
.env*.local
```

Create a `.env.example` file (safe to commit) so teammates know what variables are needed:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=http://your-api-host:8080/jakartApp/api
```

### 2b. API base URL hardcoded as a local IP

`http://192.168.20.79:8080` is a private LAN address hardcoded in **two separate files**:
- `src/context/AppContext.tsx` (line 4 inside `AppProvider`)
- `src/components/AISuggestionsModal.tsx` (line 9)

This URL will not work on any machine other than the original developer's.

**Fix — add to `.env`:**

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.20.79:8080/jakartApp/api
```

**Fix — create a shared config file `src/config.ts`:**

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

if (!API_BASE_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_BASE_URL in .env');
}
```

Then replace both hardcoded strings:

```ts
// Before (in AppContext.tsx and AISuggestionsModal.tsx)
const API_BASE_URL = 'http://192.168.20.79:8080/jakartApp/api';

// After
import { API_BASE_URL } from '../config';
```

### 2c. `node_modules` in the submission zip

`node_modules` should never be committed or included in a submission. Add it to `.gitignore`:

```
node_modules/
```

---

## 3. 🏗 Architecture

### 3a. `AppContext.tsx` is doing too much (300+ lines)

A single file currently handles: state management, API fetching, response normalization, auth listening, local storage persistence, and business logic. This makes it hard to read, test, and maintain.

**Proposed folder structure:**

```
src/
├── api/
│   ├── recipes.ts        ← all fetch() calls for recipes
│   └── ai.ts             ← AI generation endpoint call
├── context/
│   └── AppContext.tsx    ← only useReducer, Provider, useApp hook
├── utils/
│   ├── normalization.ts  ← normalizeMealType, normalizeDietTags, etc.
│   ├── ingredientPicker.ts
│   └── name.ts
└── config.ts             ← API_BASE_URL, constants
```

**Example — `src/api/recipes.ts`:**

```ts
import { API_BASE_URL } from '../config';
import { Recipe } from '../types';

export async function fetchRecipes(userId?: string): Promise<Recipe[]> {
  const url = `${API_BASE_URL}/recipes${userId ? `?userId=${userId}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch recipes: ${response.status}`);
  return response.json();
}

export async function createRecipe(payload: unknown): Promise<{ userRecipeId: number }> {
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create recipe');
  return response.json();
}
```

### 3b. `reloadRecipes()` wipes all state

`reloadRecipes()` dispatches a `HYDRATE` action, which was designed for the initial app load. This overwrites `profile` and `mealLogs` along with `recipes` — a silent data-loss bug.

**Fix — add a dedicated action:**

```ts
// In the Action union type
| { type: 'SET_RECIPES'; payload: Recipe[] }

// In the reducer
case 'SET_RECIPES':
  return { ...state, recipes: action.payload };

// In reloadRecipes()
const reloadRecipes = async () => {
  const recipes = await fetchRecipesFromApi();
  dispatch({ type: 'SET_RECIPES', payload: recipes });
};
```

### 3c. `AISuggestionsModal` calls the API directly

A UI component should not contain `fetch()` calls. Move the AI call to `src/api/ai.ts` and call that from the modal.

**`src/api/ai.ts`:**

```ts
import { API_BASE_URL } from '../config';

interface AIRecipeRequest {
  name: string;
  type: string;
  ingredients: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function generateRecipeInstructions(request: AIRecipeRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/recipes/AiGenerated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate AI suggestions');
  const data = await response.json();
  return Array.isArray(data.instructions)
    ? data.instructions.join('\n')
    : (data.instructions ?? '');
}
```

---

## 4. ✏️ Code Quality

### 4a. Replace `any` types with proper interfaces

In `fetchRecipesFromApi`, the raw API response items are typed as `any`. Define interfaces for what the backend actually returns:

```ts
// src/types/api.ts
export interface CuratedRecipeDTO {
  recipeId: number;
  recipeName: string | null;
  nutritionalValue: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  instructions: string | null;
}

export interface UserRecipeDTO {
  userRecipeId: number;
  recipeName: string | null;
  mealType: string | null;
  dietType: string | null;
  totalEnergyKcal: number | null;
  totalProtein: number | null;
  totalCarbohydrates: number | null;
  totalFats: number | null;
  totalCost: number | null;
  instructions: string | null;
}
```

Then replace:

```ts
// Before
(data.curated || []).map(async (r: any) => ({ ... }))

// After
(data.curated as CuratedRecipeDTO[] || []).map(async (r) => ({ ... }))
```

### 4b. Remove `console.log` from production code

These debug lines should not be in a hackathon submission:

```ts
// Remove these from AppContext.tsx
console.log('Fetching recipes from:', url);
console.log('API Data received:', JSON.stringify(data).substring(0, 200) + '...');
console.error('API Error Response:', errorText);
console.error('fetchRecipesFromApi caught error:', err);
```

If you want to keep error logging, use a proper utility or just surface the error to the UI.

### 4c. Add a React error boundary

Wrap the app in an error boundary to prevent a full white screen crash if something goes wrong:

```tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Algo correu mal. Tenta reiniciar a app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
```

```tsx
// App.tsx
<ErrorBoundary>
  <AppProvider>
    <RootNavigator />
  </AppProvider>
</ErrorBoundary>
```

### 4d. Hardcoded personal data in `DEFAULT_PROFILE`

```ts
// Before
const DEFAULT_PROFILE: UserProfile = {
  name: 'João',
  age: 27,
  weightKg: 78,
  ...
};

// After — use neutral defaults
const DEFAULT_PROFILE: UserProfile = {
  name: 'Utilizador',
  age: 25,
  weightKg: 70,
  heightCm: 170,
  goal: 'Manutenção',
  weeklyBudget: 50,
  macroGoals: { calories: 2000, protein: 120, carbs: 200, fat: 60 },
};
```

---

## 5. ⭐ AI usage — make it more visible to judges

The `AISuggestionsModal` generating cooking instructions from real ingredients + difficulty level is genuinely smart and health-relevant. A few quick wins to make it stand out:

- **Explain what the AI is doing** — add a subtitle like *"Gera instruções passo-a-passo com base nos teus ingredientes"* so judges immediately understand the value.
- **Add a "Regenerar" button** — after suggestions are shown, let the user regenerate without going back.
- **Surface the difficulty in the result** — show a small badge (🟢 Fácil, 🟡 Médio, 🔴 Difícil) next to the generated instructions.
- **Expand AI to macro suggestions** — when a user adds an ingredient manually (without a barcode), use the AI endpoint to estimate macros from the ingredient name. This makes the AI feel integral rather than optional.
- **Mention it in your pitch** — the health + budget angle is strong. Make sure judges know the AI generates contextual instructions based on what the user actually has in their recipe.

---

## Summary checklist

- [x] Install `jest-expo` + `@testing-library/react-native`
- [ ] Write unit tests for `normalizeMealType`, `normalizeDietTags`, `parseQuantityToGrams`, `toPricePerKg`, and `reducer`
- [x] Add `EXPO_PUBLIC_API_BASE_URL` to `.env` and create `src/config.ts`
- [x] Add `.env` and `node_modules/` to `.gitignore`, create `.env.example`
- [ ] Create `src/api/recipes.ts` and `src/api/ai.ts`, remove `fetch()` calls from context and components
- [ ] Add `SET_RECIPES` action and fix `reloadRecipes()`
- [ ] Replace `any` types with proper DTOs in `src/types/api.ts`
- [ ] Remove all `console.log` debug lines
- [ ] Add `ErrorBoundary` component
- [ ] Neutralise `DEFAULT_PROFILE` values
- [ ] Add UI improvements to `AISuggestionsModal` to highlight the AI feature to judges
