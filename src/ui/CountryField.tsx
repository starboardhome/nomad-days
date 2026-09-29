import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { countryLabel } from '../data/countries';
import { CountryPicker } from './CountryPicker';
import { Field, INPUT } from './Field';

type Props = Readonly<{ label: string; value?: string; onChange: (code: string) => void; placeholder?: string; hint?: string }>;

/** A form field that shows the chosen country and opens the picker */
export const CountryField = ({ label, value, onChange, placeholder = 'Choose a country', hint }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} className={`${INPUT} justify-center`}>
        <Text className={`text-base ${value ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
          {value ? countryLabel(value) : placeholder}
        </Text>
      </Pressable>
      <CountryPicker visible={open} title={label} selected={value ? [value] : []} onPick={onChange} onClose={() => setOpen(false)} />
    </Field>
  );
};
