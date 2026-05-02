import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import ConfirmModal from '../components/ConfirmModal';
import { UserProfile } from '../types';
import { C } from '../theme';
import { supabase } from '../supabase';

// ─── Factory defaults (never mutated) ───────────────────────────────────────
const DEFAULT_PRESETS = {
  'Aumento Muscular': { calories: 2800, protein: 180, carbs: 300, fat: 80, budget: 90 },
  'Perda de Peso':    { calories: 1800, protein: 150, carbs: 120, fat: 60, budget: 70 },
  'Manutenção': { calories: 2200, protein: 140, carbs: 220, fat: 70, budget: 80 },
  'Desempenho': { calories: 2600, protein: 160, carbs: 280, fat: 75, budget: 85 },
};

type GoalKey = keyof typeof DEFAULT_PRESETS;
type PresetMap = typeof DEFAULT_PRESETS;

// ─── SliderControl ────────────────────────────────────────────────────────────
const SliderControl = ({
  label, value, set, color = C.text, min, max, unit,
}: {
  label: string; value: number; set: (v: number) => void;
  color?: string; min: number; max: number; unit: string;
}) => {
  const [tempValue, setTempValue]   = useState(value);
  const [isEditing, setIsEditing]   = useState(false);
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => { setTempValue(value); }, [value]);
  useEffect(() => { setInputValue(String(Math.round(tempValue))); }, [tempValue]);

  const commitValue = () => {
    const num = Math.min(max, Math.max(min, Number(inputValue)));
    setTempValue(num);
    set(num);
    setInputValue(String(num));
    setIsEditing(false);
  };

  return (
    <View style={{ marginBottom: 18 }}>
      {label !== '' && (
        <View style={s.stepRow}>
          <Text style={[s.stepLabel, { color }]}>{label}</Text>
          {isEditing ? (
            <TextInput
              style={[s.stepVal, s.stepValInput]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              autoFocus
              onBlur={commitValue}
              onSubmitEditing={commitValue}
            />
          ) : (
            // Underline hints the value is tappable
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={[s.stepVal, { color, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }]}>
                {Math.round(tempValue)} {unit}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Slider
        style={{ height: 30 }}
        value={tempValue}
        onValueChange={(v) => setTempValue(v)}
        onSlidingComplete={(v) => {
          const rounded = Math.round(v);
          setTempValue(rounded);
          set(rounded);
        }}
        minimumValue={min}
        maximumValue={max}
        minimumTrackTintColor={color}
        maximumTrackTintColor={C.surface}
        thumbTintColor={color}
      />
    </View>
  );
};

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const p = state.profile;

  const [name,   setName]   = useState(p.name);
  const [age,    setAge]    = useState(p.age.toString());
  const [weight, setWeight] = useState(p.weightKg.toString());
  const [height, setHeight] = useState(p.heightCm.toString());
  const [goal,   setGoal]   = useState<GoalKey>(p.goal as GoalKey);

  // Per-goal memory: starts from factory defaults, user edits are stored here
  const [customPresets, setCustomPresets] = useState<PresetMap>({
    ...DEFAULT_PRESETS,
    // Seed the active goal with the saved profile values so the user's
    // last-saved numbers are restored on first load
    [p.goal]: {
      calories: p.macroGoals.calories,
      protein:  p.macroGoals.protein,
      carbs:    p.macroGoals.carbs,
      fat:      p.macroGoals.fat,
      budget:   p.weeklyBudget,
    },
  });

  // Slider values always mirror the currently-selected goal's custom preset
  const current = customPresets[goal];
  const [cal,     setCal]     = useState(current.calories);
  const [protein, setProtein] = useState(current.protein);
  const [carbs,   setCarbs]   = useState(current.carbs);
  const [fat,     setFat]     = useState(current.fat);
  const [budget,  setBudget]  = useState(current.budget);
  const [tempBudget, setTempBudget] = useState(current.budget);
  const [modal, setModal] = useState<{ type: 'reset' | 'save' | 'logout'; title?: string; message?: string } | null>(null);

  // ── Persist slider edits back into the per-goal map ──────────────────────
  // We use a ref so we can call it inside onSlidingComplete without stale closure issues
  const updateCustomPreset = (patch: Partial<typeof current>) => {
    setCustomPresets(prev => ({
      ...prev,
      [goal]: { ...prev[goal], ...patch },
    }));
  };

  // ── Switch goal: save current sliders then load the new goal's values ────
  const handleGoalSwitch = (newGoal: GoalKey) => {
    // Save current slider state to the outgoing goal
    setCustomPresets(prev => ({
      ...prev,
      [goal]: { calories: cal, protein, carbs, fat, budget },
    }));

    // Load the incoming goal's remembered values
    const next = customPresets[newGoal];
    setCal(next.calories);
    setProtein(next.protein);
    setCarbs(next.carbs);
    setFat(next.fat);
    setBudget(next.budget);
    setTempBudget(next.budget);
    setGoal(newGoal);
  };

  // ── Reset active goal to factory defaults ────────────────────────────────
  const handleReset = () => setModal({ type: 'reset', title: 'Resetar', message: `Resetar configurações para "${goal}"?` });

  // ── Save to app context ───────────────────────────────────────────────────
  const handleSave = () => {
    const updated: UserProfile = {
      name,
      goal,
      weeklyBudget: budget,
      age:      parseInt(age)    || 0,
      weightKg: parseFloat(weight) || 0,
      heightCm: parseFloat(height) || 0,
      macroGoals: { calories: cal, protein, carbs, fat },
    };
    dispatch({ type: 'SET_PROFILE', payload: updated });
    setModal({ type: 'save', title: 'Guardado!', message: 'Perfil atualizado.' });
  };

  const handleLogout = () => setModal({ type: 'logout', title: 'Sair', message: 'Deseja terminar sessão?' });

  // ── Derived ───────────────────────────────────────────────────────────────
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const bmi = h > 0 && w > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : '—';
  const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <View style={[s.container, { paddingTop: insets.top + 20 }]}>
      <View style={s.hdr}>
        <Text style={s.title}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name ─────────────────────────────────────────────── */}
        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <TextInput
              style={s.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="O seu nome"
              placeholderTextColor={C.textMuted}
            />
            <Text style={s.avatarSub}>
              {age} anos · {weight} kg · {height} cm
            </Text>

            {/* Goal chips — horizontal scroll so they never wrap */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
              contentContainerStyle={{ gap: 6 }}
            >
              {(Object.keys(DEFAULT_PRESETS) as GoalKey[]).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.goalChip, goal === g && s.goalChipOn]}
                  onPress={() => handleGoalSwitch(g)}
                >
                  <Text style={[s.goalChipTxt, goal === g && s.goalChipTxtOn]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Body Info ─────────────────────────────────────────────────── */}
        <Text style={s.slabel}>Perfil Corporal</Text>
        <Card style={{ marginBottom: 14 }}>
          <View style={s.infoGrid}>
            {[
              { label: 'Idade',    value: age,    set: setAge,    unit: 'anos', type: 'numeric' },
              { label: 'Peso', value: weight, set: setWeight, unit: 'kg',  type: 'decimal-pad' },
              { label: 'Altura', value: height, set: setHeight, unit: 'cm',  type: 'decimal-pad' },
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

        {/* ── Weekly Budget ─────────────────────────────────────────────── */}
        <Text style={s.slabel}>Budget semanal</Text>
        <Card style={{ marginBottom: 14 }}>
          <View style={s.budgetHdr}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.text }}>Total </Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>€{Math.round(tempBudget / 7)}/dia</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.accent }}>€{Math.round(tempBudget)}</Text>
          </View>
          <Slider
            style={{ height: 30 }}
            value={tempBudget}
            onValueChange={(v) => setTempBudget(v)} 
            onSlidingComplete={(v) => {
              const rounded = Math.round(v);
              setTempBudget(rounded);
              setBudget(rounded); 
              updateCustomPreset({ budget: rounded });
            }}
            minimumValue={20}
            maximumValue={200}
            minimumTrackTintColor={C.accent}
            maximumTrackTintColor={C.surface}
            thumbTintColor={C.accent}
          />
        </Card>

        {/* ── Daily Macro Goals ─────────────────────────────────────────── */}
        <View style={s.macroHdr}>
          <Text style={s.slabel}>Objetivos diário de macros</Text>
          {/* Subtle reset link — not a primary action */}
          <TouchableOpacity onPress={handleReset}>
            <Text style={s.resetLink}>Resetar para padrões</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ marginBottom: 14 }}>
          <SliderControl label="Calorias" value={cal}     set={(v) => { setCal(v);     updateCustomPreset({ calories: v }); }} color={C.accent}  min={1200} max={4000} unit="kcal" />
          <SliderControl label="Proteína"  value={protein} set={(v) => { setProtein(v); updateCustomPreset({ protein:  v }); }} color={C.protein} min={40}   max={300}  unit="g" />
          <SliderControl label="Carboidratos"    value={carbs}   set={(v) => { setCarbs(v);   updateCustomPreset({ carbs:    v }); }} color={C.carbs}   min={50}   max={500}  unit="g" />
          <SliderControl label="Gorduras"      value={fat}     set={(v) => { setFat(v);     updateCustomPreset({ fat:      v }); }} color={C.fat}     min={20}   max={200}  unit="g" />
        </Card>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnTxt}>Guardar perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutTxt}>Sair</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── MODALS ───────────────────────── */}

      {modal?.type === 'reset' && (
        <ConfirmModal
          visible={true}
          title={modal.title || 'Resetar'}
          message={modal.message || ''}
          confirmText="Resetar"
          danger
          onCancel={() => setModal(null)}
          onConfirm={() => {
            const def = DEFAULT_PRESETS[goal];
            setCal(def.calories);
            setProtein(def.protein);
            setCarbs(def.carbs);
            setFat(def.fat);
            setBudget(def.budget);
            setTempBudget(def.budget);
            setCustomPresets(prev => ({ ...prev, [goal]: { ...def } }));
            setModal(null);
          }}
        />
      )}

      {modal?.type === 'save' && (
        <ConfirmModal
          visible={true}
          title={modal.title || 'Guardado!'}
          message={modal.message || ''}
          confirmText="OK"
          onCancel={() => setModal(null)}
          onConfirm={() => setModal(null)}
        />
      )}

      {modal?.type === 'logout' && (
        <ConfirmModal
          visible={true}
          title={modal.title || 'Sair'}
          message={modal.message || ''}
          confirmText="Sair"
          danger
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await supabase.auth.signOut();
            setModal(null);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hdr:       { paddingHorizontal: 16, paddingBottom: 10 },
  title:     { fontSize: 21, fontWeight: '600', color: C.text },
  scroll:    { padding: 16, paddingTop: 0 },

  avatarRow: { flexDirection: 'row', marginBottom: 18 },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#3A2A10',
    borderWidth: 0.5, borderColor: C.accent + '50',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarTxt: { fontSize: 22, fontWeight: '600', color: C.accent },

  nameInput: {
    fontSize: 17, fontWeight: '600', color: C.text,
    borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 4,
  },
  avatarSub: { fontSize: 12, color: C.textMuted, marginTop: 4 },

  goalChip:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: C.surface },
  goalChipOn:  { backgroundColor: C.accent },
  goalChipTxt: { fontSize: 11, color: C.textMuted },
  goalChipTxtOn: { color: '#000', fontWeight: '600' },

  slabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },

  macroHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resetLink: { fontSize: 11, color: C.textMuted, textDecorationLine: 'underline' },

  infoGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem:  { width: '48%', marginBottom: 10 },
  infoLabel: { fontSize: 11, color: C.textMuted },
  infoInput: { fontSize: 15, color: C.text, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  infoUnit:  { fontSize: 10, color: C.textMuted },

  budgetHdr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },

  stepRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  stepLabel:    { fontSize: 13 },
  stepVal:      { fontSize: 16, fontWeight: '600' },
  stepValInput: { minWidth: 60, color: C.text, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },

  saveBtn:    { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnTxt: { fontSize: 15, fontWeight: '600', color: '#000' },
  logoutBtn:  { borderWidth: 0.5, borderColor: C.borderMed, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  logoutTxt:  { fontSize: 14, fontWeight: '600', color: C.textSub },
});