/**
 * UK Statutory Residence Test: the "sufficient ties" test (Finance Act 2013, Schedule 45).
 *
 * Below 183 days you can still be UK resident if you have enough UK ties for the number of
 * days you spend there. Leavers (UK resident in any of the 3 previous tax years) need fewer ties.
 * Days are midnights in the UK, counted per tax year (6 April – 5 April).
 */
import { periodStartOnOrBefore, type DayNum } from './days';
import { countBetween, presenceIn, type Stay } from './presence';

export const UK = 'GB';
export const UK_TAX_YEAR_START = '04-06';

export type UkAnswers = Readonly<{
  leaver?: boolean;
  family?: boolean;
  accommodation?: boolean;
  work?: boolean;
  ninetyDays?: boolean;
}>;

export type TieName = 'family' | 'accommodation' | 'work' | 'ninetyDays' | 'country';

/** [from days, ties needed], for 16–182 days. Below the first band the automatic overseas tests apply. */
const BANDS: Record<'leaver' | 'arriver', readonly (readonly [number, number])[]> = {
  leaver: [[16, 4], [46, 3], [91, 2], [121, 1]],
  arriver: [[46, 4], [91, 3], [121, 2]],
};

/** Ties needed to be resident with this many UK days (undefined: not possible below 183) */
export const tiesNeeded = (days: number, leaver: boolean): number | undefined => {
  if (days >= 183) return 0;
  return [...BANDS[leaver ? 'leaver' : 'arriver']].reverse().find(([from]) => days >= from)?.[1];
};

/** Fewest UK days in a tax year that would make you resident, given how many ties you have */
export const residenceThreshold = (ties: number, leaver: boolean): number =>
  BANDS[leaver ? 'leaver' : 'arriver'].find(([, needed]) => ties >= needed)?.[0] ?? 183;

const midnightsIn = (stays: readonly Stay[], country: string, from: DayNum, to: DayNum) =>
  countBetween(presenceIn(stays, new Set([country]), 'midnight', to), from, to);

/** First day of this tax year and of the two before it */
export const ukTaxYears = (today: DayNum): readonly [DayNum, DayNum, DayNum] => {
  const y0 = periodStartOnOrBefore(today, UK_TAX_YEAR_START);
  const y1 = periodStartOnOrBefore(y0 - 1, UK_TAX_YEAR_START);
  return [y0, y1, periodStartOnOrBefore(y1 - 1, UK_TAX_YEAR_START)];
};

/** UK midnights in each of the last two tax years, from your trips */
export const priorUkDays = (stays: readonly Stay[], today: DayNum): readonly [number, number] => {
  const [y0, y1, y2] = ukTaxYears(today);
  return [midnightsIn(stays, UK, y1, y0 - 1), midnightsIn(stays, UK, y2, y1 - 1)];
};

/** Country tie: the UK is (joint) top for midnights so far this tax year */
export const ukIsTopCountry = (stays: readonly Stay[], today: DayNum): boolean => {
  const [y0] = ukTaxYears(today);
  const counts = new Map([...new Set(stays.map((s) => s.country))].map((c) => [c, midnightsIn(stays, c, y0, today)]));
  const uk = counts.get(UK) ?? 0;
  return uk > 0 && [...counts.values()].every((n) => uk >= n);
};

export type UkTiesResult = Readonly<{
  answered: boolean; //                         the leaver question is answered (other ties default to no)
  leaver: boolean;
  ties: Readonly<Record<TieName, boolean>>;
  fromTrips: Readonly<{ priorYears: readonly [number, number]; ninetyDays: boolean; country: boolean }>;
  count: number;
  threshold: number; //                         UK days in a tax year that would make you resident
}>;

export const ukTies = (answers: UkAnswers, stays: readonly Stay[], today: DayNum): UkTiesResult => {
  const leaver = answers.leaver ?? false;
  const priorYears = priorUkDays(stays, today);
  const fromTrips = { priorYears, ninetyDays: priorYears.some((d) => d > 90), country: ukIsTopCountry(stays, today) };
  const ties = {
    family: !!answers.family,
    accommodation: !!answers.accommodation,
    work: !!answers.work,
    ninetyDays: fromTrips.ninetyDays || !!answers.ninetyDays,
    country: leaver && fromTrips.country, // only counts for leavers
  };
  const count = Object.values(ties).filter(Boolean).length;
  return { answered: answers.leaver !== undefined, leaver, ties, fromTrips, count, threshold: residenceThreshold(count, leaver) };
};
