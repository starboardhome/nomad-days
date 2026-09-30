import { router } from 'expo-router';
import { View } from 'react-native';
import { countryLabel } from '../../../data/countries';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Body, Heading, Muted } from '../../../ui/Text';

export const HereBanner = ({ here }: { here?: string }) => (
  <Card className="flex-row items-center justify-between gap-3">
    <View className="flex-1">
      <Muted>Right now</Muted>
      <Heading>{here ? countryLabel(here) : 'Not on a trip'}</Heading>
    </View>
    <View className="w-32">
      <Button label={here ? 'Log move' : 'Add trip'} onPress={() => router.push('/trip/new')} />
    </View>
  </Card>
);

export const ResetBanner = ({ onDismiss }: { onDismiss: () => void }) => (
  <View className="gap-2">
    <Banner tone="warn" title="Your previous data couldn’t be unlocked on this device">
      This happens after moving to a new phone. Restore from a backup to get your trips back.
    </Banner>
    <View className="flex-row gap-2">
      <View className="flex-1">
        <Button label="Restore backup" onPress={() => router.push('/backup/restore')} />
      </View>
      <View className="flex-1">
        <Button label="Dismiss" variant="secondary" onPress={onDismiss} />
      </View>
    </View>
  </View>
);

export const UncoveredHint = ({ countries }: { countries: readonly string[] }) => (
  <Banner tone="info" title="No stay rules bundled yet">
    {`${countries.map(countryLabel).join(', ')}: the app doesn’t include rules for ${countries.length > 1 ? 'these' : 'this'} yet, so days there aren’t checked.`}
  </Banner>
);

export const EmptyDashboard = () => (
  <Card className="items-center gap-3 py-8">
    <Heading>Log your first trip</Heading>
    <Body className="text-center">Add where you are now and where you’ve been. The app does the counting.</Body>
    <View className="w-48">
      <Button label="Add trip" onPress={() => router.push('/trip/new')} />
    </View>
  </Card>
);

export const Disclaimer = () => (
  <Muted className="text-center">
    Estimates only, not legal or tax advice. Rules change, so check official sources before you travel.
  </Muted>
);
