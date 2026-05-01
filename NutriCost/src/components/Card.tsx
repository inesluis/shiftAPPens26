import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { C, R } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({ children, style, padding = 14 }: Props) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 0.5,
    borderColor: C.border,
  },
});