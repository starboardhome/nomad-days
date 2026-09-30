import { router } from 'expo-router';
import { Fragment } from 'react';
import { countryLabel } from '../../../data/countries';
import { ruleSummary } from '../../rules/model';
import { useApp } from '../../../state/appStore';
import { Divider, Row } from '../../../ui/Row';
import { Section } from '../../../ui/Section';

export const CustomRulesSection = () => {
  const custom = useApp((s) => s.data.customJurisdictions);
  return (
    <Section title="Your own rules">
      {custom.map((j) => (
        <Fragment key={j.id}>
          <Row title={countryLabel(j.countries[0])} subtitle={ruleSummary(j)} onPress={() => router.push(`/rules/${j.countries[0]}`)} />
          <Divider />
        </Fragment>
      ))}
      <Row title="Add rules for a country" subtitle="For countries the app doesn’t cover yet" onPress={() => router.push('/rules/new')} />
    </Section>
  );
};
