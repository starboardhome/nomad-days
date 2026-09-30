import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const STYLES: Record<Variant, { box: string; text: string }> = {
  primary: { box: 'bg-brand active:opacity-80', text: 'text-white' },
  secondary: {
    box: 'border border-neutral-300 bg-white active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900',
    text: 'text-neutral-900 dark:text-neutral-100',
  },
  danger: { box: 'bg-danger-soft active:opacity-80 dark:bg-red-950', text: 'text-danger dark:text-red-300' },
  ghost: { box: 'active:opacity-60', text: 'text-brand dark:text-brand-dark' },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

export const Button = ({ label, onPress, variant = 'primary', disabled = false, loading = false }: Props) => {
  const s = STYLES[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${s.box} ${inactive ? 'opacity-50' : ''}`}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : undefined} /> : null}
      <Text className={`text-base font-semibold ${s.text}`}>{label}</Text>
    </Pressable>
  );
};
