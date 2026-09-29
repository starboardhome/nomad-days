import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = { title: string; subtitle?: string; onPress?: () => void; right?: ReactNode };

/** A tappable list row with an optional subtitle and chevron */
export const Row = ({ title, subtitle, onPress, right }: Props) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    onPress={onPress}
    disabled={!onPress}
    className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-60"
  >
    <View className="flex-1">
      <Text className="text-base text-neutral-900 dark:text-neutral-100">{title}</Text>
      {subtitle ? <Text className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</Text> : null}
    </View>
    {right}
    {onPress ? <Ionicons name="chevron-forward" size={18} color="#a3a3a3" /> : null}
  </Pressable>
);

export const Divider = () => <View className="h-px bg-neutral-200 dark:bg-neutral-800" />;
