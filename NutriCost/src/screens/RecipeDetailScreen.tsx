import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';

const STORE_LABEL: Record<string, string> = {
    continente: 'Continente',
    pingo_doce: 'Pingo Doce',
    lidl: 'Lidl',
};

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

function calcIngredientCost(weightG: number, pricePerKg: number) {
    return (pricePerKg / 1000) * weightG;
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const { state } = useApp();
    const recipe = state.recipes.find(r => r.id === route.params.recipeId);

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

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <View style={s.hdr}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Ionicons name="arrow-back" size={14} color={C.accent} />
                    <Text style={s.backTxt}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>{recipe.name}</Text>
                <Text style={s.sub}>{recipe.mealType} · €{recipe.cost.toFixed(2)}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Card style={{ marginBottom: 12 }}>
                    <Text style={s.sectionTitle}>Ingredients</Text>
                    {recipe.ingredients.length === 0 ? (
                        <Text style={s.muted}>No ingredients listed.</Text>
                    ) : (
                        recipe.ingredients.map((ing, idx) => (
                            <View key={`${ing.ingredientId}-${idx}`} style={s.ingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.ingName}>{ing.name}</Text>
                                    <Text style={s.ingSub}>
                                        {ing.brand} · {STORE_LABEL[ing.selectedStore] ?? ing.selectedStore} · {ing.weightG}g
                                    </Text>
                                </View>
                                <Text style={s.ingCost}>€{calcIngredientCost(ing.weightG, ing.pricePerKg).toFixed(2)}</Text>
                            </View>
                        ))
                    )}
                </Card>

                <Card>
                    <Text style={s.sectionTitle}>Instructions</Text>
                    <Text style={recipe.instructions ? s.instructions : s.muted}>
                        {recipe.instructions?.trim() || 'No instructions yet.'}
                    </Text>
                </Card>

                <View style={{ height: 24 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    hdr: { paddingHorizontal: 16, paddingBottom: 10 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    backTxt: { fontSize: 12, color: C.accent },
    title: { fontSize: 21, fontWeight: '600', color: C.text },
    sub: { fontSize: 12, color: C.textSub, marginTop: 4 },
    scroll: { paddingHorizontal: 16, paddingBottom: 20 },
    sectionTitle: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
    ingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    ingName: { fontSize: 13, fontWeight: '500', color: C.text },
    ingSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
    ingCost: { fontSize: 12, fontWeight: '600', color: C.accent, marginLeft: 10 },
    instructions: { fontSize: 12, color: C.text, lineHeight: 18 },
    muted: { fontSize: 12, color: C.textSub },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 12, color: C.textSub },
});
