import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AuthGate from '@/components/auth-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />

      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="tabs" />
          <Stack.Screen name="productos" />
          <Stack.Screen name="clientes" />
          <Stack.Screen name="movimientos" />
          <Stack.Screen name="deudas" />
          <Stack.Screen name="abonos" />
          <Stack.Screen name="cuenta" />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
