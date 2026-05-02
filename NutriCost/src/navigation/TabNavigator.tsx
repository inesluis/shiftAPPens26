import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import RecipesScreen from '../screens/RecipesScreen';
import TrackingScreen from '../screens/TrackingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TabParamList } from './types';
import { C } from '../theme';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<string, string> = {
  Home:     'home-outline',
  Recipes:  'document-text-outline',
  Tracking: 'pulse-outline',
  Profile:  'person-outline',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#110F0D',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 0.5,
          height: 76,
          paddingBottom: 14,
          paddingTop: 8,
        },
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: '#5A5855',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color }) => (
          <Ionicons name={ICONS[route.name] as any} size={26} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Recipes"  component={RecipesScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}