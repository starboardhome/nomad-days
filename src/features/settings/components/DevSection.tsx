import { localToday } from '../../../domain/days';
import { useApp } from '../../../state/appStore';
import { confirm } from '../../../ui/confirm';
import { Row } from '../../../ui/Row';
import { Section } from '../../../ui/Section';
import { demoData } from '../../demo/demoData';

/** Debug builds only (not in release builds): load the demo traveller, e.g. for store screenshots */
export const DevSection = () => {
  const { store, reload } = useApp();
  if (!__DEV__ || !store) return null;
  const load = async () => {
    if (!(await confirm('Load demo data?', 'This replaces everything in the app with a sample traveller.', 'Replace'))) return;
    await store.replaceAll(demoData(localToday()));
    await reload();
  };
  return (
    <Section title="Developer">
      <Row title="Load demo data" subtitle="Debug builds only · replaces your data" onPress={load} />
    </Section>
  );
};
