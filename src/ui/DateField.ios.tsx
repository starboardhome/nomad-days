/** iOS: the native compact date picker (a pill that opens a calendar popover) */
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, View } from 'react-native';
import { isoToLocalDate, localDateToIso, type DateFieldProps } from './dateValue';

export const DateField = ({ label, value, onChange, min, max }: DateFieldProps) => (
  <View className="min-h-12 flex-row items-center justify-between">
    <Text className="text-base text-neutral-900 dark:text-neutral-100">{label}</Text>
    <DateTimePicker
      value={isoToLocalDate(value)}
      mode="date"
      display="compact"
      accentColor="#0F766E"
      minimumDate={min ? isoToLocalDate(min) : undefined}
      maximumDate={max ? isoToLocalDate(max) : undefined}
      onValueChange={(_event, date) => onChange(localDateToIso(date))}
      accessibilityLabel={label}
    />
  </View>
);
