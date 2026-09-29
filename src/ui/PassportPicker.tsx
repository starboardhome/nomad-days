import { useState } from 'react';
import { View } from 'react-native';
import { countryLabel } from '../data/countries';
import { Button } from './Button';
import { Chip } from './Chip';
import { CountryPicker } from './CountryPicker';

type Props = Readonly<{ value: readonly string[]; onChange: (codes: string[]) => void }>;

const toggle = (list: readonly string[], code: string) =>
  list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

/** Chips for each passport plus an "Add passport" button */
export const PassportPicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-3">
      {value.length ? (
        <View className="flex-row flex-wrap gap-2">
          {value.map((code) => (
            <Chip key={code} label={countryLabel(code)} onRemove={() => onChange(value.filter((c) => c !== code))} />
          ))}
        </View>
      ) : null}
      <Button label={value.length ? 'Add another passport' : 'Add a passport'} variant="secondary" onPress={() => setOpen(true)} />
      <CountryPicker
        visible={open}
        multiple
        title="Your passports"
        selected={value}
        onPick={(code) => onChange(toggle(value, code))}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};
