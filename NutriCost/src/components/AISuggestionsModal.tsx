import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../theme';
import { generateRecipeInstructions } from '../api/ai';

type Difficulty = 'easy' | 'medium' | 'hard';

interface AISuggestionsModalProps {
  visible: boolean;
  recipeName: string;
  ingredients: Array<{ name: string; weightG: number }>;
  onClose: () => void;
  onApply: (instructions: string) => void;
  isLoading?: boolean;
}

export default function AISuggestionsModal({
  visible,
  recipeName,
  ingredients,
  onClose,
  onApply,
  isLoading = false,
}: AISuggestionsModalProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const instructionsText = await generateRecipeInstructions({
        name: recipeName,
        type: 'custom',
        ingredients: ingredients.map(i => `${i.name} (${i.weightG}g)`),
        difficulty,
      });

      setSuggestions(instructionsText);
    } catch {
      setSuggestions('Desculpa, não consegui gerar sugestões. Tenta novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (suggestions) {
      onApply(suggestions);
      onClose();
      setSuggestions(null);
    }
  };

  const handleClose = () => {
    setSuggestions(null);
    onClose();
  };

  const getDifficultyBadge = () => {
    if (difficulty === 'easy') return { label: 'Fácil', color: '#4CAF50', icon: 'leaf' };
    if (difficulty === 'medium') return { label: 'Médio', color: '#FF9800', icon: 'restaurant' };
    return { label: 'Difícil', color: '#F44336', icon: 'flame' };
  };

  const badge = getDifficultyBadge();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Sugestões de IA</Text>
              <Text style={s.headerSubtitle}>Gera instruções passo-a-passo com base nos teus ingredientes</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {!suggestions ? (
              <>
                <Text style={s.subtitle}>Dificuldade de Preparação</Text>
                <View style={s.difficultyRow}>
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        s.difficultyBtn,
                        difficulty === level && s.difficultyBtnOn,
                      ]}
                      onPress={() => setDifficulty(level)}
                      disabled={generating}
                    >
                      <Text
                        style={[
                          s.difficultyBtnTxt,
                          difficulty === level && s.difficultyBtnTxtOn,
                        ]}
                      >
                        {level === 'easy' && 'Fácil'}
                        {level === 'medium' && 'Médio'}
                        {level === 'hard' && 'Difícil'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.hint}>
                  {difficulty === 'easy' && '🟢 Receita simples e rápida'}
                  {difficulty === 'medium' && '🟡 Receita com alguns passos'}
                  {difficulty === 'hard' && '🔴 Receita com técnicas avançadas'}
                </Text>

                <TouchableOpacity
                  style={[s.generateBtn, generating && s.generateBtnDisabled]}
                  onPress={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <ActivityIndicator size="small" color={C.bg} />
                      <Text style={s.generateBtnTxt}>A gerar...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color={C.bg} />
                      <Text style={s.generateBtnTxt}>Gerar com IA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.resultHeader}>
                  <Text style={s.subtitle}>Sugestões Geradas</Text>
                  <View style={[s.badge, { backgroundColor: badge.color + '20' }]}>
                    <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                    <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                
                <View style={s.suggestionsBox}>
                  <Text style={s.suggestionsText}>{suggestions}</Text>
                </View>

                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => setSuggestions(null)}
                    disabled={generating}
                  >
                    <Text style={s.cancelBtnTxt}>Voltar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={s.regenerateBtn}
                    onPress={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color={C.text} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={16} color={C.text} />
                        <Text style={s.regenerateBtnTxt}>Regenerar</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.applyBtn}
                    onPress={handleApply}
                    disabled={generating}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={C.bg} />
                    <Text style={s.applyBtnTxt}>Aplicar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSub,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  difficultyBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderMed,
    backgroundColor: C.surface2,
    alignItems: 'center',
  },
  difficultyBtnOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  difficultyBtnTxt: {
    fontSize: 12,
    fontWeight: '500',
    color: C.text,
  },
  difficultyBtnTxtOn: {
    color: '#000',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: C.textSub,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  generateBtn: {
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: R.md,
    gap: 8,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionsBox: {
    backgroundColor: C.surface2,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 12,
    marginBottom: 16,
    minHeight: 120,
  },
  suggestionsText: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.borderMed,
    alignItems: 'center',
  },
  cancelBtnTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  regenerateBtn: {
    flex: 1.2,
    paddingVertical: 10,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.borderMed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  regenerateBtnTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  applyBtn: {
    flex: 1.5,
    backgroundColor: C.protein,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: R.md,
    gap: 6,
  },
  applyBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
});
