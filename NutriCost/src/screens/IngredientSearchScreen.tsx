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
import { supabase } from '../supabase';
import { C, R } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'IngredientSearch'>;

type SupabaseProduct = {
  product_id: string | null;
  product_name: string | null;
  product_brand: string | null;
  energy_kcal: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fats: number | null;
  weight: number | null;
};

type SupabaseSupermarket = {
  supermarket_id: number | null;
  supermarket_name: string | null;
};

type PriceRow = {
  ingredient_id: number;
  price: number | null;
  price_per_unit: number | null;
  product: SupabaseProduct | SupabaseProduct[] | null;
  supermarket: SupabaseSupermarket | SupabaseSupermarket[] | null;
};

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
        const search = `%${query}%`;
        const { data: ingredients, error: ingredientError } = await supabase
          .from('dim_ingredient')
          .select('ingredient_id, ingredient_name, ingredient_search_term')
          .or(`ingredient_name.ilike.${search},ingredient_search_term.ilike.${search}`)
          .limit(40);

        if (ingredientError) throw ingredientError;

        const ingredientIds = (ingredients ?? []).map(i => i.ingredient_id);
        if (!ingredientIds.length) {
          if (isMounted) setGroups([]);
          return;
        }

        const ingredientNameById = new Map(
          (ingredients ?? []).map(i => [i.ingredient_id, i.ingredient_name ?? 'Ingredient']),
        );

        const { data: priceRows, error: priceError } = await supabase
          .from('fact_productprice')
          .select('ingredient_id, price, price_per_unit, product:dim_product(product_id, product_name, product_brand, energy_kcal, protein, carbohydrates, fats, weight), supermarket:dim_supermarket(supermarket_id, supermarket_name)')
          .in('ingredient_id', ingredientIds);

        if (priceError) throw priceError;

        const grouped: Record<string, Record<string, Ingredient>> = {};

        ((priceRows ?? []) as unknown as PriceRow[]).forEach(row => {
          const product = firstOrNull(row.product);
          const supermarket = firstOrNull(row.supermarket);
          if (!product || !supermarket) return;

          const store = resolveStore(supermarket.supermarket_name ?? '');
          if (!store) return;

          const ingredientName = ingredientNameById.get(row.ingredient_id) ?? product.product_name ?? 'Ingredient';
          const productId = product.product_id;
          if (!productId) return;

          const pricePerKg = toPricePerKg(row.price, row.price_per_unit, product.weight);
          if (pricePerKg == null) return;

          const macrosPer100g = {
            calories: toPer100g(product.energy_kcal, product.weight),
            protein: toPer100g(product.protein, product.weight),
            carbs: toPer100g(product.carbohydrates, product.weight),
            fat: toPer100g(product.fats, product.weight),
          };

          const brand = product.product_brand ?? product.product_name ?? ingredientName;
          const byIngredient = grouped[ingredientName] ?? (grouped[ingredientName] = {});
          const existing = byIngredient[productId];

          if (existing) {
            const current = existing.prices[store];
            if (current == null || pricePerKg < current) {
              existing.prices[store] = pricePerKg;
            }
            return;
          }

          byIngredient[productId] = {
            id: productId,
            name: ingredientName,
            brand,
            prices: { [store]: pricePerKg },
            macrosPer100g,
          };
        });

        const nextGroups = Object.values(grouped).map(productMap => Object.values(productMap));
        if (isMounted) setGroups(nextGroups);
      } catch {
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
      style={[s.container, { paddingTop: insets.top }]}
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
              <Text style={s.productName}>{items[0].name}</Text>

              {items.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={s.divider} />}
                  <Text style={s.brand}>{item.brand}</Text>

                  {STORES.map((store, i) => {
                    const price = item.prices[store];
                    if (price == null) return null;

                    const isBest = price === best;

                    return (
                      <View key={store}>
                        {/* 👇 Divider between stores */}
                        {i > 0 && <View style={s.rowDivider} />}

                        <TouchableOpacity
                          style={[s.row, isBest && s.rowBest]}
                          onPress={() => handleAdd(item, store)}
                        >
                          <Image source={STORE_META[store].logo} style={s.logo} />

                          <Text style={s.storeName}>
                            {STORE_META[store].label}
                          </Text>

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
              ))}
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
    padding: 14,
    color: C.text,
  },

  brand: { fontSize: 11, color: C.textMuted, paddingHorizontal: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },

  rowBest: {
    backgroundColor: 'rgba(88,196,122,0.08)',
  },

  logo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  storeName: { flex: 1, color: C.text,},

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
    marginVertical: 10,
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
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 14,
  },
});