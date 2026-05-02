import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  IngredientSearch: { mode?: 'search' | 'addToRecipe' };
  CreateRecipe: undefined;
  RecipeDetail: { recipeId: string };
};

export type TabParamList = {
  Menu: undefined;
  Receitas: undefined;
  Registo: undefined;
  Perfil: undefined;
};

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Menu'>,
  NativeStackScreenProps<RootStackParamList>
>;