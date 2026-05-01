import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as ST, G } from 'react-native-svg';
import { MealLog, MealType } from '../types';
import { C, MEAL_COLOR } from '../theme';

interface Props {
  logs: MealLog[];
  dailyLimit: number;
}

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function shortDay(ds: string) {
  const d = new Date(ds + 'T12:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

export default function WeeklyBudgetChart({ logs, dailyLimit }: Props) {
  const { width: sw } = useWindowDimensions();
  // Account for screen padding (16) + card padding (14) on each side
  const chartW   = sw - 60;
  const chartH   = 170;
  const padLeft  = 28;
  const padBot   = 22;
  const innerH   = chartH - padBot;

  const days = useMemo(() => last7Days(), []);

  const dayData = useMemo(() => days.map(date => {
    const byType: Partial<Record<MealType, number>> = {};
    logs.filter(l => l.date === date).forEach(l => {
      byType[l.mealType] = (byType[l.mealType] ?? 0) + l.cost;
    });
    const total = Object.values(byType).reduce((a, b) => a + (b ?? 0), 0);
    return { date, byType, total };
  }), [logs, days]);

  const maxVal = Math.max(dailyLimit * 1.5, ...dayData.map(d => d.total), 0.1);
  const scale  = (v: number) => (v / maxVal) * innerH;

  const slotW  = (chartW - padLeft) / 7;
  const barW   = slotW * 0.55;
  const limitY = innerH - scale(dailyLimit);

  return (
    <View>
      {/* Legend */}
      <View style={s.legend}>
        {MEAL_ORDER.map(mt => (
          <View key={mt} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: MEAL_COLOR[mt] }]} />
            <Text style={s.legendText}>{mt}</Text>
          </View>
        ))}
        <View style={s.legendItem}>
          <View style={s.dash} />
          <Text style={s.legendText}>Limit</Text>
        </View>
      </View>

      <Svg width={chartW} height={chartH}>
        {/* Y-axis label for limit */}
        <ST x={padLeft - 3} y={limitY + 3} fontSize={8} fill={C.textMuted} textAnchor="end">
          €{dailyLimit.toFixed(0)}
        </ST>

        {/* Dashed limit line */}
        <Line
          x1={padLeft} y1={limitY} x2={chartW} y2={limitY}
          stroke={C.danger} strokeWidth={1} strokeDasharray="4,3" opacity={0.6}
        />

        {/* Bars */}
        {dayData.map((day, di) => {
          const barX = padLeft + di * slotW + (slotW - barW) / 2;
          const labelX = barX + barW / 2;

          // Pre-compute segments bottom-to-top
          let currentY = innerH;
          const segments = MEAL_ORDER
            .filter(mt => (day.byType[mt] ?? 0) > 0)
            .map(mt => {
              const h = scale(day.byType[mt]!);
              const y = currentY - h;
              currentY = y;
              return { mt, y, h };
            });

          // Top rounding: only the topmost segment gets rounded top
          return (
            <G key={day.date}>
              {segments.map(({ mt, y, h }, si) => (
                <Rect
                  key={mt}
                  x={barX} y={y} width={barW} height={h}
                  fill={MEAL_COLOR[mt]}
                  rx={si === segments.length - 1 ? 2 : 0}
                />
              ))}
              <ST x={labelX} y={chartH - 4} fontSize={10} fill={C.textSub} textAnchor="middle">
                {shortDay(day.date)}
              </ST>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:        { width: 9, height: 9, borderRadius: 2 },
  dash:       { width: 16, height: 0, borderTopWidth: 2, borderColor: C.danger, borderStyle: 'dashed' },
  legendText: { fontSize: 10, color: C.textSub },
});