import { Switch, Text, View } from 'react-native';

export const ToggleRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View className="min-h-12 flex-row items-center justify-between">
    <Text className="text-base text-neutral-900 dark:text-neutral-100">{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: '#0F766E' }} accessibilityLabel={label} />
  </View>
);
