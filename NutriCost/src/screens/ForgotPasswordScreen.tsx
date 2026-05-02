import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { supabase } from '../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleReset = async () => {
        if (!email.trim()) {
            setError('O email é obrigatório.');
            return;
        }
        if (!isEmailValid(email)) {
            setError('Introduza um email válido.');
            return;
        }

        setError(null);
        setLoading(true);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (resetError) setError(resetError.message);
        setLoading(false);
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        if (error) setError(null);
    };

    return (
        <KeyboardAvoidingView
            style={[s.container, { paddingTop: insets.top + 20 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={s.hdr}>
                <Text style={s.title}>Esqueceu a palavra-passe?</Text>
                <Text style={s.sub}>Enviaremos uma ligação para repor a sua palavra-passe</Text>
            </View>

            <View style={s.body}>
                <Text style={s.label}>Email</Text>
                <TextInput
                    style={[s.input, error && s.inputError]}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="utilizador@email.com"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {error && <Text style={s.errorText}>{error}</Text>}

                <TouchableOpacity style={[s.primaryBtn, loading && s.primaryBtnDisabled]} onPress={handleReset} disabled={loading}>
                    <Text style={s.primaryTxt}>{loading ? 'A enviar...' : 'Enviar ligação para repor password.'}</Text>
                </TouchableOpacity>

                <View style={s.footerRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={s.linkTxt}>Voltar ao login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    hdr: { paddingHorizontal: 16, paddingBottom: 10 },
    title: { fontSize: 22, fontWeight: '600', color: C.text },
    sub: { fontSize: 12, color: C.textSub, marginTop: 4 },
    body: { paddingHorizontal: 16, paddingTop: 6 },
    label: { fontSize: 11, color: C.textSub, marginBottom: 6 },
    input: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.borderMed, borderRadius: R.md, padding: 10, fontSize: 13, color: C.text },
    inputError: { borderColor: C.danger },
    errorText: { fontSize: 11, color: C.danger, marginTop: 4 },
    linkTxt: { fontSize: 12, color: C.accent, fontWeight: '500' },
    primaryBtn: { backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center', marginTop: 16 },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
    footerRow: { alignItems: 'center', marginTop: 16 },
});
