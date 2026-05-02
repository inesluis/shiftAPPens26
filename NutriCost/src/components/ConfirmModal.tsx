import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { C } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            { transform: [{ scale }], opacity },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelTxt}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onConfirm} style={[styles.confirmBtn, danger && styles.dangerBtn]}>
              <Text style={[styles.confirmTxt, danger && styles.dangerTxt]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modal: {
    width: '80%',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 20,
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },

  message: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 20,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  cancelTxt: {
    color: C.textMuted,
  },

  confirmBtn: {
    backgroundColor: C.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },

  confirmTxt: {
    color: '#000',
    fontWeight: '600',
  },

  dangerBtn: {
    backgroundColor: '#e74c3c',
  },

  dangerTxt: {
    color: '#fff',
  },
});