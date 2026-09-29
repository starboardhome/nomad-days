import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StepHeader } from '../../features/onboarding';
import { useApp } from '../../state/appStore';
import { Button } from '../../ui/Button';
import { PassportPicker } from '../../ui/PassportPicker';
import { Screen } from '../../ui/Screen';
import { Muted } from '../../ui/Text';

export default function PassportsStep() {
  const { residence } = useLocalSearchParams<{ residence: string }>();
  const { profile } = useApp((s) => s.data);
  const saveProfile = useApp((s) => s.saveProfile);
  const [passports, setPassports] = useState<string[]>([...profile.passports]);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({ taxResidence: residence, passports });
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges="top" footer={<Button label="Finish" onPress={finish} disabled={!passports.length} loading={saving} />}>
      <StepHeader
        step={2}
        title="Which passports do you hold?"
        subtitle="Add them all. For each country, the app uses whichever passport gives you the most time."
      />
      <PassportPicker value={passports} onChange={setPassports} />
      <Muted>You can change these later in Settings.</Muted>
    </Screen>
  );
}
