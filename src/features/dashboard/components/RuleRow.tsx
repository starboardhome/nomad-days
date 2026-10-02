import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LevelBadge, levelText } from '../../../ui/LevelBadge';
import { Muted, Overline } from '../../../ui/Text';
import type { RuleLine } from '../model';

const Notes = ({ notes }: { notes: readonly string[] }) => {
  const [open, setOpen] = useState(false);
  if (!notes.length) return null;
  return (
    <View className="gap-1">
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text className="text-sm font-medium text-brand dark:text-brand-dark">{open ? 'Hide details' : 'About this rule'}</Text>
      </Pressable>
      {open ? notes.map((n) => <Muted key={n}>• {n}</Muted>) : null}
    </View>
  );
};

export const RuleRow = ({ line }: { line: RuleLine }) => (
  <View className="gap-1.5 py-3">
    <View className="flex-row items-center justify-between gap-2">
      <Overline className="flex-1">{line.category === 'tax' ? `Tax · ${line.label}` : line.label}</Overline>
      <LevelBadge level={line.level} />
    </View>
    <Text className={`text-xl font-bold ${line.level === 'na' ? 'text-neutral-500 dark:text-neutral-400' : levelText(line.level)}`}>
      {line.headline}
    </Text>
    {line.details.map((d) => (
      <Text key={d} className="text-sm text-neutral-700 dark:text-neutral-300">
        {d}
      </Text>
    ))}
    {line.plans.map((p) => (
      <Text key={p.text} className={`text-sm font-medium ${p.tone === 'danger' ? 'text-danger dark:text-red-300' : 'text-brand dark:text-brand-dark'}`}>
        {p.tone === 'danger' ? '✗ ' : '→ '}
        {p.text}
      </Text>
    ))}
    {line.link ? (
      <Pressable onPress={() => router.push(line.link!.href)} accessibilityRole="button">
        <Text className="text-sm font-semibold text-brand dark:text-brand-dark">{line.link.label}</Text>
      </Pressable>
    ) : null}
    <Notes notes={line.notes} />
  </View>
);
