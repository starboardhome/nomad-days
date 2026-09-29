import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useApp } from '../../state/appStore';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const onboarded = useApp((s) => !!s.data.profile.taxResidence);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Days', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: icon('airplane-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
