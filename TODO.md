# NutriCost TODO - UI/UX Improvements

This document outlines suggested improvements for the NutriCost mobile application to enhance its UI/UX, feature set, and technical robustness.

## Home

- [x] "Good Evening @User"

### Compare Prices
- [ ] It shows the lowest price in each supermarket, it should show possible different brands in each supermarket
- [x] User can choose which supermarket and brand they get the product from 

### Browse Recipes
- [x] Improve the diet filter, in "All" half the tags are cut in half
- [X] Go inside the meal and see a new interface
    - [x] Edit fields
    - [x] Save edits
    - [x] Change meal type
    - [ ] See the total by different supermarkets
- [x] Ability to define the type of recipe ["Breakfast", "Lunch", "Dinner", "Snack]

### New Recipe
- [x] Create Recipe + Create & Log Recipe
- [x] Instructions 

## Tracking
- [x] In "Meals Logged", snack is always available to add a new one -> Removed buttons
- [x] In the stacked bar chart
    - [x] When hovering in the bars the values show up
    - [x] The Y axis

## Profile
- [x] The body info using slide bar?
- [x] Weekly Budget and Daily Macro Goals also being possible to write the number instead of only +/-
- [x] Preset Macro Goals based on the type of profile

---

## 🎨 UI Improvements
- [ ] **Modern Feedback Mechanisms**: Replace blocking `Alert.alert` calls (e.g., when logging a meal or saving a recipe) with non-intrusive Toast notifications or SnackBar components.
- [ ] **Animations & Transitions**:
    - Implement `LayoutAnimation` or `react-native-reanimated` for smooth transitions when adding/removing ingredients in `CreateRecipeScreen`.
    - Add subtle entry animations for cards in lists.
- [ ] **Typography Hierarchy**: Standardize font weights and sizes across screens to ensure a consistent visual hierarchy.
- [ ] **Theme Alignment**: Update `app.json` to set `userInterfaceStyle` to `dark` to match the application's actual theme.
- [ ] **Component Consistency**: Ensure all cards and screens follow a unified padding/margin system (currently mixed between 14px and 16px).
- [ ] **Interactive Charts**: Enhance `WeeklyBudgetChart` to allow users to tap on bars to see a breakdown of spending for that specific day.

## 🚀 UX Enhancements
- [ ] **Rich Empty States**:
    - Add descriptive illustrations and clear "Call to Action" buttons for empty lists (e.g., "No custom recipes yet? Create your first one!").
    - Improve the initial state of the `IngredientSearchScreen` with popular search suggestions.
- [ ] **Onboarding Flow**: Create a first-time user experience to guide users through setting up their profile, goals, and budget.
- [ ] **Navigation Polish**:
    - Standardize the "Back" button across modal screens.
    - Consider using a standard header for modals or adding a "Close" icon (X) in the top right.
- [ ] **Recipe Sorting**: Add the ability to sort recipes by cost, calorie count, or protein content in the `RecipesScreen`.
- [ ] **Form UX**: 
    - Add validation to `CreateRecipeScreen` (e.g., prevent negative weights, suggest units).
    - Use better input types for numeric fields (e.g., numeric keypad with "Done" accessory bar on iOS).

## ✨ New Features
- [ ] **Shopping List**: Generate an automated shopping list based on logged meals or selected recipes, grouped by store (Continente, Pingo Doce, Lidl).
- [ ] **Favorites**: Allow users to "Heart" recipes for quick access in a dedicated Favorites tab or section.
- [ ] **Meal Reminders**: Optional local notifications to remind users to log their meals throughout the day.
- [ ] **Unit Conversion**: Support for more units (e.g., ml, liters, units/pieces) instead of only grams/kg.
- [ ] **Store Map Integration**: Show the nearest store location when viewing ingredient prices.

## 🛠️ Technical & Accessibility
- [ ] **Accessibility**: Add `accessibilityLabel` and `accessibilityRole` to all interactive components (buttons, chips, tabs).
- [ ] **Performance**: Memoize heavy list items and use `FlashList` if the recipe or ingredient database grows significantly.
- [ ] **Project Structure Cleanup**: Remove unused or empty directories (e.g., the `NutriCost/app/` folder appears to be redundant given the `src/` directory).
- [ ] **Error Handling**: Implement global error boundaries and better handling for edge cases (e.g., when `AsyncStorage` fails).
- [ ] **Typescript Strictness**: Ensure all components have well-defined prop types and avoid using `any`.
