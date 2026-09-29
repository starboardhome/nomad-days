import { View } from 'react-native';
import { Card } from '../../../ui/Card';
import { Divider } from '../../../ui/Row';
import { Heading, Muted } from '../../../ui/Text';
import type { Card as CardModel } from '../model';
import { RuleRow } from './RuleRow';

export const JurisdictionCard = ({ card }: { card: CardModel }) => (
  <Card>
    <View className="flex-row items-baseline justify-between">
      <Heading>{card.name}</Heading>
      {card.present ? <Muted>📍 You’re here</Muted> : null}
    </View>
    {card.rules.map((line, i) => (
      <View key={line.id}>
        {i > 0 ? <Divider /> : null}
        <RuleRow line={line} />
      </View>
    ))}
  </Card>
);
