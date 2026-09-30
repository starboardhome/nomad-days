import type { ReactNode } from 'react';
import { View } from 'react-native';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <View className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
    {children}
  </View>
);
