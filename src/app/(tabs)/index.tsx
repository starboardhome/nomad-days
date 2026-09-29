import { useMemo } from 'react';
import { buildDashboard } from '../../features/dashboard/model';
import { Disclaimer, EmptyDashboard, HereBanner, ResetBanner, UncoveredHint } from '../../features/dashboard/components/Banners';
import { JurisdictionCard } from '../../features/dashboard/components/JurisdictionCard';
import { useApp } from '../../state/appStore';
import { Screen } from '../../ui/Screen';
import { useToday } from '../../ui/useToday';

export default function DashboardScreen() {
  const { data, wasReset, dismissReset } = useApp();
  const today = useToday();
  const dash = useMemo(() => buildDashboard(data, today), [data, today]);

  return (
    <Screen>
      {wasReset ? <ResetBanner onDismiss={dismissReset} /> : null}
      <HereBanner here={dash.here} />
      {data.stays.length === 0 ? <EmptyDashboard /> : null}
      {dash.cards.map((card) => (
        <JurisdictionCard key={card.id} card={card} />
      ))}
      {dash.uncovered.length ? <UncoveredHint countries={dash.uncovered} /> : null}
      {data.stays.length ? <Disclaimer /> : null}
    </Screen>
  );
}
