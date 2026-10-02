import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { countryLabel } from '../../data/countries';
import type { Plan } from '../../data/schema';
import { toISO } from '../../domain/days';
import { VerdictBanner } from '../../features/plans/components/VerdictBanner';
import { useTripDraft } from '../../features/trips/useTripDraft';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { confirm } from '../../ui/confirm';
import { CountryField } from '../../ui/CountryField';
import { DateField } from '../../ui/DateField';
import { Field, TextField } from '../../ui/Field';
import { formatDate } from '../../ui/format';
import { Screen } from '../../ui/Screen';
import { SelectChips } from '../../ui/SelectChips';
import { ToggleRow } from '../../ui/ToggleRow';
import { useToday } from '../../ui/useToday';

type Kind = Plan | 'trip';
const KINDS: readonly { value: Kind; label: string }[] = [
  { value: 'trip', label: 'Trip' },
  { value: 'booked', label: 'Booked' },
  { value: 'maybe', label: 'Maybe' },
];
const KIND_HINT: Record<Kind, string> = {
  trip: 'A trip you’ve taken or are on now.',
  booked: 'A future trip you’re going on. Counts toward your other plans.',
  maybe: 'A trip you might take. Checked on its own, without affecting other plans.',
};

export default function TripScreen() {
  const { id, plan } = useLocalSearchParams<{ id: string; plan?: Plan }>();
  const today = useToday();
  const todayIso = toISO(today);
  const { draft, update, setPlan, check, closes, verdict, isNew, startedPlan, save, remove, confirm: confirmTrip } =
    useTripDraft(id, today, plan);
  const [busy, setBusy] = useState(false);
  const planned = !!draft.plan;

  const run = (task: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await task();
      router.back();
    } finally {
      setBusy(false);
    }
  };
  const onDelete = async () => {
    const what = planned ? 'plan' : 'trip';
    if (await confirm(`Delete this ${what}?`, planned ? 'It will no longer be checked.' : 'Its days will no longer be counted.', 'Delete'))
      await run(remove)();
  };

  return (
    <Screen
      footer={<Button label={planned ? 'Save plan' : 'Save trip'} onPress={run(save)} disabled={check.errors.length > 0} loading={busy} />}
    >
      <Stack.Screen options={{ title: isNew ? (planned ? 'Plan a trip' : 'Add trip') : planned ? 'Edit plan' : 'Edit trip' }} />
      {startedPlan ? (
        <View className="gap-2">
          <Banner title={`Did you go to ${countryLabel(startedPlan.country)}?`}>
            This trip was planned to start on {formatDate(startedPlan.entry)}. Confirm it so its days count.
          </Banner>
          <Button label="Yes, I went" onPress={run(confirmTrip)} disabled={check.errors.length > 0} loading={busy} />
        </View>
      ) : null}
      <Card className="gap-4">
        <Field label="This is" hint={KIND_HINT[draft.plan ?? 'trip']}>
          <SelectChips label="Trip type" options={KINDS} selected={[draft.plan ?? 'trip']} onToggle={(k) => setPlan(k === 'trip' ? undefined : k)} />
        </Field>
        <CountryField label="Country" value={draft.country} onChange={(country) => update({ country })} />
        <DateField
          label={planned ? 'Arriving' : 'Arrived'}
          value={draft.entry}
          max={planned ? undefined : todayIso}
          onChange={(entry) => update({ entry })}
        />
        {planned ? null : (
          <ToggleRow label="I’m still there" value={!draft.exit} onChange={(still) => update({ exit: still ? undefined : todayIso })} />
        )}
        {draft.exit ? (
          <DateField
            label={planned ? 'Leaving' : 'Left'}
            value={draft.exit}
            min={draft.entry}
            max={planned ? undefined : todayIso}
            onChange={(exit) => update({ exit })}
          />
        ) : null}
        <Field label="Note (optional)">
          <TextField value={draft.note ?? ''} onChangeText={(note) => update({ note })} placeholder="e.g. Lisbon apartment" maxLength={500} />
        </Field>
      </Card>

      {verdict ? <VerdictBanner verdict={verdict} /> : null}
      {closes ? (
        <Banner title={`Your ${countryLabel(closes.country)} trip will end on ${formatDate(closes.exit!)}`}>
          Moving on means you've left there. The travel day counts in both places.
        </Banner>
      ) : null}
      {check.errors.map((e) => (
        <Banner key={e} tone="danger" title={e} />
      ))}
      {check.warnings.map((w) => (
        <Banner key={w} tone="warn" title={w} />
      ))}

      {!isNew ? (
        <View className="pt-2">
          <Button label={planned ? 'Delete plan' : 'Delete trip'} variant="danger" onPress={onDelete} disabled={busy} />
        </View>
      ) : null}
    </Screen>
  );
}
