import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { ingredientPicker } from '../utils/ingredientPicker';
import { RootStackParamList } from '../navigation/types';
import { Ingredient, MealType, DietTag, Recipe, Store } from '../types';
import { C, R } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRecipe'>;

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const DIET_TAGS: DietTag[] = ['Vegan', 'High Protein', 'Keto', 'Mediterranean', 'Low Carb', 'Gluten Free'];
const STORE_LABEL: Record<Store, string> = { continente: 'Continente', pingo_doce: 'Pingo Doce', lidl: 'Lidl' };

interface Draft {
  ingredient: Ingredient;
  weightG: number;
  store: Store;
}

function calcCost(d: Draft) {
  return ((d.ingredient.prices[d.store] ?? 0) / 1000) * d.weightG;
}

function sumMacros(drafts: Draft[]) {
  return drafts.reduce(
    (acc, d) => {
      const f = d.weightG / 100;
      return {
        calories: acc.calories + d.ingredient.macrosPer100g.calories * f,
        protein: acc.protein + d.ingredient.macrosPer100g.protein * f,
        carbs: acc.carbs + d.ingredient.macrosPer100g.carbs * f,
        fat: acc.fat + d.ingredient.macrosPer100g.fat * f,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export default function CreateRecipeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { dispatch, todayDate } = useApp();

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [tags, setTags] = useState<DietTag[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [instructions, setInstructions] = useState('');

  // Register picker callback so IngredientSearch can call back with the selection
  useEffect(() => {
    ingredientPicker.set((ingredient, weightG, store) => {
      setDrafts(prev => [...prev, { ingredient, weightG, store: store as Store }]);
    });
    return () => ingredientPicker.clear();
  }, []);

  const totalCost = drafts.reduce((a, d) => a + calcCost(d), 0);
  const macros = sumMacros(drafts);

  const toggleTag = (tag: DietTag) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const updateWeight = (idx: number, val: string) =>
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, weightG: parseInt(val) || 0 } : d));

  const remove = (idx: number) =>
    setDrafts(prev => prev.filter((_, i) => i !== idx));

  const buildRecipe = () => {
    if (!name.trim()) { Alert.alert('Error', 'Add a recipe name.'); return null; }
    if (!drafts.length) { Alert.alert('Error', 'Add at least one ingredient.'); return null; }

    const recipe: Recipe = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      mealType,
      dietTags: tags,
      macros: {
        calories: Math.round(macros.calories),
        protein: Math.round(macros.protein),
        carbs: Math.round(macros.carbs),
        fat: Math.round(macros.fat),
      },
      cost: parseFloat(totalCost.toFixed(2)),
      ingredients: drafts.map(d => ({
        ingredientId: d.ingredient.id,
        name: d.ingredient.name,
        brand: d.ingredient.brand,
        weightG: d.weightG,
        selectedStore: d.store,
        pricePerKg: d.ingredient.prices[d.store] ?? 0,
      })),
      instructions: instructions.trim() ? instructions.trim() : undefined,
      isCustom: true,
    };

    return recipe;
  };

  const handleSave = () => {
    const recipe = buildRecipe();
    if (!recipe) return;

    dispatch({ type: 'ADD_RECIPE', payload: recipe });
    Alert.alert('Saved!', `${recipe.name} added to your recipes.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handleSaveAndLog = () => {
    const recipe = buildRecipe();
    if (!recipe) return;

    dispatch({ type: 'ADD_RECIPE', payload: recipe });
    dispatch({
      type: 'ADD_MEAL_LOG',
      payload: {
        id: `log_${Date.now()}`,
        date: todayDate,
        recipeId: recipe.id,
        recipeName: recipe.name,
        mealType: recipe.mealType,
        macros: recipe.macros,
        cost: recipe.cost,
      },
    });

    Alert.alert('Saved & logged!', `${recipe.name} was added and logged.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={14} color={C.accent} />
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>New Recipe</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Text style={s.fieldLabel}>Recipe name</Text>
        <TextInput
          style={s.textInput} value={name} onChangeText={setName}
          placeholder="e.g. My Protein Bowl" placeholderTextColor={C.textMuted}
        />

        {/* Meal type */}
        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Meal type</Text>
        <View style={s.chipRow}>
          {MEAL_TYPES.map(mt => (
            <TouchableOpacity
              key={mt}
              style={[s.chip, mealType === mt && s.chipOn]}
              onPress={() => setMealType(mt)}
            >
              <Text style={[s.chipTxt, mealType === mt && s.chipTxtOn]}>{mt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Diet tags */}
        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Diet tags</Text>
        <View style={s.chipRow}>
          {DIET_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[s.chip, tags.includes(tag) && s.chipOn]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[s.chipTxt, tags.includes(tag) && s.chipTxtOn]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.divider} />
        <Text style={s.sLabel}>Ingredients</Text>

        {drafts.map((d, idx) => (
          <Card key={idx} style={{ marginBottom: 9 }}>
            <View style={s.ingHdr}>
              <View style={{ flex: 1 }}>
                <Text style={s.ingName}>{d.ingredient.name}</Text>
                <Text style={s.ingBrand}>{d.ingredient.brand} · {STORE_LABEL[d.store]} · €{d.ingredient.prices[d.store]?.toFixed(2)}/kg</Text>
              </View>
              <TouchableOpacity onPress={() => remove(idx)}>
                <Ionicons name="trash-outline" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.ingBottom}>
              <TextInput
                style={s.weightInput}
                value={d.weightG.toString()}
                onChangeText={v => updateWeight(idx, v)}
                keyboardType="numeric"
              />
              <Text style={s.gram}>g</Text>
              <Text style={s.ingCost}>€{calcCost(d).toFixed(2)}</Text>
            </View>
          </Card>
        ))}

        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('IngredientSearch', { mode: 'addToRecipe' })}
        >
          <Text style={s.addBtnTxt}>+ Add Ingredient</Text>
        </TouchableOpacity>

        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Instructions (optional)</Text>
        <TextInput
          style={[s.textInput, s.instructionsInput]}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. Mix all ingredients and cook for 10 minutes"
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        {drafts.length > 0 && (
          <>
            <View style={s.divider} />
            <Card style={{ marginBottom: 14 }}>
              <Text style={s.sLabel}>Estimated Nutrition</Text>
              <View style={s.summaryGrid}>
                <View><Text style={s.sumLabel}>Calories</Text><Text style={s.sumVal}>{Math.round(macros.calories)} <Text style={s.sumUnit}>kcal</Text></Text></View>
                <View><Text style={s.sumLabel}>Total Cost</Text><Text style={[s.sumVal, { color: C.accent }]}>€{totalCost.toFixed(2)}</Text></View>
                <View><Text style={s.sumLabel}>Protein</Text><Text style={[s.sumVal, { fontSize: 16, color: C.protein }]}>{Math.round(macros.protein)}g</Text></View>
                <View><Text style={s.sumLabel}>Carbs</Text><Text style={[s.sumVal, { fontSize: 16, color: C.carbs }]}>{Math.round(macros.carbs)}g</Text></View>
                <View><Text style={s.sumLabel}>Fat</Text><Text style={[s.sumVal, { fontSize: 16, color: C.fat }]}>{Math.round(macros.fat)}g</Text></View>
              </View>
            </Card>
          </>
        )}

        <View style={s.saveRow}>
          <TouchableOpacity style={[s.saveBtn, s.saveBtnSecondary]} onPress={handleSave}>
            <Text style={s.saveBtnTxtSecondary}>Save Recipe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveAndLog}>
            <Text style={s.saveBtnTxt}>Save & Log Recipe</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  backTxt: { fontSize: 12, color: C.accent },
  title: { fontSize: 21, fontWeight: '600', color: C.text },
  scroll: { padding: 16, paddingTop: 0 },
  fieldLabel: { fontSize: 11, color: C.textSub, marginBottom: 6 },
  textInput: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: R.md, padding: 10, fontSize: 13, color: C.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.md, borderWidth: 0.5, borderColor: C.borderMed },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt: { fontSize: 12, fontWeight: '500', color: C.textSub },
  chipTxtOn: { color: '#1A1000' },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 14 },
  sLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
  ingHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 },
  ingName: { fontSize: 13, fontWeight: '500', color: C.text },
  ingBrand: { fontSize: 11, color: C.textSub, marginTop: 1 },
  ingBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: { backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: 8, padding: 7, width: 80, fontSize: 12, color: C.text },
  gram: { fontSize: 12, color: C.textSub },
  ingCost: { marginLeft: 'auto', fontSize: 12, fontWeight: '600', color: C.accent },
  addBtn: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: R.md, padding: 10, alignItems: 'center', marginBottom: 4 },
  addBtnTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sumLabel: { fontSize: 11, color: C.textSub },
  sumVal: { fontSize: 18, fontWeight: '600', color: C.text, marginTop: 2 },
  sumUnit: { fontSize: 11, color: C.textSub, fontWeight: '400' },
  instructionsInput: { minHeight: 90, marginBottom: 18 },
  saveRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center' },
  saveBtnTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
  saveBtnSecondary: { flex: 1, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed },
  saveBtnTxtSecondary: { fontSize: 14, fontWeight: '600', color: C.text },
});