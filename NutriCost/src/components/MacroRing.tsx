import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../theme';

interface Props {
  calories: number;
  goalCalories: number;
  size?: number;
}

export default function MacroRing({ calories, goalCalories, size = 90 }: Props) {
  const sw = 8;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(calories / Math.max(goalCalories, 1), 1);
  const offset = circ * (1 - progress);
  const cx = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <Circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={C.accent} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90" origin={`${cx},${cx}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{Math.round(calories)}</Text>
        <Text style={{ fontSize: 10, color: C.textSub }}>/ {goalCalories}</Text>
        <Text style={{ fontSize: 9, color: C.textMuted }}>kcal</Text>
      </View>
    </View>
  );
}