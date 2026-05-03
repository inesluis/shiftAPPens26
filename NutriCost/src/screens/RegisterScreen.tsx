import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleRegister = async () => {
        const nextErrors: { name?: string; email?: string; password?: string } = {};
        if (!name.trim()) nextErrors.name = 'Insira o nome.';
        if (!email.trim()) nextErrors.email = 'Insira o email.';
        else if (!isEmailValid(email)) nextErrors.email = 'Insira um email válido.';
        if (!password.trim()) nextErrors.password = 'Insira a senha.';
        else if (password.trim().length < 6) nextErrors.password = 'Use pelo menos 6 caracteres.';

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setFormError(null);
        setLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (!response.ok) {
                setFormError(data.message || 'Erro ao criar conta.');
            } else {
                // In a real app, you would handle the session/token
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                    options: { data: { name: name.trim() } },
                });
                if (error) setFormError(error.message);
            }
        } catch (err) {
            setFormError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
        if (formError) setFormError(null);
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
        if (formError) setFormError(null);
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
        if (formError) setFormError(null);
    };

    return (
        <KeyboardAvoidingView
            style={[s.container, { paddingTop: insets.top + 20 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={s.hdr}>
                <Text style={s.title}>Criar Conta</Text>
                <Text style={s.sub}>Comece a rastrear sua nutrição e orçamento</Text>
            </View>

            <View style={s.body}>
                <Text style={s.label}>Nome</Text>
                <TextInput
                    style={[s.input, errors.name && s.inputError]}
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder="O seu nome"
                    placeholderTextColor={C.textMuted}
                />
                {errors.name && <Text style={s.errorText}>{errors.name}</Text>}

                <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
                <TextInput
                    style={[s.input, errors.email && s.inputError]}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="utilizador@email.com"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {errors.email && <Text style={s.errorText}>{errors.email}</Text>}

                <Text style={[s.label, { marginTop: 12 }]}>Password</Text>
                <TextInput
                    style={[s.input, errors.password && s.inputError]}
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="Crie uma palavra-passe"
                    placeholderTextColor={C.textMuted}
                    secureTextEntry
                />
                {errors.password && <Text style={s.errorText}>{errors.password}</Text>}

                {formError && <Text style={s.errorText}>{formError}</Text>}

                <TouchableOpacity style={[s.primaryBtn, loading && s.primaryBtnDisabled]} onPress={handleRegister} disabled={loading}>
                    <Text style={s.primaryTxt}>{loading ? 'A criar...' : 'Criar Conta'}</Text>
                </TouchableOpacity>

                <View style={s.footerRow}>
                    <Text style={s.footerTxt}>Já tem uma conta?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={s.linkTxt}>Iniciar sessão</Text>
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
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    footerTxt: { fontSize: 12, color: C.textSub },
});
