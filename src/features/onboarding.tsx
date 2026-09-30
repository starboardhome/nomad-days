import { View } from 'react-native';
import { Body, Muted, Overline, Title } from '../ui/Text';

export const StepHeader = ({ step, title, subtitle }: { step: number; title: string; subtitle: string }) => (
  <View className="gap-2 pt-6">
    <Overline>Step {step} of 2</Overline>
    <Title>{title}</Title>
    <Body>{subtitle}</Body>
  </View>
);

export const PrivacyNote = () => (
  <Muted>🔒 Everything stays on this phone, encrypted. There are no accounts, no tracking and no servers.</Muted>
);
