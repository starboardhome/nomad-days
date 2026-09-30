import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Tone = 'info' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  info: 'bg-brand-soft dark:bg-teal-950',
  warn: 'bg-warn-soft dark:bg-amber-950',
  danger: 'bg-danger-soft dark:bg-red-950',
};

export const Banner = ({ tone = 'info', title, children }: { tone?: Tone; title: string; children?: ReactNode }) => (
  <View className={`gap-1 rounded-xl p-3 ${TONES[tone]}`} accessibilityRole="alert">
    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</Text>
    {children ? <Text className="text-sm text-neutral-700 dark:text-neutral-300">{children}</Text> : null}
  </View>
);
