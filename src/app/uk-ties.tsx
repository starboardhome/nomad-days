import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { UkTies } from '../data/schema';
import { yearOf } from '../domain/days';
import { actualStays } from '../domain/plan';
import { ukTaxYears, ukTies } from '../domain/ukTies';
import { InfoButton } from '../features/ukTies/components/InfoSheet';
import { YesNoQuestion } from '../features/ukTies/components/YesNoQuestion';
import { COUNTRY_TIE, INTRO, LIMITS, QUESTIONS } from '../features/ukTies/content';
import { ninetyDayHint, tiesVerdict, unansweredNote } from '../features/ukTies/model';
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
    ninetyDays: ninetyDayHint(answers, result, [taxYearLabel(y1), taxYearLabel(y2)]),
  };
  const verdict = tiesVerdict(result);

  return (
    <Screen>
      <Muted>{INTRO}</Muted>

      {result.answered ? (
        <Card className="gap-1">
          <Heading>{verdict.heading}</Heading>
          <Muted>{verdict.body}</Muted>
        </Card>
      ) : (
        <Banner title="Answer the first question to use the ties test">{unansweredNote(result)}</Banner>
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
