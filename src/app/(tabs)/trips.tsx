import { router } from 'expo-router';
import { TripList } from '../../features/trips/components/TripList';
import { useApp } from '../../state/appStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Body, Muted } from '../../ui/Text';
import { useToday } from '../../ui/useToday';

export default function TripsScreen() {
  const stays = useApp((s) => s.data.stays);
  const today = useToday();
  return (
    <Screen>
      <Button label="Add trip" onPress={() => router.push('/trip/new')} />
      {stays.length ? (
        <>
          <TripList stays={stays} today={today} />
          <Muted className="text-center">Entry and exit days count as days in the country.</Muted>
        </>
      ) : (
        <Card>
          <Body>No trips yet. Add where you are now, then fill in recent trips so the counts are accurate.</Body>
        </Card>
      )}
    </Screen>
  );
}
