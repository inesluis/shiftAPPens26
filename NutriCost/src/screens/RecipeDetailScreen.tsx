import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import AISuggestionsModal from '../components/AISuggestionsModal';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { ingredientPicker } from '../utils/ingredientPicker';
import { MealType, RecipeIngredient, Store, MealLog, DietTag } from '../types';
import MealTypePicker from '../components/MealTypePicker';
import ConfirmModal from '../components/ConfirmModal';

const API_BASE_URL = 'http://192.168.20.79:8080/jakartApp/api';

const STORE_LABEL: Record<Store, string> = {
    continente: 'Continente',
    pingo_doce: 'Pingo Doce',
};

const STORES: Store[] = ['continente', 'pingo_doce'];
const DIET_TAGS: DietTag[] = ['Vegan', 'Proteica', 'Keto', 'Mediterrânica', 'Low Carb', 'Sem Glúten'];

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
    return pricePerKg;
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
                calories: acc.calories + (source.calories ?? 0) * f,
                protein: acc.protein + (source.protein ?? 0) * f,
                carbs: acc.carbs + (source.carbs ?? 0) * f,
                fat: acc.fat + (source.fat ?? 0) * f,
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { state, updateRecipe, deleteRecipe, dispatch, todayDate } = useApp();
    const recipe = state.recipes.find(r => r.id === route.params.recipeId);
    const canEdit = recipe?.isCustom ?? false;
    const [isEditing, setIsEditing] = useState(false);
    const [mealType, setMealType] = useState<MealType>('Almoço');
    const [tags, setTags] = useState<DietTag[]>([]);
    const [instructions, setInstructions] = useState('');
    const [drafts, setDrafts] = useState<RecipeIngredient[]>([]);
    const [storeGroups, setStoreGroups] = useState<Record<Store, RecipeIngredient[]>>({} as Record<Store, RecipeIngredient[]>);
    const [storeTotals, setStoreTotals] = useState<Record<Store, number>>({} as Record<Store, number>);
    const [storeMissing, setStoreMissing] = useState<Record<Store, number>>({} as Record<Store, number>);
    const [bestStore, setBestStore] = useState<Store | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [deleteVisible, setDeleteVisible] = useState(false);
    const [aiModalVisible, setAiModalVisible] = useState(false);

    useEffect(() => {
        if (recipe) {
            setMealType(recipe.mealType);
            setTags(recipe.dietTags);
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
            const numericId = recipe.isCustom ? parseUserId(recipe.id) : parseCuratedId(recipe.id);
            if (!numericId) return;

            try {
                if (recipe.isCustom) {
                    const response = await fetch(`${API_BASE_URL}/recipes/${numericId}?isCustom=true`);
                    if (!response.ok) throw new Error('Failed to fetch recipe details');
                    const data = await response.json();

                    // For custom recipes, we also need costs to get some ingredient info
                    const costRes = await fetch(`${API_BASE_URL}/user-recipes/${numericId}/costs`);
                    const costData = await costRes.json();

                    const groupMap: Record<Store, RecipeIngredient[]> = { continente: [], pingo_doce: [] };
                    const totalMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };
                    const missingMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };

                    (costData || []).forEach((cost: any) => {
                        const store = resolveStore(cost.supermarketName);
                        if (!store) return;
                        totalMap[store] = cost.totalCost;
                        missingMap[store] = cost.missingIngredientsCount;

                        if (cost.selectedProducts) {
                            groupMap[store] = cost.selectedProducts.map((p: any) => ({
                                ingredientId: String(p.ingredientId),
                                name: p.productName || p.ingredientName || 'Desconhecido',
                                brand: p.productBrand || '',
                                weightG: 100, // Fallback since weight isn't in cost API
                                selectedStore: store,
                                pricePerKg: p.selectedPrice, 
                                macrosPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                            }));
                        }
                    });

                    // Use the products from the first store as drafts
                    const firstStore = (Object.keys(groupMap) as Store[]).find(s => groupMap[s].length > 0);
                    if (firstStore) {
                        setDrafts(groupMap[firstStore]);
                    }

                    setStoreTotals(totalMap);
                    setStoreMissing(missingMap);
                    setStoreGroups(groupMap);
                    if (costData?.[0]) setBestStore(resolveStore(costData[0].supermarketName));

                } else {
                    // Curated Recipe Path
                    const [recipeRes, ingRes, costRes] = await Promise.all([
                        fetch(`${API_BASE_URL}/recipes/${numericId}`),
                        fetch(`${API_BASE_URL}/recipe-ingredients/recipe/${numericId}`),
                        fetch(`${API_BASE_URL}/recipes/${numericId}/costs/detailed`)
                    ]);

                    if (!recipeRes.ok || !ingRes.ok || !costRes.ok) throw new Error('Failed to fetch recipe components');

                    const recipeData = await recipeRes.json();
                    const ingData = await ingRes.json();
                    const costData = await costRes.json();

                    setInstructions(recipeData.instructions || '');

                    const quantities: Record<string, number> = {};
                    ingData.forEach((i: any) => {
                        quantities[String(i.ingredientId)] = parseQuantityToGrams(i.ingredientQuantity);
                    });

                    const groupMap: Record<Store, RecipeIngredient[]> = { continente: [], pingo_doce: [] };
                    const totalMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };
                    const missingMap: Record<Store, number> = { continente: 0, pingo_doce: 0 };

                    (costData || []).forEach((cost: any) => {
                        const store = resolveStore(cost.supermarketName);
                        if (!store) return;
                        totalMap[store] = cost.totalCost;
                        missingMap[store] = cost.missingIngredients;

                        if (cost.selectedProducts) {
                            groupMap[store] = cost.selectedProducts.map((p: any) => {
                                const weightG = quantities[String(p.ingredientId)] || 100;
                                return {
                                    ingredientId: String(p.ingredientId),
                                    name: p.productName || 'Desconhecido',
                                    brand: p.productBrand || '',
                                    weightG: weightG,
                                    selectedStore: store,
                                    pricePerKg: p.selectedPrice,
                                };
                            });
                        }
                    });

                    // Use the best store's products for the general list
                    const best = costData[0];
                    if (best) {
                        const store = resolveStore(best.supermarketName);
                        if (store) {
                            setBestStore(store);
                            setDrafts(groupMap[store]);
                        }
                    }

                    setStoreTotals(totalMap);
                    setStoreMissing(missingMap);
                    setStoreGroups(groupMap);
                }
            } catch (err) {
                console.error('Recipe detail load error:', err);
            }
        };

        loadIngredients();
    }, [recipe?.id]);

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
            <View style={[s.container, { paddingTop: insets.top + 20 }]}>
                <View style={s.hdr}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Ionicons name="arrow-back" size={14} color={C.accent} />
                        <Text style={s.backTxt}>Voltar</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Receita</Text>
                </View>
                <View style={s.emptyWrap}>
                    <Text style={s.emptyText}>Receita não encontrada.</Text>
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
            dietTags: tags,
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

    const handleLogMeal = (selectedMealType: MealType) => {
        if (!recipe) return;
        const log: MealLog = {
            id:         `log_${Date.now()}`,
            date:       todayDate,
            recipeId:   recipe.id,
            recipeName: recipe.name,
            mealType:   selectedMealType,
            macros:     recipe.macros,
            cost:       recipe.cost,
        };
        dispatch({ type: 'ADD_MEAL_LOG', payload: log });
        setPickerVisible(false);
    };

    const handleDelete = async () => {
        if (!recipe) return;
        try {
            await deleteRecipe(recipe.id);
            setDeleteVisible(false);
            navigation.goBack();
        } catch {
            // Error handling
        }
    };

    const toggleTag = (tag: DietTag) =>
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    return (
        <View style={[s.container, { paddingTop: insets.top + 20 }]}>
            <View style={s.hdr}>
                <View style={s.hdrTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Ionicons name="arrow-back" size={14} color={C.accent} />
                        <Text style={s.backTxt}>Voltar</Text>
                    </TouchableOpacity>
                    {canEdit && (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(prev => !prev)}>
                                <Ionicons name="pencil" size={15} color={C.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity style={s.editBtn} onPress={() => setDeleteVisible(true)}>
                                <Ionicons name="trash-outline" size={16} color={C.danger} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <Text style={s.title}>{recipe.name}</Text>
                <Text style={s.sub}>€{bestTotal.toFixed(2)}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {isEditing && canEdit && (
                    <>
                        <Text style={s.sectionTitle}>Tipo de dieta</Text>
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
                    </>
                )}

                <Card style={{ marginBottom: 12 }}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Ingredientes</Text>
                    </View>
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
                            <Text style={s.addBtnTxt}>+ Adicionar ingrediente</Text>
                        </TouchableOpacity>
                    )}
                </Card>

                <Card>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Instruções</Text>
                        {recipe.isCustom && (
                            <TouchableOpacity onPress={() => setAiModalVisible(true)} activeOpacity={0.7}>
                                <Ionicons name="sparkles" size={16} color={C.accent} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isEditing && canEdit ? (
                        <TextInput
                            style={[s.instructionsInput, s.textInput]}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder="Adicionar instruções"
                            placeholderTextColor={C.textMuted}
                            multiline
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text style={recipe.instructions ? s.instructions : s.muted}>
                            {recipe.instructions?.trim() || 'Sem instruções.'}
                        </Text>
                    )}
                </Card>

                {isEditing && canEdit && (
                    <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                        <Text style={s.saveBtnTxt}>Guardar alterações</Text>
                    </TouchableOpacity>
                )}

                {!isEditing && (
                    <TouchableOpacity style={s.logBtn} onPress={() => setPickerVisible(true)}>
                        <Text style={s.logBtnTxt}>Registar Refeição</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

            <MealTypePicker
                visible={pickerVisible}
                onSelect={handleLogMeal}
                onClose={() => setPickerVisible(false)}
            />

            <ConfirmModal
                visible={deleteVisible}
                title="Eliminar Receita"
                message={`Tem a certeza que deseja eliminar "${recipe.name}"? Esta ação não pode ser desfeita.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteVisible(false)}
            />

            <AISuggestionsModal
                visible={aiModalVisible}
                recipeName={recipe.name}
                ingredients={drafts.map(d => ({ name: d.name, weightG: d.weightG }))}
                onClose={() => setAiModalVisible(false)}
                onApply={(suggestionInstructions) => setInstructions(suggestionInstructions)}
            />
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
    sectionTitle: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
    logBtn: { backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center', marginTop: 12 },
    logBtnTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
});