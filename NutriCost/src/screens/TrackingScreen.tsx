import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import MacroRing from '../components/MacroRing';
import MacroBar from '../components/MacroBar';
import WeeklyBudgetChart from '../components/WeeklyBudgetChart';
import { MealType } from '../types';
import { C, MEAL_COLOR } from '../theme';

const MEAL_ICON: Record<MealType, string> = {
  Breakfast: 'sunny-outline',
  Lunch:     'partly-sunny-outline',
  Dinner:    'moon-outline',
  Snack:     'nutrition-outline',
};

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch, getTodayLogs, getWeekLogs, getDailyBudget } = useApp();
  const todayLogs  = getTodayLogs();
  const weekLogs   = getWeekLogs();
  const dailyLimit = getDailyBudget();
  const { macroGoals } = state.profile;

  const todayMacros = todayLogs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.macros.calories,
      protein:  acc.protein  + l.macros.protein,
      carbs:    acc.carbs    + l.macros.carbs,
      fat:      acc.fat      + l.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const todayCost   = todayLogs.reduce((a, l) => a + l.cost, 0);
  const budgetPct   = Math.min(todayCost / dailyLimit, 1);
  const overBudget  = todayCost > dailyLimit;
  const loggedTypes = new Set(todayLogs.map(l => l.mealType));

  const removeLog = (id: string) =>
    Alert.alert('Remove meal', 'Remove this from today\'s log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'REMOVE_MEAL_LOG', payload: id }) },
    ]);

  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Today's Log</Text>
        <Text style={s.sub}>{today}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Macros */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={s.slabel}>Macros</Text>
          <View style={s.macroSection}>
            <MacroRing calories={todayMacros.calories} goalCalories={macroGoals.calories} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <MacroBar label="Protein" value={todayMacros.protein} goal={macroGoals.protein} unit="g" color={C.protein} />
              <MacroBar label="Carbs"   value={todayMacros.carbs}   goal={macroGoals.carbs}   unit="g" color={C.carbs} />
              <MacroBar label="Fat"     value={todayMacros.fat}     goal={macroGoals.fat}     unit="g" color={C.fat} />
            </View>
          </View>
        </Card>

        {/* Meal logs */}
        <Text style={s.slabel}>Meals Logged</Text>
        {todayLogs.length === 0 && (
          <Card style={{ marginBottom: 10, alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 13, color: C.textMuted }}>No meals logged yet today</Text>
          </Card>
        )}
        {todayLogs.map(log => (
          <Card key={log.id} style={{ marginBottom: 8 }}>
            <View style={s.logRow}>
              <View style={[s.logIcon, { backgroundColor: (MEAL_COLOR[log.mealType] ?? C.accent) + '18' }]}>
                <Ionicons name={MEAL_ICON[log.mealType] as any} size={16} color={MEAL_COLOR[log.mealType] ?? C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.logType}>{log.mealType}</Text>
                <Text style={s.logName}>{log.recipeName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.logKcal}>{log.macros.calories} kcal</Text>
                <Text style={s.logCost}>€{log.cost.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeLog(log.id)} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={14} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Add missing meals */}
        <View style={s.addRow}>
          {(['Breakfast','Lunch','Dinner','Snack'] as MealType[])
            .filter(mt => !loggedTypes.has(mt))
            .map(mt => (
              <TouchableOpacity key={mt} style={s.addMealBtn}>
                <Text style={s.addMealTxt}>+ {mt}</Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Budget */}
        <Text style={[s.slabel, { marginTop: 4 }]}>Budget</Text>
        <Card style={{ marginBottom: 12 }}>
          <View style={s.budgetRow}>
            <View>
              <Text style={s.slabel}>Spent Today</Text>
              <Text style={[s.bigNum, { color: C.accent }]}>€{todayCost.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.slabel}>Daily Limit</Text>
              <Text style={[s.bigNum, { color: C.textMuted }]}>€{dailyLimit.toFixed(2)}</Text>
            </View>
          </View>
          <View style={s.budgetTrack}>
            <View style={[s.budgetFill, { width: `${budgetPct * 100}%`, backgroundColor: overBudget ? C.danger : C.accent }]} />
          </View>
          <Text style={s.budgetSub}>
            {overBudget
              ? `€${(todayCost - dailyLimit).toFixed(2)} over budget`
              : `€${(dailyLimit - todayCost).toFixed(2)} remaining today`}
          </Text>
        </Card>

        {/* Weekly chart */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={s.slabel}>Weekly Spending</Text>
          <WeeklyBudgetChart logs={weekLogs} dailyLimit={dailyLimit} />
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  hdr:         { paddingHorizontal: 16, paddingBottom: 10 },
  title:       { fontSize: 21, fontWeight: '600', color: C.text },
  sub:         { fontSize: 12, color: C.textSub, marginTop: 2 },
  scroll:      { padding: 16, paddingTop: 0 },
  slabel:      { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
  macroSection:{ flexDirection: 'row', alignItems: 'center' },
  logRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logIcon:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logType:     { fontSize: 11, color: C.textSub, fontWeight: '500' },
  logName:     { fontSize: 13, fontWeight: '500', color: C.text, marginTop: 1 },
  logKcal:     { fontSize: 12, fontWeight: '500', color: C.text },
  logCost:     { fontSize: 11, color: C.accent },
  addRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  addMealBtn:  { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  addMealTxt:  { fontSize: 12, fontWeight: '500', color: C.text },
  budgetRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  bigNum:      { fontSize: 22, fontWeight: '600', color: C.text },
  budgetTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  budgetFill:  { height: 5, borderRadius: 3 },
  budgetSub:   { fontSize: 11, color: C.textSub },
});