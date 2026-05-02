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
import { INGREDIENTS_DB } from '../data/ingredients';
import { MealType, RecipeIngredient, Store } from '../types';

const STORE_LABEL: Record<string, string> = {
    continente: 'Continente',
    pingo_doce: 'Pingo Doce',
    lidl: 'Lidl',
};

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

function calcIngredientCost(weightG: number, pricePerKg: number) {
    return (pricePerKg / 1000) * weightG;
}

function sumMacros(drafts: RecipeIngredient[]) {
    return drafts.reduce(
        (acc, d) => {
            const source = INGREDIENTS_DB.find(i => i.id === d.ingredientId);
            if (!source) return acc;
            const f = d.weightG / 100;
            return {
                calories: acc.calories + source.macrosPer100g.calories * f,
                protein: acc.protein + source.macrosPer100g.protein * f,
                carbs: acc.carbs + source.macrosPer100g.carbs * f,
                fat: acc.fat + source.macrosPer100g.fat * f,
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
    const [mealType, setMealType] = useState<MealType>('Lunch');
    const [instructions, setInstructions] = useState('');
    const [drafts, setDrafts] = useState<RecipeIngredient[]>([]);

    useEffect(() => {
        if (recipe) {
            setMealType(recipe.mealType);
            setInstructions(recipe.instructions ?? '');
            setDrafts(recipe.ingredients);
            setIsEditing(false);
        }
    }, [recipe?.id]);

    useEffect(() => {
        ingredientPicker.set((ingredient, weightG, store) => {
            if (!isEditing) return;
            setDrafts(prev => ([
                ...prev,
                {
                    ingredientId: ingredient.id,
                    name: ingredient.name,
                    brand: ingredient.brand,
                    weightG,
                    selectedStore: store as Store,
                    pricePerKg: ingredient.prices[store as Store] ?? 0,
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
                <Text style={s.sub}>{mealType} · €{totalCost.toFixed(2)}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {isEditing && canEdit && (
                    <>
                        <Text style={s.sectionTitle}>Meal type</Text>
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
                    <Text style={s.sectionTitle}>Ingredients</Text>
                    {recipe.ingredients.length === 0 ? (
                        <Text style={s.muted}>No ingredients listed.</Text>
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
                    <Text style={s.sectionTitle}>Instructions</Text>
                    {isEditing && canEdit ? (
                        <TextInput
                            style={[s.instructionsInput, s.textInput]}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder="Add recipe instructions"
                            placeholderTextColor={C.textMuted}
                            multiline
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text style={recipe.instructions ? s.instructions : s.muted}>
                            {recipe.instructions?.trim() || 'No instructions yet.'}
                        </Text>
                    )}
                </Card>

                {isEditing && canEdit && (
                    <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                        <Text style={s.saveBtnTxt}>Save alterations</Text>
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
