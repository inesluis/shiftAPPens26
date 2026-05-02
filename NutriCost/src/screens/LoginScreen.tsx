import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { C, R } from '../theme';
import { supabase } from '../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleLogin = async () => {
        const nextErrors: { email?: string; password?: string } = {};
        if (!email.trim()) nextErrors.email = 'Email é obrigatório.';
        else if (!isEmailValid(email)) nextErrors.email = 'Insira um email válido.';
        if (!password.trim()) nextErrors.password = 'Password é obrigatório.';
        else if (password.trim().length < 6) nextErrors.password = 'Use pelo menos 6 caracteres.';

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setFormError(null);
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
        });
        if (error) setFormError(error.message);
        setLoading(false);
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
            style={[s.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={s.hdr}>
                <Text style={s.title}>Bem-vindo!</Text>
                <Text style={s.sub}>Faça login para continuar a seguir as suas refeições</Text>
            </View>

            <View style={s.body}>
                <Text style={s.label}>Email</Text>
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
                    placeholder="Password"
                    placeholderTextColor={C.textMuted}
                    secureTextEntry
                />
                {errors.password && <Text style={s.errorText}>{errors.password}</Text>}

                <TouchableOpacity style={s.link} onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={s.linkTxt}>Esqueceu-se da password?</Text>
                </TouchableOpacity>

                {formError && <Text style={s.errorText}>{formError}</Text>}

                <TouchableOpacity style={[s.primaryBtn, loading && s.primaryBtnDisabled]} onPress={handleLogin} disabled={loading}>
                    <Text style={s.primaryTxt}>{loading ? 'A fazer login...' : 'Log In'}</Text>
                </TouchableOpacity>

                <View style={s.footerRow}>
                    <Text style={s.footerTxt}>Novo à aplicação?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={s.linkTxt}>Criar uma conta</Text>
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
    link: { alignSelf: 'flex-end', marginTop: 8 },
    linkTxt: { fontSize: 12, color: C.accent, fontWeight: '500' },
    primaryBtn: { backgroundColor: C.accent, borderRadius: R.md, padding: 14, alignItems: 'center', marginTop: 16 },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryTxt: { fontSize: 14, fontWeight: '600', color: '#1A1000' },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    footerTxt: { fontSize: 12, color: C.textSub },
});
