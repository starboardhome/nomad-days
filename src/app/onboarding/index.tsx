import { router } from 'expo-router';
import { useState } from 'react';
import { PrivacyNote, StepHeader } from '../../features/onboarding';
import { useApp } from '../../state/appStore';
import { Button } from '../../ui/Button';
import { CountryField } from '../../ui/CountryField';
import { Screen } from '../../ui/Screen';

export default function TaxResidenceStep() {
  const saved = useApp((s) => s.data.profile.taxResidence);
  const [residence, setResidence] = useState(saved ?? undefined);
  const next = () => residence && router.push({ pathname: '/onboarding/passports', params: { residence } });

  return (
    <Screen edges="top" footer={<Button label="Continue" onPress={next} disabled={!residence} />}>
      <StepHeader
        step={1}
        title="Where are you tax resident?"
        subtitle="Nomad Days skips tax-day tests for the country you're already resident in."
      />
      <CountryField label="Tax residence" value={residence} onChange={setResidence} />
      <PrivacyNote />
    </Screen>
  );
}
