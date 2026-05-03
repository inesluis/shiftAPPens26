import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../theme';

interface Props {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}

export default function MacroBar({ label, value, goal, unit, color }: Props) {
  const pct = Math.min((value / Math.max(goal, 1)) * 100, 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.val}>{Math.round(value)} / {goal}{unit}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '500' },
  val:   { fontSize: 11, color: C.textSub },
  track: { height: 6, backgroundColor: 'rgba(42,36,32,0.25)', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
});