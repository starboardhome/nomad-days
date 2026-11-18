import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { Card } from '../../../ui/Card';
import { levelText } from '../../../ui/LevelBadge';
import { Divider } from '../../../ui/Row';
import { Heading, Muted } from '../../../ui/Text';
import type { Card as CardModel, Summary } from '../model';
import { RuleRow } from './RuleRow';

/** Collapsed: flag, name and the one number that matters. Tap for every rule's details. */
export const JurisdictionCard = ({ card }: { card: CardModel }) => {
  const [open, setOpen] = useState(false);
  const brand = useColorScheme() === 'dark' ? '#5EEAD4' : '#0F766E'; // brand / brand-dark in tailwind.config.js
  const { summary } = card;
  return (
    <Card className="gap-1">
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${card.name}${card.present ? ', you’re here' : ''}: ${spoken(summary)}`}
        accessibilityHint={open ? 'Hides the details' : 'Shows the details'}
        className="active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">{card.flag}</Text>
          <Heading className="flex-1" numberOfLines={1}>
            {card.name}
          </Heading>
          {card.present ? <Muted>📍 You’re here</Muted> : null}
        </View>
        <SummaryView summary={summary} />
        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-sm font-medium text-brand dark:text-brand-dark">{open ? 'Hide details' : 'Details'}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={brand} />
        </View>
      </Pressable>
      {open ? (
        <View>
          {card.ownRulesFor ? <OwnRulesLink country={card.ownRulesFor} /> : null}
          {card.rules.map((line) => (
            <View key={line.id}>
              <Divider />
              <RuleRow line={line} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
};

const numberColour = (level: Summary['level']) => (level === 'na' ? 'text-neutral-500 dark:text-neutral-400' : levelText(level));

const SummaryView = ({ summary }: { summary: Summary }) => (
  <View className="items-center py-1">
    {summary.value !== undefined ? (
      <>
        <Text className={`text-5xl font-bold tabular-nums ${numberColour(summary.level)}`}>{summary.value}</Text>
        <Text className="text-base font-medium text-neutral-800 dark:text-neutral-200">{summary.text}</Text>
      </>
    ) : (
      <Text className={`text-center text-2xl font-bold ${numberColour(summary.level)}`}>{summary.text}</Text>
    )}
    {summary.rule ? <Muted className="text-center">{summary.rule}</Muted> : null}
  </View>
);

const spoken = (s: Summary) => [s.value, s.text, s.rule && `(${s.rule})`].filter((x) => x !== undefined && x !== '').join(' ');

const OwnRulesLink = ({ country }: { country: string }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Edit your own rules"
    onPress={() => router.push(`/rules/${country}`)}
    className="flex-row gap-1 pt-2 active:opacity-60"
  >
    <Muted>Your own rules ·</Muted>
    <Text className="text-sm font-semibold text-brand dark:text-brand-dark">Edit</Text>
  </Pressable>
);
