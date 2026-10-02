import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { countryLabel } from '../../../data/countries';
import type { StayRecord } from '../../../data/schema';
import { useApp } from '../../../state/appStore';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { formatDate } from '../../../ui/format';
import { Heading, Muted } from '../../../ui/Text';
import { confirmPlanned } from '../../trips/model';

/** A planned trip whose start date has arrived: confirm it (so it counts) or remove it */
export const ConfirmTripCard = ({ trip }: { trip: StayRecord }) => {
  const stays = useApp((s) => s.data.stays);
  const { saveStays, deleteStay } = useApp();
  const [busy, setBusy] = useState(false);
  const act = (task: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="gap-3">
      <View>
        <Heading>{`Did you go to ${countryLabel(trip.country)}?`}</Heading>
        <Muted>{`Planned ${formatDate(trip.entry)} – ${formatDate(trip.exit!)}. Confirm it so its days count.`}</Muted>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="Yes, I went" onPress={act(() => saveStays(confirmPlanned(trip, stays)))} loading={busy} />
        </View>
        <View className="flex-1">
          <Button label="No, remove" variant="secondary" onPress={act(() => deleteStay(trip.id))} disabled={busy} />
        </View>
      </View>
      <Button label="Change dates" variant="ghost" onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} />
    </Card>
  );
};
