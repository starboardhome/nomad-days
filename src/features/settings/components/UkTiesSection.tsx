import { router } from 'expo-router';
import { actualStays } from '../../../domain/plan';
import { ukTies } from '../../../domain/ukTies';
import { useApp } from '../../../state/appStore';
import { Row } from '../../../ui/Row';
import { Section } from '../../../ui/Section';
import { useToday } from '../../../ui/useToday';
import { tiesSummary } from '../../jurisdictions';

/** UK sufficient ties questions (only relevant if you're not UK tax resident already) */
export const UkTiesSection = () => {
  const data = useApp((s) => s.data);
  const today = useToday();
  if (data.profile.taxResidence === 'GB') return null;
  const answers = data.settings.ukTies;
  const t = answers?.leaver !== undefined ? ukTies(answers, actualStays(data.stays), today) : undefined;
  return (
    <Section title="UK tax residence">
      <Row
        title="Your UK ties"
        subtitle={t ? `${tiesSummary(t)} · resident after ${t.threshold} days` : 'Answer 5 yes/no questions: ties can lower the 183-day limit'}
        onPress={() => router.push('/uk-ties')}
      />
    </Section>
  );
};
