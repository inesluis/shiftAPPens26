import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealType } from '../types';
import { C, R } from '../theme';

const OPTIONS: { type: MealType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'Pequeno-Almoço', icon: 'sunny-outline' },
  { type: 'Almoço', icon: 'partly-sunny-outline' },
  { type: 'Jantar', icon: 'moon-outline' },
  { type: 'Snack', icon: 'nutrition-outline' },
];

interface Props {
  visible: boolean;
  onSelect: (type: MealType) => void;
  onClose: () => void;
}

export default function MealTypePicker({ visible, onSelect, onClose }: Props) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.title}>Em que refeição foi?</Text>
        <Text style={s.sub}>Seleciona o momento do dia</Text>

        <View style={s.options}>
          {OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.type}
              style={s.option}
              onPress={() => onSelect(opt.type)}
              activeOpacity={0.7}
            >
              <View style={s.iconWrap}>
                <Ionicons name={opt.icon} size={20} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.optionLabel}>{opt.type}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
          <Text style={s.cancelTxt}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderMed,
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: C.textSub,
    marginBottom: 20,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    padding: 14,
    borderWidth: 0.5,
    borderColor: C.borderMed,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  cancelBtn: {
    marginTop: 14,
    padding: 14,
    alignItems: 'center',
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.borderMed,
  },
  cancelTxt: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSub,
  },
});