/** Android (default): tapping opens the system date dialog. See DateField.ios.tsx / DateField.web.tsx. */
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, Text } from 'react-native';
import { formatDate } from './format';
import { Field, INPUT } from './Field';
import { isoToLocalDate, localDateToIso, type DateFieldProps } from './dateValue';

export const DateField = ({ label, value, onChange, min, max }: DateFieldProps) => {
  const open = () =>
    DateTimePickerAndroid.open({
      value: isoToLocalDate(value),
      mode: 'date',
      minimumDate: min ? isoToLocalDate(min) : undefined,
      maximumDate: max ? isoToLocalDate(max) : undefined,
      onValueChange: (_event, date) => onChange(localDateToIso(date)),
    });
  return (
    <Field label={label}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}: ${formatDate(value)}`} className={`${INPUT} justify-center`}>
        <Text className="text-base text-neutral-900 dark:text-neutral-100">{formatDate(value)}</Text>
      </Pressable>
    </Field>
  );
};
