import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import ConfirmModal from '../components/ConfirmModal';
import AISuggestionsModal from '../components/AISuggestionsModal';
import { ingredientPicker } from '../utils/ingredientPicker';
import { RootStackParamList } from '../navigation/types';
import { Ingredient, MealType, DietTag, Recipe, Store } from '../types';
import { C, R } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRecipe'>;

const DIET_TAGS: DietTag[] = ['Vegan', 'Proteica', 'Keto', 'Mediterrânica', 'Low Carb', 'Sem Glúten'];
const STORE_LABEL: Record<Store, string> = { continente: 'Continente', pingo_doce: 'Pingo Doce' };

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
  const { addRecipe, dispatch, todayDate } = useApp();

  const [name, setName] = useState('');
  const [tags, setTags] = useState<DietTag[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [instructions, setInstructions] = useState('');
  const [modal, setModal] = useState<{ type: 'error' | 'success'; title: string; message: string; action?: () => void } | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);

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
    if (!name.trim()) { setModal({ type: 'error', title: 'Erro', message: 'Adiciona um nome para a receita.' }); return null; }
    if (!drafts.length) { setModal({ type: 'error', title: 'Erro', message: 'Adiciona pelo menos um ingrediente.' }); return null; }

    const recipe: Recipe = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      mealType: 'Almoço',
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
        productId: d.ingredient.id,
        name: d.ingredient.name,
        brand: d.ingredient.brand,
        weightG: d.weightG,
        selectedStore: d.store,
        pricePerKg: d.ingredient.prices[d.store] ?? 0,
        macrosPer100g: d.ingredient.macrosPer100g,
      })),
      instructions: instructions.trim() ? instructions.trim() : undefined,
      isCustom: true,
    };

    return recipe;
  };

  const handleSave = async () => {
    const recipe = buildRecipe();
    if (!recipe) return;

    try {
      const saved = await addRecipe(recipe);
      if (!saved) return;
      setModal({ type: 'success', title: 'Guardado!', message: `${saved.name} adicionada às tuas receitas.`, action: () => navigation.goBack() });
    } catch {
      setModal({ type: 'error', title: 'Erro', message: 'Não foi possível guardar a receita no Supabase.' });
    }
  };

  const handleSaveAndLog = async () => {
    const recipe = buildRecipe();
    if (!recipe) return;

    try {
      const saved = await addRecipe(recipe);
      if (!saved) return;
      dispatch({
        type: 'ADD_MEAL_LOG',
        payload: {
          id: `log_${Date.now()}`,
          date: todayDate,
          recipeId: saved.id,
          recipeName: saved.name,
          mealType: saved.mealType,
          macros: saved.macros,
          cost: saved.cost,
        },
      });

      setModal({ type: 'success', title: 'Guardado & registado!', message: `${saved.name} foi adicionada e registada.`, action: () => navigation.goBack() });
    } catch {
      setModal({ type: 'error', title: 'Erro', message: 'Não foi possível guardar a receita no Supabase.' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={14} color={C.accent} />
          <Text style={s.backTxt}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Nova receita</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Text style={s.fieldLabel}>Nome da receita</Text>
        <TextInput
          style={s.textInput} value={name} onChangeText={setName}
          placeholder="e.g. A minha salada de atum" placeholderTextColor={C.textMuted}
        />

        {/* Diet tags */}
        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Tipo de dieta</Text>
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
        <Text style={s.sLabel}>Ingredientes</Text>

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
          <Text style={s.addBtnTxt}>+ Adicionar ingrediente</Text>
        </TouchableOpacity>

        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Instruções (opcionais)</Text>
        <View style={s.instructionsContainer}>
          <TextInput
            style={[s.textInput, s.instructionsInput]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. Mistura tudo e serve fresco"
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />
          {drafts.length > 0 && (
            <TouchableOpacity
              style={s.aiBtn}
              onPress={() => setAiModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={14} color={C.accent} />
              <Text style={s.aiBtnTxt}>IA</Text>
            </TouchableOpacity>
          )}
        </View>

        {drafts.length > 0 && (
          <>
            <View style={s.divider} />
            <Card style={{ marginBottom: 14 }}>
              <Text style={s.sLabel}>Nutrição Estimada</Text>
              <View style={s.summaryGrid}>
                <View><Text style={s.sumLabel}>Calorias</Text><Text style={s.sumVal}>{Math.round(macros.calories)} <Text style={s.sumUnit}>kcal</Text></Text></View>
                <View><Text style={s.sumLabel}>Custo Total</Text><Text style={[s.sumVal, { color: C.accent }]}>€{totalCost.toFixed(2)}</Text></View>
                <View><Text style={s.sumLabel}>Proteína</Text><Text style={[s.sumVal, { fontSize: 16, color: C.protein }]}>{Math.round(macros.protein)}g</Text></View>
                <View><Text style={s.sumLabel}>Carbs</Text><Text style={[s.sumVal, { fontSize: 16, color: C.carbs }]}>{Math.round(macros.carbs)}g</Text></View>
                <View><Text style={s.sumLabel}>Gordura</Text><Text style={[s.sumVal, { fontSize: 16, color: C.fat }]}>{Math.round(macros.fat)}g</Text></View>
              </View>
            </Card>
          </>
        )}

        <View style={s.saveRow}>
          <TouchableOpacity style={[s.saveBtn, s.saveBtnSecondary]} onPress={handleSave}>
            <Text style={s.saveBtnTxtSecondary}>Guardar receita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveAndLog}>
            <Text style={s.saveBtnTxt}>Guardar e registar</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmModal
        visible={modal !== null}
        title={modal?.title || ''}
        message={modal?.message || ''}
        confirmText="OK"
        onCancel={() => setModal(null)}
        onConfirm={() => {
          if (modal?.action) modal.action();
          setModal(null);
        }}
      />

      <AISuggestionsModal
        visible={aiModalVisible}
        recipeName={name || 'Nova Receita'}
        ingredients={drafts.map(d => ({ name: d.ingredient.name, weightG: d.weightG }))}
        onClose={() => setAiModalVisible(false)}
        onApply={(suggestionInstructions) => setInstructions(suggestionInstructions)}
      />
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
  instructionsContainer: { position: 'relative', marginBottom: 18 },
  aiBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: C.accentBg,
    borderRadius: R.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderColor: C.accent + '40',
  },
  aiBtnTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
  },
  saveRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center' },
  saveBtnTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
  saveBtnSecondary: { flex: 1, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed },
  saveBtnTxtSecondary: { fontSize: 14, fontWeight: '600', color: C.text },
});