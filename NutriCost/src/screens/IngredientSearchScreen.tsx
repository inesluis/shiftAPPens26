import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { INGREDIENTS_DB } from '../data/ingredients';
import { Ingredient, Store } from '../types';
import Card from '../components/Card';
import { ingredientPicker } from '../utils/ingredientPicker';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientSearch'>;

const STORE_LABEL: Record<Store, string> = {
  continente: 'Continente',
  pingo_doce: 'Pingo Doce',
  lidl:       'Lidl',
};
const STORES: Store[] = ['continente', 'pingo_doce', 'lidl'];

// Group ingredients by canonical name
const GROUPS = INGREDIENTS_DB.reduce<Record<string, Ingredient[]>>((acc, ing) => {
  const k = ing.name.toLowerCase();
  acc[k] = [...(acc[k] ?? []), ing];
  return acc;
}, {});

function cheapestStore(ing: Ingredient): Store | null {
  const entries = Object.entries(ing.prices) as [Store, number][];
  if (!entries.length) return null;
  return entries.reduce((a, b) => a[1] < b[1] ? a : b)[0];
}

export default function IngredientSearchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const isAddMode = route.params?.mode === 'addToRecipe';

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return Object.entries(GROUPS)
      .filter(([k]) => k.includes(q) || q.includes(k.split(' ')[0]))
      .map(([, items]) => items);
  }, [query]);

  const handleAdd = (ing: Ingredient) => {
    const store = cheapestStore(ing) ?? 'continente';
    ingredientPicker.call(ing, 100, store);
    navigation.goBack();
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
        <Text style={s.title}>Compare Prices</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Coconut milk, salmon, rice…"
          placeholderTextColor={C.textMuted}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cart-outline" size={34} color={C.textMuted} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTxt}>
              {query.length < 2
                ? 'Search to compare prices\nacross Continente, Pingo Doce & Lidl'
                : `No results for "${query}"`}
            </Text>
          </View>
        )}

        {results.map((items, gi) => (
          <Card key={gi} style={{ marginBottom: 10 }}>
            <Text style={s.productName}>{items[0].name}</Text>
            {items.map(item => {
              const cheap = cheapestStore(item);
              return (
                <View key={item.id} style={{ marginBottom: 10 }}>
                  <Text style={s.brand}>{item.brand}</Text>
                  <View style={s.priceRow}>
                    {STORES.map(store => {
                      const price = item.prices[store];
                      const isBest = cheap === store && price != null;
                      return (
                        <View key={store} style={[s.cell, isBest && s.cellBest]}>
                          <Text style={s.storeLabel}>{STORE_LABEL[store]}</Text>
                          {price != null ? (
                            <>
                              <Text style={[s.price, isBest && { color: C.protein }]}>
                                €{price.toFixed(2)}
                              </Text>
                              {isBest && <Text style={s.best}>BEST</Text>}
                            </>
                          ) : (
                            <Text style={s.na}>—</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {isAddMode && (
                    <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(item)}>
                      <Text style={s.addBtnTxt}>+ Add to Recipe</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </Card>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  hdr:         { paddingHorizontal: 16, paddingBottom: 8 },
  back:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  backTxt:     { fontSize: 12, color: C.accent },
  title:       { fontSize: 21, fontWeight: '600', color: C.text },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', borderRadius: R.md, padding: 10, gap: 8, marginHorizontal: 16, marginBottom: 14 },
  input:       { flex: 1, fontSize: 13, color: C.text },
  list:        { paddingHorizontal: 16 },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyTxt:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  productName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 10 },
  brand:       { fontSize: 12, color: C.textSub, marginBottom: 8 },
  priceRow:    { flexDirection: 'row', gap: 6, marginBottom: 8 },
  cell:        { flex: 1, backgroundColor: C.surface2, borderRadius: 9, padding: 8, alignItems: 'center', borderWidth: 0.5, borderColor: 'transparent' },
  cellBest:    { borderColor: 'rgba(88,196,122,0.4)' },
  storeLabel:  { fontSize: 9, fontWeight: '600', color: C.textMuted, marginBottom: 4 },
  price:       { fontSize: 14, fontWeight: '600', color: C.text },
  best:        { fontSize: 9, color: C.protein, fontWeight: '600', marginTop: 2 },
  na:          { fontSize: 13, color: C.textMuted },
  addBtn:      { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: 8, padding: 8, alignItems: 'center' },
  addBtnTxt:   { fontSize: 12, fontWeight: '500', color: C.text },
});