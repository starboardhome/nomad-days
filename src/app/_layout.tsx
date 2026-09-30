import '../global.css';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { useReminderSync } from '../features/reminders/useReminderSync';
import { useApp } from '../state/appStore';
import { Body, Heading } from '../ui/Text';

/** Navigation chrome (headers, tab bar) follows the system light/dark setting */
const withBrand = (base: Theme, primary: string): Theme => ({ ...base, colors: { ...base.colors, primary } });
const LIGHT = withBrand(DefaultTheme, '#0F766E');
const DARK = withBrand({ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0a0a0a', card: '#171717' } }, '#5EEAD4');

const Loading = () => (
  <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <ActivityIndicator />
  </View>
);

const Failed = ({ message }: { message?: string }) => (
  <View className="flex-1 justify-center gap-2 bg-neutral-50 p-6 dark:bg-neutral-950">
    <Heading>Couldn’t open your data</Heading>
    <Body>{message}</Body>
  </View>
);

export default function RootLayout() {
  const { status, error, init } = useApp();
  const scheme = useColorScheme();
  useReminderSync();
  useEffect(() => {
    init();
  }, [init]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <Failed message={error} />;

  return (
    <ThemeProvider value={scheme === 'dark' ? DARK : LIGHT}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="trip/[id]" options={{ presentation: 'modal', title: 'Trip' }} />
        <Stack.Screen name="backup/export" options={{ presentation: 'modal', title: 'Export backup' }} />
        <Stack.Screen name="backup/restore" options={{ presentation: 'modal', title: 'Restore backup' }} />
      </Stack>
    </ThemeProvider>
  );
}
