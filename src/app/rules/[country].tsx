import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { countryName } from '../../data/countries';
import { EntryLimitFields } from '../../features/rules/components/EntryLimitFields';
import { TaxTestFields } from '../../features/rules/components/TaxTestFields';
import { activePresets, PRESETS } from '../../features/rules/model';
import { useRuleDraft } from '../../features/rules/useRuleDraft';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { confirm } from '../../ui/confirm';
import { CountryField } from '../../ui/CountryField';
import { Field, TextField } from '../../ui/Field';
import { Screen } from '../../ui/Screen';
import { SelectChips } from '../../ui/SelectChips';
import { Muted } from '../../ui/Text';
import { useToday } from '../../ui/useToday';

export default function CustomRulesScreen() {
  const { country } = useLocalSearchParams<{ country: string }>();
  const { draft, update, preset, check, isNew, save, remove } = useRuleDraft(country, useToday());
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
    const name = draft.country ? countryName(draft.country) : 'this country';
    if (await confirm(`Delete your rules for ${name}?`, 'Days there will no longer be checked.', 'Delete')) await run(remove)();
  };

  return (
    <Screen footer={<Button label="Save rules" onPress={run(save)} disabled={check.errors.length > 0} loading={busy} />}>
      <Stack.Screen options={{ title: isNew ? 'Add your own rules' : 'Edit your rules' }} />
      <Card className="gap-4">
        <CountryField label="Country" value={draft.country} onChange={(c) => update({ country: c })} />
        <Field label="Quick presets">
          <SelectChips label="Quick presets" options={PRESETS} selected={activePresets(draft)} onToggle={preset} />
        </Field>
      </Card>
      <Card className="gap-4">
        <EntryLimitFields draft={draft} update={update} />
      </Card>
      <Card className="gap-4">
        <TaxTestFields draft={draft} update={update} />
      </Card>
      <Card>
        <Field label="Source (optional)" hint="A link to the official rules, so you can check them later.">
          <TextField
            value={draft.source}
            onChangeText={(source) => update({ source })}
            placeholder="https://"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      </Card>

      {check.errors.map((e) => (
        <Banner key={e} tone="danger" title={e} />
      ))}
      {check.warnings.map((w) => (
        <Banner key={w} tone="warn" title={w} />
      ))}
      <Muted className="text-center">Your rules stay on this phone and are included in your encrypted backups.</Muted>

      {!isNew ? (
        <View className="pt-2">
          <Button label="Delete rules" variant="danger" onPress={onDelete} disabled={busy} />
        </View>
      ) : null}
    </Screen>
  );
}
