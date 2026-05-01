import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import RecipeCard from '../components/RecipeCard';
import { DietTag, MealLog } from '../types';
import { C } from '../theme';

const FILTERS: (DietTag | 'All')[] = [
  'All', 'Vegan', 'High Protein', 'Keto', 'Mediterranean', 'Low Carb', 'Gluten Free',
];

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch, todayDate } = useApp();
  const [active, setActive] = useState<DietTag | 'All'>('All');

  const filtered = useMemo(
    () => active === 'All' ? state.recipes : state.recipes.filter(r => r.dietTags.includes(active)),
    [state.recipes, active],
  );

  const handleLog = (recipeId: string) => {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    const log: MealLog = {
      id:          `log_${Date.now()}`,
      date:        todayDate,
      recipeId:    recipe.id,
      recipeName:  recipe.name,
      mealType:    recipe.mealType,
      macros:      recipe.macros,
      cost:        recipe.cost,
    };
    dispatch({ type: 'ADD_MEAL_LOG', payload: log });
    Alert.alert('Logged!', `${recipe.name} added to today's log.`);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Recipes</Text>
        <Text style={s.sub}>Curated meals for every goal</Text>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips} style={{ flexGrow: 0 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, active === f && s.chipOn]}
            onPress={() => setActive(f)}
          >
            <Text style={[s.chipTxt, active === f && s.chipTxtOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map(r => (
          <RecipeCard key={r.id} recipe={r} onLog={() => handleLog(r.id)} />
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr:       { paddingHorizontal: 16, paddingBottom: 10 },
  title:     { fontSize: 21, fontWeight: '600', color: C.text },
  sub:       { fontSize: 12, color: C.textSub, marginTop: 2 },
  chips:     { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  chip:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: C.borderMed },
  chipOn:    { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt:   { fontSize: 12, fontWeight: '500', color: C.textSub },
  chipTxtOn: { color: '#1A1000' },
  list:      { paddingHorizontal: 16 },
});