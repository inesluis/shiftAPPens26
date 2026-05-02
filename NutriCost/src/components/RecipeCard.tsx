import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Recipe } from '../types';
import Card from './Card';
import { C } from '../theme';

const TAG_COLOR: Record<string, string> = {
  Vegan:         C.protein,
  Proteica:     C.carbs,
  Keto:          C.fat,
  Mediterrânea: C.accent,
  'Low Carb':    C.carbs,
  'Sem Glúten': C.protein,
};

interface Props {
  recipe: Recipe;
  onPress?: () => void;
  onLog?: () => void;
}

export default function RecipeCard({ recipe, onPress, onLog }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ marginBottom: 9 }}>
      <Card>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{recipe.name}</Text>
            <Text style={s.sub}>{recipe.mealType} · {recipe.macros.calories} kcal</Text>
          </View>
          <Text style={s.cost}>€{recipe.cost.toFixed(2)}</Text>
        </View>

        <View style={s.macroRow}>
          <Text style={[s.macro, { color: C.protein }]}>P <Text style={s.macroVal}>{recipe.macros.protein}g</Text></Text>
          <Text style={[s.macro, { color: C.carbs }]}>  C <Text style={s.macroVal}>{recipe.macros.carbs}g</Text></Text>
          <Text style={[s.macro, { color: C.fat }]}>  G <Text style={s.macroVal}>{recipe.macros.fat}g</Text></Text>
        </View>

        <View style={s.footer}>
          <View style={s.tags}>
            {recipe.dietTags.slice(0, 2).map(tag => (
              <View key={tag} style={[s.tag, { backgroundColor: (TAG_COLOR[tag] ?? C.accent) + '22' }]}>
                <Text style={[s.tagText, { color: TAG_COLOR[tag] ?? C.accent }]}>{tag}</Text>
              </View>
            ))}
          </View>
          {onLog && (
            <TouchableOpacity style={s.logBtn} onPress={onLog}>
              <Text style={s.logBtnText}>Registar Refeição</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name:      { fontSize: 13, fontWeight: '500', color: C.text },
  sub:       { fontSize: 11, color: C.textSub, marginTop: 1 },
  cost:      { fontSize: 15, fontWeight: '600', color: C.accent },
  macroRow:  { flexDirection: 'row', marginBottom: 9 },
  macro:     { fontSize: 11, fontWeight: '500' },
  macroVal:  { fontWeight: '400', color: C.textSub },
  footer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags:      { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  tagText:   { fontSize: 11, fontWeight: '500' },
  logBtn:    { backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 5 },
  logBtnText:{ fontSize: 11, fontWeight: '500', color: C.text },
});