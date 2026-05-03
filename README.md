# shiftAPPens26

##

A React Native mobile app built with **TypeScript** and **Expo**, designed to help track nutritional costs and recipe management.

### Tech Stack

| Layer      | Technology                |
| ---------- | ------------------------- |
| UI / Logic | React Native + TypeScript |
| Framework  | Expo                      |
| Navigation | React Navigation v7       |
| Storage    | AsyncStorage              |
| Icons      | Expo Vector Icons         |

### Project Structure

```
NutriCost/
├── App.tsx
└── src/
    ├── types/index.ts
    ├── theme/index.ts
    ├── data/
    │   ├── recipes.ts
    │   └── ingredients.ts
    ├── utils/
    │   └── ingredientPicker.ts
    ├── context/
    │   └── AppContext.tsx
    ├── components/
    │   ├── Card.tsx
    │   ├── MacroRing.tsx
    │   ├── MacroBar.tsx
    │   ├── RecipeCard.tsx
    │   └── WeeklyBudgetChart.tsx
    ├── navigation/
    │   ├── types.ts
    │   ├── TabNavigator.tsx
    │   └── RootNavigator.tsx
    └── screens/
        ├── HomeScreen.tsx
        ├── RecipesScreen.tsx
        ├── IngredientSearchScreen.tsx
        ├── CreateRecipeScreen.tsx
        ├── TrackingScreen.tsx
        └── ProfileScreen.tsx
```

### Getting Started

1. **Install dependencies:**

   ```bash
   cd NutriCost
   npm install
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

### Available Commands

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm start`       | Start Expo development server          |
| `npm run android` | Build & run on Android device/emulator |

### Running the App

**For Android:**

```bash
cd NutriCost
npm install
npm run android
```

## License

This project is publicly released under the **Eclipse Public License v1.0 (EPL-1.0)**.

You are free to use, modify, and distribute this software under the terms of the EPL. For more information, see the [EPL License](https://www.eclipse.org/legal/epl-v10.html).

This is a requirement of the Hackaton regulations.
