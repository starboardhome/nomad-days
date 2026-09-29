import { View } from 'react-native';
import { useApp } from '../../../state/appStore';
import { CountryField } from '../../../ui/CountryField';
import { Field } from '../../../ui/Field';
import { PassportPicker } from '../../../ui/PassportPicker';
import { Card } from '../../../ui/Card';
import { Overline } from '../../../ui/Text';

/** Edits save immediately, so there's no separate Save button */
export const ProfileSection = () => {
  const profile = useApp((s) => s.data.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  return (
    <View className="gap-2">
      <Overline className="px-1">Profile</Overline>
      <Card className="gap-4">
        <CountryField
          label="Tax residence"
          value={profile.taxResidence ?? undefined}
          onChange={(taxResidence) => saveProfile({ ...profile, taxResidence })}
        />
        <Field label="Passports">
          <PassportPicker value={profile.passports} onChange={(passports) => saveProfile({ ...profile, passports })} />
        </Field>
      </Card>
    </View>
  );
};
