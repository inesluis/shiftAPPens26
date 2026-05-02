import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import IngredientSearchScreen from '../screens/IngredientSearchScreen';
import CreateRecipeScreen from '../screens/CreateRecipeScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import type { Session } from '@supabase/supabase-js';
import { RootStackParamList } from './types';
import { C } from '../theme';
import { supabase } from '../supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}
    >
      {session ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="IngredientSearch" component={IngredientSearchScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
});