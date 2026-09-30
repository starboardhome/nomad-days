import { Text, View } from 'react-native';
import type { Level } from '../domain/status';

export type BadgeLevel = Level | 'na';

const LOOK: Record<BadgeLevel, { box: string; text: string; label: string }> = {
  ok: { box: 'bg-ok-soft dark:bg-green-950', text: 'text-ok dark:text-green-300', label: 'OK' },
  warning: { box: 'bg-warn-soft dark:bg-amber-950', text: 'text-warn dark:text-amber-300', label: 'Soon' },
  blocked: { box: 'bg-danger-soft dark:bg-red-950', text: 'text-danger dark:text-red-300', label: 'No days' },
  over: { box: 'bg-danger dark:bg-red-700', text: 'text-white', label: 'Over' },
  na: { box: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500 dark:text-neutral-400', label: 'N/A' },
};

export const LevelBadge = ({ level }: { level: BadgeLevel }) => (
  <View className={`rounded-full px-2.5 py-0.5 ${LOOK[level].box}`}>
    <Text className={`text-xs font-bold ${LOOK[level].text}`}>{LOOK[level].label}</Text>
  </View>
);

/** Colour for the big headline number, matching the badge */
export const levelText = (level: BadgeLevel): string => LOOK[level === 'over' ? 'blocked' : level].text;
