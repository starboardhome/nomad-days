import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DayNum } from '../../../domain/days';
import { Card } from '../../../ui/Card';
import { Divider } from '../../../ui/Row';
import { tripRow } from '../../trips/model';
import type { PlannedItem, Verdict } from '../model';

const VERDICT_TEXT: Record<Verdict['tone'], string> = {
  ok: 'text-brand dark:text-brand-dark',
  unknown: 'text-neutral-500 dark:text-neutral-400',
  warn: 'text-amber-700 dark:text-amber-400',
  danger: 'text-danger dark:text-red-300',
};

/** Planned trips with their verdicts; tap to edit */
export const PlannedList = ({ items, today }: { items: readonly PlannedItem[]; today: DayNum }) => (
  <Card className="py-1">
    {items.map(({ trip, verdict }, i) => {
      const row = tripRow(trip, today);
      return (
        <Fragment key={trip.id}>
          {i > 0 ? <Divider /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
            className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-60"
          >
            <View className="flex-1">
              <Text className="text-base text-neutral-900 dark:text-neutral-100">{row.title}</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{row.subtitle}</Text>
              <Text className={`text-sm font-semibold ${VERDICT_TEXT[verdict.tone]}`}>{verdict.short}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
          </Pressable>
        </Fragment>
      );
    })}
  </Card>
);
