import { Field, TextField } from './Field';

type Props = Readonly<{ label: string; value: string; onChange: (digits: string) => void; hint?: string; placeholder?: string }>;

/** Whole-number input; keeps only digits so the value can be cleared while typing */
export const NumberField = ({ label, value, onChange, hint, placeholder }: Props) => (
  <Field label={label} hint={hint}>
    <TextField
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
      keyboardType="number-pad"
      maxLength={4}
      placeholder={placeholder}
      accessibilityLabel={label}
    />
  </Field>
);
