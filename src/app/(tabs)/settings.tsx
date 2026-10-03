import { AboutSection } from '../../features/settings/components/AboutSection';
import { BackupSection } from '../../features/settings/components/BackupSection';
import { CustomRulesSection } from '../../features/settings/components/CustomRulesSection';
import { DevSection } from '../../features/settings/components/DevSection';
import { ProfileSection } from '../../features/settings/components/ProfileSection';
import { UkTiesSection } from '../../features/settings/components/UkTiesSection';
import { RemindersSection } from '../../features/settings/components/RemindersSection';
import { useApp } from '../../state/appStore';
import { Banner } from '../../ui/Banner';
import { Screen } from '../../ui/Screen';

export default function SettingsScreen() {
  const persistent = useApp((s) => s.persistent);
  return (
    <Screen>
      {!persistent ? <Banner tone="warn" title="Preview mode: nothing is saved in the browser" /> : null}
      <ProfileSection />
      <CustomRulesSection />
      <UkTiesSection />
      <RemindersSection />
      <BackupSection />
      <AboutSection />
      <DevSection />
    </Screen>
  );
}
