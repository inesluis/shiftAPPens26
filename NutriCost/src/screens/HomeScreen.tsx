import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { HomeScreenProps } from '../navigation/types';
import { C, R, MEAL_COLOR } from '../theme';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { getTodayLogs, state } = useApp();
  const todayLogs = getTodayLogs();

  const totalCal  = todayLogs.reduce((a, l) => a + l.macros.calories, 0);
  const totalCost = todayLogs.reduce((a, l) => a + l.cost, 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <View style={s.hdr}>
        <Text style={s.greeting}>{greeting()}</Text>
        <Text style={s.name}>{state.profile.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Summary */}
        <Card style={{ marginBottom: 14 }}>
          <View style={s.row}>
            <View>
              <Text style={s.slabel}>Today</Text>
              <Text style={s.bigNum}>{Math.round(totalCal)} <Text style={s.unit}>kcal</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.slabel}>Spent</Text>
              <Text style={[s.bigNum, { color: C.accent }]}>€{totalCost.toFixed(2)}</Text>
            </View>
          </View>
        </Card>

        {/* Price search */}
        <Text style={s.sectionLabel}>Compare Prices</Text>
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.navigate('IngredientSearch', { mode: 'search' })}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={15} color={C.textMuted} />
          <Text style={s.searchPH}>Search ingredients…</Text>
        </TouchableOpacity>

        {/* Quick actions */}
        <Text style={s.sectionLabel}>Quick Actions</Text>
        <View style={s.grid}>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('Recipes')} activeOpacity={0.75}>
            <Ionicons name="document-text-outline" size={22} color={C.accent} style={{ marginBottom: 9 }} />
            <Text style={s.actionTitle}>Browse Recipes</Text>
            <Text style={s.actionSub}>Curated meals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => navigation.navigate('CreateRecipe')} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={22} color={C.protein} style={{ marginBottom: 9 }} />
            <Text style={s.actionTitle}>New Recipe</Text>
            <Text style={s.actionSub}>Build your own</Text>
          </TouchableOpacity>
        </View>

        {/* Today's meals */}
        {todayLogs.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Today's Meals</Text>
            {todayLogs.map(log => (
              <Card key={log.id} style={{ marginBottom: 8 }}>
                <View style={s.logRow}>
                  <View style={[s.logIcon, { backgroundColor: (MEAL_COLOR[log.mealType] ?? C.accent) + '18' }]}>
                    <Ionicons name="time-outline" size={16} color={MEAL_COLOR[log.mealType] ?? C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logType}>{log.mealType}</Text>
                    <Text style={s.logName}>{log.recipeName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.logKcal}>{log.macros.calories} kcal</Text>
                    <Text style={s.logCost}>€{log.cost.toFixed(2)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  hdr:         { paddingHorizontal: 16, paddingBottom: 10 },
  greeting:    { fontSize: 11, color: C.textSub },
  name:        { fontSize: 21, fontWeight: '600', color: C.text, marginTop: 1 },
  scroll:      { padding: 16, paddingTop: 0 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slabel:      { fontSize: 10, color: C.textSub, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  bigNum:      { fontSize: 22, fontWeight: '600', color: C.text },
  unit:        { fontSize: 13, color: C.textSub, fontWeight: '400' },
  sectionLabel:{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', borderRadius: R.md, padding: 10, gap: 8, marginBottom: 14 },
  searchPH:    { fontSize: 13, color: C.textMuted },
  grid:        { flexDirection: 'row', gap: 9, marginBottom: 14 },
  actionCard:  { flex: 1, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: R.lg, padding: 15 },
  actionTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  actionSub:   { fontSize: 11, color: C.textSub, marginTop: 2 },
  logRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logType:     { fontSize: 11, color: C.textSub, fontWeight: '500' },
  logName:     { fontSize: 13, fontWeight: '500', color: C.text, marginTop: 1 },
  logKcal:     { fontSize: 12, fontWeight: '500', color: C.text },
  logCost:     { fontSize: 11, color: C.accent },
});