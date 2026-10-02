import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchCountries, type Country } from '../data/countries';
import { TextField } from './Field';

type Props = Readonly<{
  visible: boolean;
  title: string;
  selected: readonly string[];
  onPick: (code: string) => void; // single mode closes after a pick; multi mode toggles
  onClose: () => void;
  multiple?: boolean;
}>;

const CountryItem = ({ country, checked, onPress }: { country: Country; checked: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: checked }}
    className="min-h-12 flex-row items-center gap-3 px-4 py-2 active:bg-neutral-100 dark:active:bg-neutral-800"
  >
    <Text className="text-2xl">{country.flag}</Text>
    <Text className="flex-1 text-base text-neutral-900 dark:text-neutral-100">{country.name}</Text>
    {checked ? <Ionicons name="checkmark-circle" size={22} color="#0F766E" /> : null}
  </Pressable>
);

/** Full-screen searchable country list */
export const CountryPicker = ({ visible, title, selected, onPick, onClose, multiple = false }: Props) => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCountries(query), [query]);
  const insets = useSafeAreaInsets();
  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (code: string) => {
    onPick(code);
    if (!multiple) close();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
          <Pressable onPress={close} accessibilityRole="button" className="px-2 py-1">
            <Text className="text-base font-semibold text-brand dark:text-brand-dark">Done</Text>
          </Pressable>
        </View>
        <View className="px-4 pb-2">
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
            autoFocus // type straight away instead of scrolling 250 countries
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search countries"
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => (
            <CountryItem country={item} checked={selected.includes(item.code)} onPress={() => pick(item.code)} />
          )}
        />
      </View>
    </Modal>
  );
};
