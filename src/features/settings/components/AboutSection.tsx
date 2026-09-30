import Constants from 'expo-constants';
import { View } from 'react-native';
import { Card } from '../../../ui/Card';
import { Body, Muted, Overline } from '../../../ui/Text';

export const AboutSection = () => (
  <View className="gap-2">
    <Overline className="px-1">About</Overline>
    <Card className="gap-2">
      <Body>🔒 Your data never leaves this phone. It's stored encrypted, with no accounts, analytics or servers.</Body>
      <Muted>
        Day counts are estimates based on the rules bundled with this version. They aren't legal or tax advice.
      </Muted>
      <Muted>Nomad Days {Constants.expoConfig?.version ?? ''} · open source</Muted>
    </Card>
  </View>
);
