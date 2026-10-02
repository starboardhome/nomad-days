import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { buildDashboard } from '../../features/dashboard/model';
import { Disclaimer, EmptyDashboard, HereBanner, ResetBanner, UncoveredHint } from '../../features/dashboard/components/Banners';
import { JurisdictionCard } from '../../features/dashboard/components/JurisdictionCard';
import { ConfirmTripCard } from '../../features/plans/components/ConfirmTripCard';
import { PlannedList } from '../../features/plans/components/PlannedList';
import { plansToConfirm, upcomingPlans } from '../../features/plans/model';
import { useApp } from '../../state/appStore';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Overline } from '../../ui/Text';
import { useToday } from '../../ui/useToday';

const UPCOMING_SHOWN = 3;

export default function DashboardScreen() {
  const { data, wasReset, dismissReset } = useApp();
  const today = useToday();
  const dash = useMemo(() => buildDashboard(data, today), [data, today]);
  const toConfirm = useMemo(() => plansToConfirm(data, today), [data, today]);
  const upcoming = useMemo(() => upcomingPlans(data, today), [data, today]);

  return (
    <Screen>
      {wasReset ? <ResetBanner onDismiss={dismissReset} /> : null}
      <HereBanner here={dash.here} />
      {toConfirm.map((t) => (
        <ConfirmTripCard key={t.id} trip={t} />
      ))}
      {data.stays.length === 0 ? <EmptyDashboard /> : null}
      {dash.cards.map((card) => (
        <JurisdictionCard key={card.id} card={card} />
      ))}
      {upcoming.length ? (
        <View className="gap-2">
          <Overline className="px-1">Upcoming</Overline>
          <PlannedList items={upcoming.slice(0, UPCOMING_SHOWN)} today={today} />
          {upcoming.length > UPCOMING_SHOWN ? (
            <Button label={`See all ${upcoming.length} planned trips`} variant="ghost" onPress={() => router.push('/trips')} />
          ) : null}
        </View>
      ) : null}
      {dash.uncovered.length ? <UncoveredHint countries={dash.uncovered} /> : null}
      {data.stays.length ? <Disclaimer /> : null}
    </Screen>
  );
}
