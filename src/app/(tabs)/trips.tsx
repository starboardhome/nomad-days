import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { actualStays } from '../../domain/plan';
import { ConfirmTripCard } from '../../features/plans/components/ConfirmTripCard';
import { PlannedList } from '../../features/plans/components/PlannedList';
import { plansToConfirm, upcomingPlans } from '../../features/plans/model';
import { TripList } from '../../features/trips/components/TripList';
import { useApp } from '../../state/appStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Body, Muted, Overline } from '../../ui/Text';
import { useToday } from '../../ui/useToday';

export default function TripsScreen() {
  const data = useApp((s) => s.data);
  const today = useToday();
  const toConfirm = useMemo(() => plansToConfirm(data, today), [data, today]);
  const upcoming = useMemo(() => upcomingPlans(data, today), [data, today]);
  const real = useMemo(() => actualStays(data.stays), [data.stays]);

  return (
    <Screen>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="Add trip" onPress={() => router.push('/trip/new')} />
        </View>
        <View className="flex-1">
          <Button label="Plan a trip" variant="secondary" onPress={() => router.push({ pathname: '/trip/[id]', params: { id: 'new', plan: 'booked' } })} />
        </View>
      </View>

      {toConfirm.map((t) => (
        <ConfirmTripCard key={t.id} trip={t} />
      ))}

      {upcoming.length ? (
        <View className="gap-2">
          <Overline className="px-1">Planned</Overline>
          <PlannedList items={upcoming} today={today} />
        </View>
      ) : null}

      <View className="gap-2">
        {upcoming.length ? <Overline className="px-1">Trips</Overline> : null}
        {real.length ? (
          <>
            <TripList stays={real} today={today} />
            <Muted className="text-center">Entry and exit days count as days in the country.</Muted>
          </>
        ) : (
          <Card>
            <Body>No trips yet. Add where you are now, then fill in recent trips so the counts are accurate.</Body>
          </Card>
        )}
      </View>
    </Screen>
  );
}
