import type { ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <View className="gap-1.5">
    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
    {children}
    {hint ? <Text className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</Text> : null}
  </View>
);

export const INPUT =
  'min-h-12 rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

export const TextField = (props: TextInputProps) => (
  <TextInput placeholderTextColor="#a3a3a3" className={INPUT} {...props} />
);
