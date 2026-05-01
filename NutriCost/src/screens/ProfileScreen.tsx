import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { UserProfile } from '../types';
import { C } from '../theme';

const GOALS = ['Muscle Gain', 'Fat Loss', 'Maintenance', 'Performance'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const p = state.profile;

  const [name, setName] = useState(p.name);
  const [age, setAge] = useState(p.age.toString());
  const [weight, setWeight] = useState(p.weightKg.toString());
  const [height, setHeight] = useState(p.heightCm.toString());
  const [goal, setGoal] = useState(p.goal);
  const [budget, setBudget] = useState(p.weeklyBudget);
  const [cal, setCal] = useState(p.macroGoals.calories);
  const [protein, setProtein] = useState(p.macroGoals.protein);
  const [carbs, setCarbs] = useState(p.macroGoals.carbs);
  const [fat, setFat] = useState(p.macroGoals.fat);

  // safer BMI
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const bmi =
    h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : '—';

  const initials =
    name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSave = () => {
    const updated: UserProfile = {
      name,
      goal,
      weeklyBudget: budget,
      age: parseInt(age) || 0,
      weightKg: parseFloat(weight) || 0,
      heightCm: parseFloat(height) || 0,
      macroGoals: { calories: cal, protein, carbs, fat },
    };

    dispatch({ type: 'SET_PROFILE', payload: updated });
    Alert.alert('Saved!', 'Profile updated.');
  };

  const Stepper = ({
    label,
    value,
    set,
    color = C.text,
    min,
    max,
    step,
    unit,
  }: {
    label: string;
    value: number;
    set: (v: number) => void;
    color?: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <View style={s.stepRow}>
        <Text style={[s.stepLabel, { color }]}>{label}</Text>
        <Text style={s.stepVal}>{value} {unit}</Text>
      </View>

      <View style={s.stepCtrl}>
        <TouchableOpacity
          style={s.stepBtn}
          onPress={() => set(Math.max(min, value - step))}
        >
          <Text style={s.stepBtnTxt}>−</Text>
        </TouchableOpacity>

        <View style={s.stepBar}>
          <View
            style={[
              s.stepFill,
              {
                width: `${((value - min) / (max - min)) * 100}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={s.stepBtn}
          onPress={() => set(Math.min(max, value + step))}
        >
          <Text style={s.stepBtnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <TextInput
              style={s.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={C.textMuted}
            />

            <Text style={s.avatarSub}>
              {age} yrs · {weight} kg · {height} cm
            </Text>

            <View style={s.goalRow}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.goalChip, goal === g && s.goalChipOn]}
                  onPress={() => setGoal(g)}
                >
                  <Text style={[s.goalChipTxt, goal === g && s.goalChipTxtOn]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Body Info */}
        <Text style={s.slabel}>Body Info</Text>
        <Card style={{ marginBottom: 14 }}>
          <View style={s.infoGrid}>
            {[
              { label: 'Age', value: age, set: setAge, unit: 'yrs', type: 'numeric' },
              { label: 'Weight', value: weight, set: setWeight, unit: 'kg', type: 'decimal-pad' },
              { label: 'Height', value: height, set: setHeight, unit: 'cm', type: 'decimal-pad' },
            ].map(({ label, value, set, unit, type }) => (
              <View key={label} style={s.infoItem}>
                <Text style={s.infoLabel}>{label}</Text>
                <TextInput
                  style={s.infoInput}
                  value={value}
                  onChangeText={set}
                  keyboardType={type as any}
                />
                <Text style={s.infoUnit}>{unit}</Text>
              </View>
            ))}

            <View style={s.infoItem}>
              <Text style={s.infoLabel}>BMI</Text>
              <Text style={[s.infoInput, { borderBottomWidth: 0 }]}>
                {isNaN(Number(bmi)) ? '—' : bmi}
              </Text>
            </View>
          </View>
        </Card>

        {/* Budget */}
        <Text style={s.slabel}>Weekly Budget</Text>
        <Card style={{ marginBottom: 14 }}>
          <View style={s.budgetHdr}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.text }}>
                Total Weekly
              </Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>
                €{Math.round(budget / 7)}/day
              </Text>
            </View>

            <Text style={{ fontSize: 22, fontWeight: '600', color: C.accent }}>
              €{budget}
            </Text>
          </View>

          <Stepper label="" value={budget} set={setBudget} color={C.accent} min={20} max={200} step={5} unit="" />
        </Card>

        {/* Macros */}
        <Text style={s.slabel}>Daily Macro Goals</Text>
        <Card style={{ marginBottom: 14 }}>
          <Stepper label="Calories" value={cal} set={setCal} color={C.accent} min={1200} max={4000} step={50} unit="kcal" />
          <Stepper label="Protein" value={protein} set={setProtein} color={C.protein} min={40} max={300} step={5} unit="g" />
          <Stepper label="Carbs" value={carbs} set={setCarbs} color={C.carbs} min={50} max={500} step={5} unit="g" />
          <Stepper label="Fat" value={fat} set={setFat} color={C.fat} min={20} max={200} step={5} unit="g" />
        </Card>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnTxt}>Save Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 21, fontWeight: '600', color: C.text },
  scroll: { padding: 16, paddingTop: 0 },

  avatarRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#3A2A10',
    borderWidth: 0.5,
    borderColor: C.accent + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 22, fontWeight: '600', color: C.accent },

  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 4,
  },

  avatarSub: { fontSize: 12, color: C.textMuted, marginTop: 4 },

  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  goalChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.surface },
  goalChipOn: { backgroundColor: C.accent },
  goalChipTxt: { fontSize: 11, color: C.textMuted },
  goalChipTxtOn: { color: '#000', fontWeight: '600' },

  slabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: { width: '48%' },
  infoLabel: { fontSize: 11, color: C.textMuted },
  infoInput: {
    fontSize: 15,
    color: C.text,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoUnit: { fontSize: 10, color: C.textMuted },

  budgetHdr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },

  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  stepLabel: { fontSize: 13 },
  stepVal: { fontSize: 13, color: C.text },

  stepCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTxt: { fontSize: 18, color: C.text },

  stepBar: { flex: 1, height: 6, backgroundColor: C.surface, borderRadius: 4 },
  stepFill: { height: '100%', borderRadius: 4 },

  saveBtn: {
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '600', color: '#000' },
});