import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { ingredientPicker } from '../utils/ingredientPicker';
import { MealType, RecipeIngredient, Store } from '../types';
import { supabase } from '../supabase';

const STORE_LABEL: Record<Store, string> = {
    continente: 'Continente',
    pingo_doce: 'Pingo Doce',
};

const STORES: Store[] = ['continente', 'pingo_doce'];
const MEAL_TYPES: MealType[] = ['Pequeno-Almoço', 'Almoço', 'Jantar', 'Snack'];

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

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

type IngredientRow = {
    ingredient_id: number;
    ingredient_name: string | null;
};

type RecipeIngredientRow = {
    ingredient_id: number;
    ingredient_quantity: string | null;
};

function calcIngredientCost(weightG: number, pricePerKg: number) {
    return (pricePerKg / 1000) * weightG;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function resolveStore(name: string): Store | null {
    const value = name.toLowerCase();
    if (value.includes('continente')) return 'continente';
    if (value.includes('pingo')) return 'pingo_doce';
    return null;
}

function storeFromProductId(productId: string): Store | null {
    const value = productId.toLowerCase();
    if (value.includes('continente')) return 'continente';
    if (value.includes('pingo')) return 'pingo_doce';
    return null;
}

function parseQuantityToGrams(value?: string | null): number {
    if (!value) return 100;
    const num = parseFloat(value.replace(',', '.').match(/[0-9.]+/)?.[0] ?? '');
    if (!Number.isFinite(num)) return 100;
    const lower = value.toLowerCase();
    if (lower.includes('kg')) return num * 1000;
    if (lower.includes('g')) return num;
    if (lower.includes('ml')) return num;
    return num;
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

function parseCuratedId(id: string) {
    return id.startsWith('c_') ? Number(id.replace('c_', '')) : null;
}

function parseUserId(id: string) {
    return id.startsWith('u_') ? Number(id.replace('u_', '')) : null;
}

function sumMacros(drafts: RecipeIngredient[]) {
    return drafts.reduce(
        (acc, d) => {
            const source = d.macrosPer100g;
            if (!source) return acc;
            const f = d.weightG / 100;
            return {
                calories: acc.calories + source.calories * f,
                protein: acc.protein + source.protein * f,
                carbs: acc.carbs + source.carbs * f,
                fat: acc.fat + source.fat * f,
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { state, updateRecipe } = useApp();
    const recipe = state.recipes.find(r => r.id === route.params.recipeId);
    const canEdit = recipe?.isCustom ?? false;
    const [isEditing, setIsEditing] = useState(false);
    const [mealType, setMealType] = useState<MealType>('Almoço');
    const [instructions, setInstructions] = useState('');
    const [drafts, setDrafts] = useState<RecipeIngredient[]>([]);
    const [storeGroups, setStoreGroups] = useState<Record<Store, RecipeIngredient[]>>({} as Record<Store, RecipeIngredient[]>);
    const [storeTotals, setStoreTotals] = useState<Record<Store, number>>({} as Record<Store, number>);
    const [storeMissing, setStoreMissing] = useState<Record<Store, number>>({} as Record<Store, number>);
    const [bestStore, setBestStore] = useState<Store | null>(null);

    useEffect(() => {
        if (recipe) {
            setMealType(recipe.mealType);
            setInstructions(recipe.instructions ?? '');
            setDrafts(recipe.ingredients);
            setIsEditing(false);
            setStoreGroups({} as Record<Store, RecipeIngredient[]>);
            setStoreTotals({} as Record<Store, number>);
            setStoreMissing({} as Record<Store, number>);
            setBestStore(null);
        }
    }, [recipe?.id]);

    useEffect(() => {
        if (!recipe) return;
        if (recipe.ingredients.length > 0) return;

        const loadIngredients = async () => {
            if (recipe.isCustom) {
                const userRecipeId = parseUserId(recipe.id);
                if (!userRecipeId) return;

                const { data, error } = await supabase
                    .from('fact_user_recipe_product')
                    .select('product_id, quantity_used, quantity_unit, product:dim_product(product_id, product_name, product_brand, energy_kcal, protein, carbohydrates, fats, weight)')
                    .eq('user_recipe_id', userRecipeId);

                if (error || !data) return;

                const productIds = data.map(row => row.product_id).filter(Boolean);
                const { data: prices } = await supabase
                    .from('fact_productprice')
                    .select('product_id, price, price_per_unit, product:dim_product(weight), supermarket:dim_supermarket(supermarket_name)')
                    .in('product_id', productIds);

                const priceMap = new Map<string, number>();
                (prices ?? []).forEach(row => {
                    const product = firstOrNull(row.product);
                    if (!row.product_id || !product) return;
                    const pricePerKg = toPricePerKg(row.price, row.price_per_unit, product.weight);
                    if (pricePerKg == null) return;
                    const existing = priceMap.get(row.product_id);
                    if (existing == null || pricePerKg < existing) {
                        priceMap.set(row.product_id, pricePerKg);
                    }
                });

                const nextDrafts = data.map(row => {
                    const product = firstOrNull(row.product);
                    if (!product) return null;
                    const store = storeFromProductId(row.product_id) ?? 'continente';
                    const weightG = row.quantity_unit === 'kg'
                        ? (row.quantity_used ?? 0) * 1000
                        : (row.quantity_used ?? 0);
                    const pricePerKg = priceMap.get(row.product_id) ?? 0;

                    return {
                        ingredientId: row.product_id,
                        productId: row.product_id,
                        name: product.product_name ?? 'Ingrediente',
                        brand: product.product_brand ?? product.product_name ?? 'Produto',
                        weightG,
                        selectedStore: store,
                        pricePerKg,
                        macrosPer100g: {
                            calories: toPer100g(product.energy_kcal, product.weight),
                            protein: toPer100g(product.protein, product.weight),
                            carbs: toPer100g(product.carbohydrates, product.weight),
                            fat: toPer100g(product.fats, product.weight),
                        },
                    } as RecipeIngredient;
                }).filter(Boolean) as RecipeIngredient[];

                setDrafts(nextDrafts);
                return;
            }

            const curatedId = parseCuratedId(recipe.id);
            if (!curatedId) return;

            const { data: recipeIngredients, error: recipeIngError } = await supabase
                .from('fact_recipeingredient')
                .select('ingredient_id, ingredient_quantity')
                .eq('recipe_id', curatedId);

            if (recipeIngError || !recipeIngredients?.length) return;

            const ingredientIds = Array.from(new Set(recipeIngredients.map(r => r.ingredient_id)));
            const { data: ingredientRows } = await supabase
                .from('dim_ingredient')
                .select('ingredient_id, ingredient_name')
                .in('ingredient_id', ingredientIds);

            const ingredientNameById = new Map(
                (ingredientRows as IngredientRow[] | null ?? []).map(i => [i.ingredient_id, i.ingredient_name ?? 'Ingrediente']),
            );

            const { data: priceRows, error: priceError } = await supabase
                .from('fact_productprice')
                .select('ingredient_id, price, price_per_unit, product:dim_product(product_id, product_name, product_brand, energy_kcal, protein, carbohydrates, fats, weight), supermarket:dim_supermarket(supermarket_id, supermarket_name)')
                .in('ingredient_id', ingredientIds);

            if (priceError || !priceRows) return;

            const bestByIngredientStore = new Map<string, { pricePerKg: number; product: SupabaseProduct }>();

            ((priceRows ?? []) as unknown as PriceRow[]).forEach(row => {
                const product = firstOrNull(row.product);
                const supermarket = firstOrNull(row.supermarket);
                if (!product || !supermarket) return;

                const store = resolveStore(supermarket.supermarket_name ?? '');
                if (!store) return;

                if (!product.product_id) return;
                const pricePerKg = toPricePerKg(row.price, row.price_per_unit, product.weight);
                if (pricePerKg == null) return;

                const key = `${row.ingredient_id}:${store}`;
                const existing = bestByIngredientStore.get(key);
                if (!existing || pricePerKg < existing.pricePerKg) {
                    bestByIngredientStore.set(key, { pricePerKg, product });
                }
            });

            const groupMap: Record<Store, RecipeIngredient[]> = { continente: [], pingo_doce: [] };
            const totalMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };
            const missingMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };

            (recipeIngredients as RecipeIngredientRow[]).forEach(ing => {
                const weightG = parseQuantityToGrams(ing.ingredient_quantity);
                STORES.forEach(store => {
                    const best = bestByIngredientStore.get(`${ing.ingredient_id}:${store}`);
                    if (!best) {
                        missingMap[store] = (missingMap[store] ?? 0) + 1;
                        return;
                    }

                    const product = best.product;
                    const ingredientName = ingredientNameById.get(ing.ingredient_id) ?? product.product_name ?? 'Ingrediente';
                    const item: RecipeIngredient = {
                        ingredientId: String(ing.ingredient_id),
                        productId: product.product_id ?? undefined,
                        name: ingredientName,
                        brand: product.product_brand ?? product.product_name ?? ingredientName,
                        weightG,
                        selectedStore: store,
                        pricePerKg: best.pricePerKg,
                        macrosPer100g: {
                            calories: toPer100g(product.energy_kcal, product.weight),
                            protein: toPer100g(product.protein, product.weight),
                            carbs: toPer100g(product.carbohydrates, product.weight),
                            fat: toPer100g(product.fats, product.weight),
                        },
                    };

                    groupMap[store].push(item);
                    totalMap[store] += calcIngredientCost(weightG, best.pricePerKg);
                });
            });

            const totals = Object.entries(totalMap) as [Store, number][];
            const counts = totals.map(([store]) => ({ store, count: groupMap[store]?.length ?? 0 }));
            const best = totals.reduce<Store | null>((acc, [store, total]) => {
                if (acc == null) return store;
                const accCount = counts.find(c => c.store === acc)?.count ?? 0;
                const curCount = counts.find(c => c.store === store)?.count ?? 0;
                if (curCount !== accCount) return curCount > accCount ? store : acc;
                return total < (totalMap[acc] ?? Infinity) ? store : acc;
            }, null);

            setStoreGroups(groupMap);
            setStoreTotals(totalMap);
            setStoreMissing(missingMap);
            setBestStore(best);
        };

        loadIngredients();
    }, [recipe]);

    useEffect(() => {
        ingredientPicker.set((ingredient, weightG, store) => {
            if (!isEditing) return;
            setDrafts(prev => ([
                ...prev,
                {
                    ingredientId: ingredient.id,
                    productId: ingredient.id,
                    name: ingredient.name,
                    brand: ingredient.brand,
                    weightG,
                    selectedStore: store as Store,
                    pricePerKg: ingredient.prices[store as Store] ?? 0,
                    macrosPer100g: ingredient.macrosPer100g,
                },
            ]));
        });
        return () => ingredientPicker.clear();
    }, [isEditing]);

    if (!recipe) {
        return (
            <View style={[s.container, { paddingTop: insets.top }]}>
                <View style={s.hdr}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Ionicons name="arrow-back" size={14} color={C.accent} />
                        <Text style={s.backTxt}>Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Recipe</Text>
                </View>
                <View style={s.emptyWrap}>
                    <Text style={s.emptyText}>Recipe not found.</Text>
                </View>
            </View>
        );
    }

    const updateWeight = (idx: number, val: string) =>
        setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, weightG: parseInt(val) || 0 } : d));

    const removeIngredient = (idx: number) =>
        setDrafts(prev => prev.filter((_, i) => i !== idx));

    const totalCost = drafts.reduce((sum, d) => sum + calcIngredientCost(d.weightG, d.pricePerKg), 0);
    const bestTotal = bestStore ? (storeTotals[bestStore] ?? totalCost) : totalCost;

    const handleSave = async () => {
        if (!recipe || !canEdit) return;

        const macros = sumMacros(drafts);
        const updated = {
            ...recipe,
            mealType,
            ingredients: drafts,
            cost: parseFloat(totalCost.toFixed(2)),
            macros: {
                calories: Math.round(macros.calories),
                protein: Math.round(macros.protein),
                carbs: Math.round(macros.carbs),
                fat: Math.round(macros.fat),
            },
            instructions: instructions.trim() ? instructions.trim() : undefined,
        };

        try {
            await updateRecipe(updated);
            setIsEditing(false);
        } catch {
            // Keep editing state so user does not lose changes
        }
    };

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <View style={s.hdr}>
                <View style={s.hdrTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Ionicons name="arrow-back" size={14} color={C.accent} />
                        <Text style={s.backTxt}>Back</Text>
                    </TouchableOpacity>
                    {canEdit && (
                        <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(prev => !prev)}>
                            <Ionicons name="pencil" size={15} color={C.accent} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={s.title}>{recipe.name}</Text>
                <Text style={s.sub}>{mealType} · €{bestTotal.toFixed(2)}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {isEditing && canEdit && (
                    <>
                        <Text style={s.sectionTitle}>Tipo de refeicao</Text>
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
                    </>
                )}

                <Card style={{ marginBottom: 12 }}>
                    <Text style={s.sectionTitle}>Ingredientes</Text>
                    {Object.keys(storeGroups).length > 0 ? (
                        (Object.entries(storeGroups) as [Store, RecipeIngredient[]][]).map(([store, items]) => (
                            <View key={store} style={s.storeGroup}>
                                <View style={s.storeHdr}>
                                    <Text style={s.storeTitle}>{STORE_LABEL[store]}</Text>
                                    <View style={s.storeMeta}>
                                        {bestStore === store && (
                                            <View style={s.bestBadge}>
                                                <Text style={s.bestTxt}>MELHOR</Text>
                                            </View>
                                        )}
                                        {storeMissing[store] > 0 && (
                                            <Text style={s.storeMissing}>Faltam {storeMissing[store]}</Text>
                                        )}
                                        <Text style={s.storeCost}>€{(storeTotals[store] ?? 0).toFixed(2)}</Text>
                                    </View>
                                </View>
                                {items.map((ing, idx) => (
                                    <View key={`${ing.ingredientId}-${idx}`} style={s.ingRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.ingName}>{ing.name}</Text>
                                            <Text style={s.ingSub}>
                                                {ing.brand} · {STORE_LABEL[ing.selectedStore]} · {ing.weightG}g
                                            </Text>
                                        </View>
                                        <Text style={s.ingCost}>€{calcIngredientCost(ing.weightG, ing.pricePerKg).toFixed(2)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : recipe.ingredients.length === 0 ? (
                        <Text style={s.muted}>Sem ingredientes listados.</Text>
                    ) : (
                        drafts.map((ing, idx) => (
                            <View key={`${ing.ingredientId}-${idx}`} style={s.ingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.ingName}>{ing.name}</Text>
                                    <Text style={s.ingSub}>
                                        {ing.brand} · {STORE_LABEL[ing.selectedStore] ?? ing.selectedStore} · {ing.weightG}g
                                    </Text>
                                </View>
                                {isEditing ? (
                                    <View style={s.ingEditRight}>
                                        <TextInput
                                            style={s.weightInput}
                                            value={ing.weightG.toString()}
                                            onChangeText={v => updateWeight(idx, v)}
                                            keyboardType="numeric"
                                        />
                                        <TouchableOpacity onPress={() => removeIngredient(idx)}>
                                            <Ionicons name="trash-outline" size={16} color={C.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={s.ingCost}>€{calcIngredientCost(ing.weightG, ing.pricePerKg).toFixed(2)}</Text>
                                )}
                            </View>
                        ))
                    )}

                    {isEditing && canEdit && (
                        <TouchableOpacity
                            style={s.addBtn}
                            onPress={() => navigation.navigate('IngredientSearch', { mode: 'addToRecipe' })}
                        >
                            <Text style={s.addBtnTxt}>+ Add Ingredient</Text>
                        </TouchableOpacity>
                    )}
                </Card>

                <Card>
                    <Text style={s.sectionTitle}>Instrucoes</Text>
                    {isEditing && canEdit ? (
                        <TextInput
                            style={[s.instructionsInput, s.textInput]}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder="Adicionar instrucoes"
                            placeholderTextColor={C.textMuted}
                            multiline
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text style={recipe.instructions ? s.instructions : s.muted}>
                            {recipe.instructions?.trim() || 'Sem instrucoes.'}
                        </Text>
                    )}
                </Card>

                {isEditing && canEdit && (
                    <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                        <Text style={s.saveBtnTxt}>Guardar alteracoes</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    hdr: { paddingHorizontal: 16, paddingBottom: 10 },
    hdrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    backTxt: { fontSize: 12, color: C.accent },
    editBtn: { padding: 6, marginRight: -6 },
    title: { fontSize: 21, fontWeight: '600', color: C.text },
    meta: { fontSize: 12, color: C.textSub, marginTop: 2 },
    sub: { fontSize: 12, color: C.textSub, marginTop: 4 },
    scroll: { paddingHorizontal: 16, paddingBottom: 20 },
    sectionTitle: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.md, borderWidth: 0.5, borderColor: C.borderMed },
    chipOn: { backgroundColor: C.accent, borderColor: C.accent },
    chipTxt: { fontSize: 12, fontWeight: '500', color: C.textSub },
    chipTxtOn: { color: '#1A1000' },
    ingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    ingName: { fontSize: 13, fontWeight: '500', color: C.text },
    ingSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
    ingCost: { fontSize: 12, fontWeight: '600', color: C.accent, marginLeft: 10 },
    storeGroup: { marginBottom: 12 },
    storeHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    storeTitle: { fontSize: 12, fontWeight: '600', color: C.text },
    storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    storeCost: { fontSize: 12, fontWeight: '600', color: C.accent },
    storeMissing: { fontSize: 10, color: C.textSub },
    bestBadge: { backgroundColor: 'rgba(88,196,122,0.2)', paddingHorizontal: 6, borderRadius: 4 },
    bestTxt: { fontSize: 10, color: C.protein, fontWeight: '700' },
    ingEditRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weightInput: { backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: 8, padding: 6, width: 70, fontSize: 12, color: C.text },
    addBtn: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: R.md, padding: 10, alignItems: 'center', marginTop: 6 },
    addBtnTxt: { fontSize: 13, fontWeight: '500', color: C.text },
    instructions: { fontSize: 12, color: C.text, lineHeight: 18 },
    instructionsInput: { minHeight: 100 },
    textInput: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: R.md, padding: 10, fontSize: 12, color: C.text },
    muted: { fontSize: 12, color: C.textSub },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 12, color: C.textSub },
    saveBtn: { backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center', marginTop: 12 },
    saveBtnTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
});
