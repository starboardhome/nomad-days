import { View } from 'react-native';

export const ProgressBar = ({ value }: { value: number }) => (
  <View
    className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
  >
    <View className="h-full rounded-full bg-brand" style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
  </View>
);
