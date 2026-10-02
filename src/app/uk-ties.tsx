import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { UkTies } from '../data/schema';
import { yearOf } from '../domain/days';
import { actualStays } from '../domain/plan';
import { ukTaxYears, ukTies } from '../domain/ukTies';
import { tiesSummary } from '../features/jurisdictions';
import { InfoButton } from '../features/ukTies/components/InfoSheet';
import { YesNoQuestion } from '../features/ukTies/components/YesNoQuestion';
import { COUNTRY_TIE, INTRO, LIMITS, QUESTIONS } from '../features/ukTies/content';
import { useApp } from '../state/appStore';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Screen } from '../ui/Screen';
import { Heading, Muted } from '../ui/Text';
import { useToday } from '../ui/useToday';

/** "2025–26" for the tax year starting on `start` */
const taxYearLabel = (start: number) => `${yearOf(start)}–${String(yearOf(start) + 1).slice(2)}`;

export default function UkTiesScreen() {
  const data = useApp((s) => s.data);
  const saveSettings = useApp((s) => s.saveSettings);
  const today = useToday();
  const answers: UkTies = useMemo(() => data.settings.ukTies ?? {}, [data.settings.ukTies]);
  const result = useMemo(() => ukTies(answers, actualStays(data.stays), today), [answers, data.stays, today]);
  const [, y1, y2] = ukTaxYears(today);
  const set = (key: keyof UkTies, value: boolean) => saveSettings({ ...data.settings, ukTies: { ...answers, [key]: value } });

  const hints: Partial<Record<keyof UkTies, string>> = {
    ninetyDays: `From your trips: ${taxYearLabel(y1)} ${result.fromTrips.priorYears[0]} days, ${taxYearLabel(y2)} ${result.fromTrips.priorYears[1]} days${
      result.fromTrips.ninetyDays ? '. That’s already a 90-day tie.' : '.'
    }`,
  };

  return (
    <Screen>
      <Muted>{INTRO}</Muted>

      {result.answered ? (
        <Card className="gap-1">
          <Heading>
            {result.threshold < 183 ? `UK resident after ${result.threshold} days in a tax year` : 'UK resident after 183 days in a tax year'}
          </Heading>
          <Muted>
            {`You have ${tiesSummary(result)} as ${result.leaver ? 'a leaver' : 'an arriver'}.${
              result.threshold < 183 ? ' The Days tab now uses this limit.' : ' That’s not enough to lower the 183-day limit.'
            }`}
          </Muted>
        </Card>
      ) : (
        <Banner title="Answer the first question to use the ties test">Until then, only the 183-day test is checked.</Banner>
      )}

      {QUESTIONS.map((q) => (
        <YesNoQuestion
          key={q.key}
          question={q.question}
          info={q.info}
          value={answers[q.key]}
          onChange={(v) => set(q.key, v)}
          hint={hints[q.key]}
        />
      ))}

      {result.leaver ? (
        <Card className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              {`Country tie: ${result.ties.country ? 'Yes' : 'No'}`}
            </Text>
            <Muted>Worked out from your trips: is the UK where you’ve spent the most midnights this tax year?</Muted>
          </View>
          <InfoButton info={COUNTRY_TIE} />
        </Card>
      ) : null}

      <Card className="flex-row items-center gap-3">
        <Muted className="flex-1">{LIMITS.title}: other UK tests, split years and excluded days.</Muted>
        <InfoButton info={LIMITS} />
      </Card>

      {data.settings.ukTies ? (
        <Button label="Clear my answers" variant="ghost" onPress={() => saveSettings({ ...data.settings, ukTies: undefined })} />
      ) : null}
    </Screen>
  );
}
