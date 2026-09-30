import { Pressable, Text, View } from 'react-native';

type Option<T> = Readonly<{ value: T; label: string }>;
type Props<T> = Readonly<{ options: readonly Option<T>[]; selected: readonly T[]; onToggle: (value: T) => void; label: string }>;

/** Row of pill toggles (single or multi-select, depending on how onToggle updates `selected`) */
export const SelectChips = <T extends string | number>({ options, selected, onToggle, label }: Props<T>) => (
  <View className="flex-row flex-wrap gap-2" accessibilityLabel={label}>
    {options.map(({ value, label: text }) => {
      const on = selected.includes(value);
      return (
        <Pressable
          key={String(value)}
          onPress={() => onToggle(value)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          className={`min-h-10 justify-center rounded-full border px-4 ${
            on ? 'border-brand bg-brand' : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
          }`}
        >
          <Text className={`text-sm font-semibold ${on ? 'text-white' : 'text-neutral-800 dark:text-neutral-200'}`}>{text}</Text>
        </Pressable>
      );
    })}
  </View>
);
