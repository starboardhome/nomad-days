import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
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
    {card.ownRulesFor ? <OwnRulesLink country={card.ownRulesFor} /> : null}
    {card.rules.map((line, i) => (
      <View key={line.id}>
        {i > 0 ? <Divider /> : null}
        <RuleRow line={line} />
      </View>
    ))}
  </Card>
);

const OwnRulesLink = ({ country }: { country: string }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Edit your own rules"
    onPress={() => router.push(`/rules/${country}`)}
    className="flex-row gap-1 pt-1 active:opacity-60"
  >
    <Muted>Your own rules ·</Muted>
    <Text className="text-sm font-semibold text-brand dark:text-brand-dark">Edit</Text>
  </Pressable>
);
