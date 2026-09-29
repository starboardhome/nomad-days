import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

export const Chip = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <Pressable
    onPress={onRemove}
    disabled={!onRemove}
    accessibilityRole={onRemove ? 'button' : undefined}
    accessibilityLabel={onRemove ? `Remove ${label}` : label}
    className="flex-row items-center gap-1 rounded-full border border-neutral-300 bg-white py-1.5 pl-3 pr-2 active:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
  >
    <Text className="text-sm text-neutral-900 dark:text-neutral-100">{label}</Text>
    {onRemove ? <Ionicons name="close" size={16} color="#737373" /> : null}
  </Pressable>
);
