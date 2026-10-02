import { Text, View } from 'react-native';
import { Card } from '../../../ui/Card';
import { SelectChips } from '../../../ui/SelectChips';
import { Muted } from '../../../ui/Text';
import type { Info } from '../content';
import { InfoButton } from './InfoSheet';

const OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

type Props = Readonly<{ question: string; info: Info; value?: boolean; onChange: (v: boolean) => void; hint?: string }>;

export const YesNoQuestion = ({ question, info, value, onChange, hint }: Props) => (
  <Card className="gap-3">
    <View className="flex-row items-start gap-3">
      <Text className="flex-1 text-base font-medium text-neutral-900 dark:text-neutral-100">{question}</Text>
      <InfoButton info={info} />
    </View>
    <SelectChips
      label={question}
      options={OPTIONS}
      selected={value === undefined ? [] : [value ? 'yes' : 'no']}
      onToggle={(v) => onChange(v === 'yes')}
    />
    {hint ? <Muted>{hint}</Muted> : null}
  </Card>
);
