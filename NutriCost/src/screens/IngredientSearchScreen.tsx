import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ingredient, Store } from '../types';
import Card from '../components/Card';
import { ingredientPicker } from '../utils/ingredientPicker';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { API_BASE_URL } from '../config';

type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientSearch'>;

// ─── Store metadata with logos ───────────────────────────────────────────────
const STORE_META: Record<Store, { label: string; logo: any }> = {
  continente: { label: 'Continente', logo: require('../../assets/supermarkets/continente.png') },
  pingo_doce: { label: 'Pingo Doce', logo: require('../../assets/supermarkets/pingoDoce.png') },
};

const STORES: Store[] = ['continente', 'pingo_doce'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function resolveStore(name: string): Store | null {
  const value = name.toLowerCase();
  if (value.includes('continente')) return 'continente';
  if (value.includes('pingo')) return 'pingo_doce';
  return null;
}

function toPer100g(value?: number | null, weight?: number | null) {
  if (value == null) return 0;
  if (weight && weight > 0) return (value / weight) * 100;
  return value;
}

function toPricePerKg(price?: number | null, pricePerUnit?: number | null, weight?: number | null) {
  if (pricePerUnit && pricePerUnit > 0) return pricePerUnit;
  if (price && weight && weight > 0) return (price / weight) * 1000;
  return null;
}

// The API's /ingredients/compare endpoint incorrectly applies
// (nutrientPer100g / weight_stored) * 100, treating weight_stored as grams
// when it may be stored in kg. The correct per-100g value is recovered with:
//   correct = api_value * weight_stored / 100
// If the API doesn't return `weight`, we default to 1 (covers 1 kg / 1 L products).
function normalizeMacros(raw: any): Macros {
  const w: number = typeof raw.weight === 'number' && raw.weight > 0 ? raw.weight : 1;
  const fix = (v: number | null | undefined) =>
    typeof v === 'number' ? (v * w) / 100 : 0;
  return {
    calories: fix(raw.macrosPer100g?.calories),
    protein:  fix(raw.macrosPer100g?.protein),
    carbs:    fix(raw.macrosPer100g?.carbs),
    fat:      fix(raw.macrosPer100g?.fat),
  };
}

function cheapestPrice(items: Ingredient[]): number | null {
  const prices = items.flatMap(i =>
    (Object.entries(i.prices) as [Store, number][]).map(([, p]) => p),
  );
  return prices.length ? Math.min(...prices) : null;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function IngredientSearchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<Ingredient[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isAddMode = route.params?.mode === 'addToRecipe';

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (query.length < 2) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/ingredients/compare?term=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch ingredients');
        const rawGroups: any[][] = await response.json();
        // Normalize macros: the API misapplies a per-100g transformation using the
        // stored product weight, so we reverse it here (see normalizeMacros above).
        const nextGroups: Ingredient[][] = rawGroups.map(group =>
          group.map(raw => ({
            ...raw,
            macrosPer100g: normalizeMacros(raw),
          }))
        );
        
        if (isMounted) setGroups(nextGroups);
      } catch (err) {
        console.error('Ingredient search error:', err);
        if (isMounted) setGroups([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [query]);

  
  const handleAdd = (ing: Ingredient, store: Store) => {
    ingredientPicker.call(ing, 100, store);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={14} color={C.accent} />
          <Text style={s.backTxt}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Comparar Preços</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Arroz, salmão, leite..."
          placeholderTextColor={C.textMuted}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cart-outline" size={34} color={C.textMuted} />
            <Text style={s.emptyTxt}>
              {query.length < 2
                ? 'Procure um ingrediente para comparar preços'
                : isLoading
                  ? 'A carregar resultados...'
                  : `Sem resultados para "${query}"`}
            </Text>
          </View>
        )}

        {groups.map((items, gi) => {
          const best = cheapestPrice(items);

          return (
            <Card key={gi} style={s.groupCard}>
              <Text style={s.productName}>{items[0].name.charAt(0).toUpperCase() + items[0].name.slice(1)}</Text>

              {items.map((item, idx) => {
                const availableStores = STORES.filter(store => item.prices[store] != null);
                
                return (
                  <View key={item.id}>
                    {availableStores.map((store, renderedIdx) => {
                      const price = item.prices[store] ?? 0;
                      const isBest = price === best;

                      return (
                        <View key={store} style={{ width: '100%' }}>
                          {/* 👇 Divider between stores */}
                          {renderedIdx > 0 && <View style={s.rowDivider} />}

                          <TouchableOpacity
                            style={[s.row, isBest && s.rowBest]}
                            onPress={() => handleAdd(item, store)}
                          >
                            <Image source={STORE_META[store].logo} style={s.logo} />

                            <View style={s.storeName}>
                              <Text style={s.productNameRow} numberOfLines={1}>
                                {item.productName}
                              </Text>
                              <Text style={s.brandRow} numberOfLines={1}>
                                {item.brand}
                              </Text>
                            </View>

                            <View style={s.priceWrap}>
                              {isBest && (
                                <View style={s.bestBadge}>
                                  <Text style={s.bestTxt}>MELHOR</Text>
                                </View>
                              )}
                              <Text style={[s.price, isBest && s.priceBest]}>
                                €{price.toFixed(2)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </Card>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backTxt: { fontSize: 12, color: C.accent },
  title: { fontSize: 21, fontWeight: '600', color: C.text },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 10,
    margin: 16,
  },

  list: { paddingHorizontal: 16 },

  groupCard: { marginBottom: 12 },

  productName: {
    fontSize: 14,
    fontWeight: '700',
    paddingLeft: 0,
    paddingRight: 14,
    paddingVertical: 10,
    color: C.text,
  },

  brand: { fontSize: 11, color: C.textMuted, paddingHorizontal: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginHorizontal: -14,
  },

  rowBest: {
    backgroundColor: 'rgba(88,196,122,0.08)',
  },

  logo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  storeName: { 
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },

  productNameRow: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },

  brandRow: {
    fontSize: 11,
    color: C.textMuted,
  },

  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  price: { fontWeight: '600', color: C.text },

  priceBest: { color: C.protein },

  bestBadge: {
    backgroundColor: 'rgba(88,196,122,0.2)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  bestTxt: {
    fontSize: 10,
    color: C.protein,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 4,
    marginHorizontal: -14,
  },
  input: {
  flex: 1,
  fontSize: 13,
  color: C.text,
},

  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyTxt: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 10,
},

  rowDivider: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#ffffff',
    marginHorizontal: -14,
    marginVertical: 0,
  },
});