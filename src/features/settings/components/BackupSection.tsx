import { router } from 'expo-router';
import { Divider, Row } from '../../../ui/Row';
import { Section } from '../../../ui/Section';

export const BackupSection = () => (
  <Section title="Backup">
    <Row title="Export encrypted backup" subtitle="Protected with a passphrase only you know" onPress={() => router.push('/backup/export')} />
    <Divider />
    <Row title="Restore from backup" subtitle="Replaces the data on this phone" onPress={() => router.push('/backup/restore')} />
  </Section>
);
