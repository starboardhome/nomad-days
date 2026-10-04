/**
 * Wording for the UK ties screen: what counts, and what would change the limit.
 */
import { residenceThreshold, type UkAnswers, type UkTiesResult } from '../../domain/ukTies';
import { plural } from '../../ui/format';
import { tiesSummary } from '../jurisdictions';

/** Hint under the 90-day question. A Yes counts by itself; logged trips are only a bonus. `years` labels the last two tax years. */
export const ninetyDayHint = (answers: UkAnswers, r: UkTiesResult, years: readonly [string, string]): string => {
  const [a, b] = r.fromTrips.priorYears;
  const logged = `${years[0]}: ${plural(a, 'day')}, ${years[1]}: ${plural(b, 'day')}`;
  if (r.fromTrips.ninetyDays) return `Your logged trips already show more than 90 days (${logged}), so this counts whatever you answer.`;
  if (answers.ninetyDays) return 'Counted as a tie from your answer. You don’t need to log those trips.';
  return `Answer Yes if you know you spent more than 90 days in the UK in either year. You don’t need to log those trips.${
    a || b ? ` Logged so far: ${logged}.` : ''
  }`;
};

/** Fewest ties that would lower the limit below 183 days */
const tiesToLower = (leaver: boolean): number => [1, 2, 3, 4].find((t) => residenceThreshold(t, leaver) < 183) ?? 5;

/** Summary card once the leaver question is answered */
export const tiesVerdict = (r: UkTiesResult): Readonly<{ heading: string; body: string }> => {
  const role = r.leaver ? 'a leaver' : 'an arriver';
  const heading = `UK resident from ${r.threshold} days in a tax year (up to ${r.threshold - 1} is fine)`;
  if (r.threshold < 183) return { heading, body: `You have ${tiesSummary(r)} as ${role}. The Days tab now uses this limit.` };
  const need = tiesToLower(r.leaver);
  return {
    heading,
    body: `You have ${tiesSummary(r)}. As ${role}, you need ${plural(need, 'UK tie')} for a ${residenceThreshold(need, r.leaver)}-day limit, so the 183-day test still applies.`,
  };
};

/** Banner before the leaver question is answered */
export const unansweredNote = (r: UkTiesResult): string =>
  r.count
    ? `Your other answers are saved: ${tiesSummary(r)}. They only count once you answer whether you were UK resident in any of the last 3 tax years. Until then, only the 183-day test is checked.`
    : 'Until then, only the 183-day test is checked.';
