import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import IngredientSearchScreen from '../screens/IngredientSearchScreen';
import CreateRecipeScreen from '../screens/CreateRecipeScreen';
import { RootStackParamList } from './types';
import { C } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="Tabs"             component={TabNavigator} />
      <Stack.Screen name="IngredientSearch" component={IngredientSearchScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="CreateRecipe"     component={CreateRecipeScreen}     options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}