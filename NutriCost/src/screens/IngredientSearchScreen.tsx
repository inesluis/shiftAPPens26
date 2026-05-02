import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
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

// ─── Store metadata with logos ───────────────────────────────────────────────
const STORE_META: Record<Store, { label: string; logo: any }> = {
  continente: { label: 'Continente', logo: require('../../assets/supermarkets/continente.png') },
  pingo_doce: { label: 'Pingo Doce', logo: require('../../assets/supermarkets/pingoDoce.png') },
};

const STORES: Store[] = ['continente', 'pingo_doce'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GROUPS = INGREDIENTS_DB.reduce<Record<string, Ingredient[]>>((acc, ing) => {
  const k = ing.name.toLowerCase();
  acc[k] = [...(acc[k] ?? []), ing];
  return acc;
}, {});

function cheapestPrice(items: Ingredient[]): number | null {
  const prices = items.flatMap(i =>
    (Object.entries(i.prices) as [Store, number][]).map(([, p]) => p),
  );
  return prices.length ? Math.min(...prices) : null;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
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
        {results.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cart-outline" size={34} color={C.textMuted} />
            <Text style={s.emptyTxt}>
              {query.length < 2
                ? 'Digite para comparar preços'
                : `Sem resultados para"${query}"`}
            </Text>
          </View>
        )}

        {results.map((items, gi) => {
          const best = cheapestPrice(items);

          return (
            <Card key={gi} style={s.groupCard}>
              <Text style={s.productName}>{items[0].name}</Text>

              {items.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={s.divider} />}
                  <Text style={s.brand}>{item.brand}</Text>

                  {STORES.map(store => {
                    const price = item.prices[store];
                    if (price == null) return null;

                    const isBest = price === best;

                    return (
                      <TouchableOpacity
                        key={store}
                        style={[s.row, isBest && s.rowBest]}
                        onPress={() => handleAdd(item, store)}
                      >
                        {/* 🔥 LOGO */}
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
});