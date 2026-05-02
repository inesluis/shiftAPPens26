import React, { useMemo, useState } from 'react';
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Account for screen padding (16) + card padding (14) on each side
  const chartW   = sw - 60;
  const chartH   = 170;
  const padLeft  = 34;
  const padBot   = 22;
  const innerH   = chartH - padBot;
  const padTop   = 16;

  const days = useMemo(() => last7Days(), []);

  const dayData = useMemo(() => days.map(date => {
    const byType: Partial<Record<MealType, number>> = {};
    logs.filter(l => l.date === date).forEach(l => {
      byType[l.mealType] = (byType[l.mealType] ?? 0) + l.cost;
    });
    const total = Object.values(byType).reduce((a, b) => a + (b ?? 0), 0);
    return { date, byType, total };
  }), [logs, days]);

  // Round the scale ceiling up to the nearest even integer >= dailyLimit
  const rawMax = Math.max(dailyLimit, ...dayData.map(d => d.total), 0.1);
  const maxVal = Math.ceil(rawMax / 2) * 2;          // snap to next even number
  const scale  = (v: number) => (v / maxVal) * (innerH - padTop);

  const slotW  = (chartW - padLeft) / 7;
  const barW   = slotW * 0.55;
  const limitY = innerH - scale(dailyLimit);
  // Always show 0, half-way, and the rounded ceiling; mark dailyLimit explicitly.
  const halfTick = Math.round(maxVal / 2);
  const ticks = Array.from(new Set([0, halfTick, maxVal]));

  const selected = selectedDay !== null ? dayData[selectedDay] : null;

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
        {/* Y axis */}
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={innerH} stroke={C.borderMed} strokeWidth={1} opacity={0.5} />
        {ticks.map((t, idx) => {
          const y = innerH - scale(t);
          return (
            <G key={`tick-${idx}`}>
              <Line x1={padLeft} y1={y} x2={chartW} y2={y} stroke={C.borderMed} strokeWidth={1} opacity={0.25} />
              <ST x={padLeft - 5} y={y + 4} fontSize={11} fontWeight="600" fill={Math.abs(t - dailyLimit) < 1 ? C.danger : C.textSub} textAnchor="end">
                {'€ '}{t.toFixed(0)}
              </ST>
            </G>
          );
        })}


        {/* Dashed limit line */}
        <Line
          x1={padLeft} y1={limitY} x2={chartW} y2={limitY}
          stroke={C.danger} strokeWidth={1} strokeDasharray="4,3" opacity={0.6}
        />

        {/* Bars */}
        {dayData.map((day, di) => {
          const barX = padLeft + di * slotW + (slotW - barW) / 2;
          const labelX = barX + barW / 2;
          const hitX = padLeft + di * slotW;

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
              <Rect
                x={hitX}
                y={padTop}
                width={slotW}
                height={innerH - padTop}
                fill="transparent"
                onPress={() => setSelectedDay(di)}
              />
              {segments.map(({ mt, y, h }, si) => (
                <Rect
                  key={mt}
                  x={barX} y={y} width={barW} height={h}
                  fill={MEAL_COLOR[mt]}
                  rx={si === segments.length - 1 ? 2 : 0}
                />
              ))}
              {selectedDay === di && (
                <Rect
                  x={barX - 2}
                  y={padTop}
                  width={barW + 4}
                  height={innerH - padTop}
                  fill="transparent"
                  stroke={C.accent}
                  strokeWidth={1}
                  rx={4}
                />
              )}
              <ST x={labelX} y={chartH - 4} fontSize={10} fill={C.textSub} textAnchor="middle">
                {shortDay(day.date)}
              </ST>
            </G>
          );
        })}
      </Svg>

      {selected && (
        <View style={s.detail}>
          <Text style={s.detailTitle}>Selected day</Text>
          <Text style={s.detailSub}>
            {new Date(selected.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })}
            {' '}· €{selected.total.toFixed(2)}
          </Text>
          <View style={s.detailRow}>
            {MEAL_ORDER.map(mt => (
              <View key={mt} style={s.detailItem}>
                <View style={[s.dot, { backgroundColor: MEAL_COLOR[mt] }]} />
                <Text style={s.detailText}>{mt}: €{(selected.byType[mt] ?? 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:        { width: 9, height: 9, borderRadius: 2 },
  dash:       { width: 16, height: 0, borderTopWidth: 2, borderColor: C.danger, borderStyle: 'dashed' },
  legendText: { fontSize: 10, color: C.textSub },
  detail:     { marginTop: 10, backgroundColor: C.surface2, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: C.borderMed },
  detailTitle:{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase' },
  detailSub:  { fontSize: 12, color: C.text, marginTop: 4 },
  detailRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 11, color: C.textSub },
});