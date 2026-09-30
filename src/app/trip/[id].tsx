import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { countryLabel } from '../../data/countries';
import { toISO } from '../../domain/days';
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
import { ToggleRow } from '../../ui/ToggleRow';
import { useToday } from '../../ui/useToday';

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const todayIso = toISO(today);
  const { draft, update, check, closes, isNew, save, remove } = useTripDraft(id, today);
  const [busy, setBusy] = useState(false);

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
    if (await confirm('Delete this trip?', 'Its days will no longer be counted.', 'Delete')) await run(remove)();
  };

  return (
    <Screen footer={<Button label="Save trip" onPress={run(save)} disabled={check.errors.length > 0} loading={busy} />}>
      <Stack.Screen options={{ title: isNew ? 'Add trip' : 'Edit trip' }} />
      <Card className="gap-4">
        <CountryField label="Country" value={draft.country} onChange={(country) => update({ country })} />
        <DateField label="Arrived" value={draft.entry} max={todayIso} onChange={(entry) => update({ entry })} />
        <ToggleRow label="I’m still there" value={!draft.exit} onChange={(still) => update({ exit: still ? undefined : todayIso })} />
        {draft.exit ? (
          <DateField label="Left" value={draft.exit} min={draft.entry} max={todayIso} onChange={(exit) => update({ exit })} />
        ) : null}
        <Field label="Note (optional)">
          <TextField value={draft.note ?? ''} onChangeText={(note) => update({ note })} placeholder="e.g. Lisbon apartment" maxLength={500} />
        </Field>
      </Card>

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
          <Button label="Delete trip" variant="danger" onPress={onDelete} disabled={busy} />
        </View>
      ) : null}
    </Screen>
  );
}
