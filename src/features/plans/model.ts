/**
 * Pure view-model for planned trips: checks each one and turns the result into
 * a short verdict for lists and a fuller one for the trip form and reminders.
 */
import { countryName } from '../../data/countries';
import type { AppData, StayRecord } from '../../data/schema';
import type { DayNum } from '../../domain/days';
import { awaitingConfirmation, checkPlannedTrip, upcomingTrips, type PlannedTrip, type TripCheck } from '../../domain/plan';
import { formatDate, plural } from '../../ui/format';
import { allJurisdictions } from '../jurisdictions';

export type Verdict = Readonly<{
  tone: 'ok' | 'warn' | 'danger' | 'unknown';
  short: string; //              for list rows, e.g. "✓ Fits · 5 days to spare"
  title: string; //              for banners
  details: readonly string[];
}>;

export const checkTrip = (trip: PlannedTrip, data: AppData, today: DayNum): TripCheck =>
  checkPlannedTrip(
    trip,
    data.stays,
    allJurisdictions(data),
    { passports: data.profile.passports, taxResidence: data.profile.taxResidence ?? '' },
    today,
  );

const issueLine = (i: TripCheck['issues'][number]) =>
  i.category === 'tax'
    ? `You'd become tax resident in ${i.jurisdiction} on ${formatDate(i.on)} (${i.rule.toLowerCase()}).`
    : `Over the ${i.jurisdiction} limit from ${formatDate(i.on)} (${i.rule.toLowerCase()}).`;

export const verdictFor = (check: TripCheck, country: string): Verdict => {
  const visa = check.visaNeeded.length ? [`You'd need a visa for ${check.visaNeeded.join(', ')}.`] : [];
  if (check.issues.length) {
    const first = [...check.issues].sort((a, b) => a.on.localeCompare(b.on))[0];
    return {
      tone: 'danger',
      short: first.category === 'tax' ? `✗ Tax resident from ${formatDate(first.on)}` : `✗ Over the limit from ${formatDate(first.on)}`,
      title: first.category === 'tax' ? `Would make you tax resident in ${first.jurisdiction}` : `Would break the ${first.jurisdiction} limit`,
      details: [...check.issues.map(issueLine), ...visa],
    };
  }
  if (visa.length) return { tone: 'warn', short: 'Visa needed', title: visa[0].replace(/\.$/, ''), details: ['None of your passports can visit visa-free.'] };
  if (!check.covered) {
    return {
      tone: 'unknown',
      short: 'Not checked',
      title: `No rules for ${countryName(country)} yet`,
      details: ['Add your own rules for this country to check the trip.'],
    };
  }
  const spare = check.spare;
  return {
    tone: 'ok',
    short: spare ? `✓ Fits · ${plural(spare.days, 'day')} to spare` : '✓ Fits',
    title: spare ? `Fits, with ${plural(spare.days, 'day')} to spare in ${spare.jurisdiction}` : 'Fits within your limits',
    details: [],
  };
};

export type PlannedItem = Readonly<{ trip: StayRecord & PlannedTrip; check: TripCheck; verdict: Verdict }>;

const itemFor = (trip: StayRecord, data: AppData, today: DayNum): PlannedItem => {
  const planned = trip as StayRecord & PlannedTrip;
  const check = checkTrip(planned, data, today);
  return { trip: planned, check, verdict: verdictFor(check, trip.country) };
};

/** Planned trips still ahead, soonest first, each with its verdict */
export const upcomingPlans = (data: AppData, today: DayNum): readonly PlannedItem[] =>
  upcomingTrips(data.stays, today).map((t) => itemFor(t, data, today));

/** Planned trips whose start date has arrived: "Did you go?" */
export const plansToConfirm = (data: AppData, today: DayNum): readonly StayRecord[] => awaitingConfirmation(data.stays, today);
