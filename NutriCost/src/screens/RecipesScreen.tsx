import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import RecipeCard from '../components/RecipeCard';
import MealTypePicker from '../components/MealTypePicker';
import ConfirmModal from '../components/ConfirmModal';
import { DietTag, MealLog, MealType } from '../types';
import { C } from '../theme';
import { RootStackParamList } from '../navigation/types';

const FILTERS: (DietTag | 'Todas')[] = [
  'Todas', 'Vegan', 'Proteica', 'Keto', 'Mediterrânica', 'Low Carb', 'Sem Glúten',
];

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch, todayDate, reloadRecipes } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [active, setActive] = useState<DietTag | 'Todas'>('Todas');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const filtered = useMemo(
    () => active === 'Todas' ? state.recipes : state.recipes.filter(r => r.dietTags.includes(active)),
    [state.recipes, active],
  );

  const handleLog = (recipeId: string) => {
    setPendingRecipeId(recipeId);
    setPickerVisible(true);
  };

  const handleMealSelect = (mealType: MealType) => {
    const recipe = pendingRecipeId ? state.recipes.find(r => r.id === pendingRecipeId) : null;
    if (!recipe) return;
    const log: MealLog = {
      id:         `log_${Date.now()}`,
      date:       todayDate,
      recipeId:   recipe.id,
      recipeName: recipe.name,
      mealType,
      macros:     recipe.macros,
      cost:       recipe.cost,
    };
    dispatch({ type: 'ADD_MEAL_LOG', payload: log });
    setPickerVisible(false);
    setPendingRecipeId(null);
    setSuccessModal({ title: 'Registada!', message: `${recipe.name} adicionada ao registo de ${mealType}.` });
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      await reloadRecipes();
    } catch {
      setErrorModal({ title: 'Erro', message: 'Não foi possível atualizar as receitas.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <View style={s.hdrTop}>
          <View>
            <Text style={s.title}>Receitas</Text>
            <Text style={s.sub}>Receitas adaptadas para cada objetivo</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={handleRefresh} disabled={isRefreshing}>
            <Ionicons name="refresh" size={16} color={C.accent} />
            <Text style={s.refreshTxt}>{isRefreshing ? 'Atualizando…' : 'Atualizar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips} style={s.chipsScroll}
        nestedScrollEnabled
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
          <RecipeCard
            key={r.id}
            recipe={r}
            onLog={() => handleLog(r.id)}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })}
          />
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <MealTypePicker
        visible={pickerVisible}
        onSelect={handleMealSelect}
        onClose={() => { setPickerVisible(false); setPendingRecipeId(null); }}
      />

      {successModal && (
        <ConfirmModal
          visible={true}
          title={successModal.title}
          message={successModal.message}
          confirmText="OK"
          onCancel={() => setSuccessModal(null)}
          onConfirm={() => setSuccessModal(null)}
        />
      )}

      {errorModal && (
        <ConfirmModal
          visible={true}
          title={errorModal.title}
          message={errorModal.message}
          confirmText="OK"
          onCancel={() => setErrorModal(null)}
          onConfirm={() => setErrorModal(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr:       { paddingHorizontal: 16, paddingBottom: 10 },
  hdrTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title:     { fontSize: 21, fontWeight: '600', color: C.text },
  sub:       { fontSize: 12, color: C.textSub, marginTop: 2 },
  refreshBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 0.5, borderColor: C.borderMed },
  refreshTxt:{ fontSize: 12, color: C.accent, fontWeight: '600' },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips:     { paddingHorizontal: 16, paddingBottom: 12, paddingRight: 24, flexDirection: 'row', alignItems: 'center' },
  chip:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: C.borderMed, marginRight: 8, flexShrink: 0 },
  chipOn:    { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt:   { fontSize: 12, fontWeight: '500', color: C.textSub },
  chipTxtOn: { color: '#1A1000' },
  list:      { paddingHorizontal: 16 },
});