import type { AppData } from '../data/schema';
import type { DayNum } from '../domain/days';
import { actualStays } from '../domain/plan';
import { ukTies, type TieName, type UkTiesResult } from '../domain/ukTies';
import { jurisdictions as bundled, resolveJurisdiction, type Jurisdiction } from '../rules';
import { plural } from '../ui/format';

export const UK_SRT_RULE = 'uk-srt-automatic-183';

export const TIE_LABEL: Record<TieName, string> = {
  family: 'family',
  accommodation: 'accommodation',
  work: 'work',
  ninetyDays: '90-day',
  country: 'country',
};

/** "2 UK ties (family, accommodation)" */
export const tiesSummary = (t: UkTiesResult): string => {
  const names = (Object.keys(t.ties) as TieName[]).filter((k) => t.ties[k]).map((k) => TIE_LABEL[k]);
  return `${plural(t.count, 'UK tie')}${names.length ? ` (${names.join(', ')})` : ''}`;
};

/** The UK 183-day rule, adjusted for your answers to the sufficient ties questions */
const withUkTies = (j: Jurisdiction, data: AppData, today: DayNum): Jurisdiction => {
  const answers = data.settings.ukTies;
  if (answers?.leaver === undefined || !j.rules.some((r) => r.id === UK_SRT_RULE)) return j;
  const t = ukTies(answers, actualStays(data.stays), today);
  const note =
    t.threshold < 183
      ? `From your answers you have ${tiesSummary(t)}, so ${t.threshold} days in a tax year would make you UK resident (sufficient ties test).`
      : `From your answers you have ${tiesSummary(t)}: not enough for the sufficient ties test, so the 183-day test applies.`;
  return {
    ...j,
    rules: j.rules.map((r) =>
      r.id === UK_SRT_RULE && r.kind === 'taxYear'
        ? {
            ...r,
            threshold: t.threshold,
            label: t.threshold < 183 ? `Statutory Residence Test: ${t.threshold} days with your UK ties` : r.label,
            notes: [note, ...r.notes],
          }
        : r,
    ),
  };
};

/** Bundled jurisdictions (UK tax rule adjusted for your ties) plus the user's own rules */
export const allJurisdictions = (data: AppData, today: DayNum): readonly Jurisdiction[] => [
  ...bundled.map((j) => withUkTies(j, data, today)),
  ...data.customJurisdictions.map((j) => resolveJurisdiction(j, {})),
];
