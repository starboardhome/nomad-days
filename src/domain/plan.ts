/**
 * Planned trips: will a future trip fit within the rules?
 *
 * - Booked trips count toward each other (and toward later trips).
 * - A maybe trip is checked on top of your trips and booked plans, without affecting anything else.
 * - Real counts (dashboard, reminders) ignore planned trips until you confirm them.
 */
import type { Jurisdiction, Rule, RuleOf } from '../rules/schema';
import { applicability, type Profile } from './applicability';
import { toDayNum, toISO, range, type DayNum, type ISODate } from './days';
import { evaluateRule } from './evaluate';
import { visitEnd } from './evaluators/perVisit';
import { consecutiveAllowance, usedOn } from './evaluators/rolling';
import { presenceIn, runStart, type Presence, type Stay } from './presence';

export type Plan = 'booked' | 'maybe';
export type TripLike = Stay & Readonly<{ id: string; plan?: Plan }>;
export type PlannedTrip = TripLike & Readonly<{ plan: Plan; exit: ISODate }>;

export const isPlanned = (s: TripLike): s is PlannedTrip => !!s.plan;
/** Trips that happened or are happening: the only ones real counts use */
export const actualStays = <T extends TripLike>(stays: readonly T[]): T[] => stays.filter((s) => !s.plan);

/** Planned trips that have started: ask "Did you go?" */
export const awaitingConfirmation = <T extends TripLike>(stays: readonly T[], today: DayNum): T[] =>
  stays.filter((s) => isPlanned(s) && toDayNum(s.entry) <= today).sort((a, b) => a.entry.localeCompare(b.entry));

/** Planned trips still in the future, soonest first */
export const upcomingTrips = <T extends TripLike>(stays: readonly T[], today: DayNum): T[] =>
  stays.filter((s) => isPlanned(s) && toDayNum(s.entry) > today).sort((a, b) => a.entry.localeCompare(b.entry));

/**
 * The trips assumed to happen when checking `trip`: real trips plus booked plans (plus `trip` itself).
 * A trip you're still on is assumed to continue until your next planned trip starts (a travel day).
 */
export const scenarioFor = (trip: PlannedTrip, stays: readonly TripLike[], today: DayNum): Stay[] => {
  const planned = [...stays.filter((s) => s.plan === 'booked' && s.id !== trip.id), trip];
  const nextDeparture = (from: ISODate) =>
    planned.map((p) => p.entry).filter((e) => e >= from && toDayNum(e) > today).sort()[0];
  const real = actualStays(stays).filter((s) => s.id !== trip.id).map((s) =>
    s.exit ? s : { ...s, exit: nextDeparture(s.entry) ?? toISO(Math.max(today, toDayNum(s.entry))) },
  );
  return [...real, ...planned];
};

export type TripIssue = Readonly<{ ruleId: string; jurisdiction: string; rule: string; category: Rule['category']; on: ISODate }>;

/** Tax-day test after the trip: how many days you'd have left before becoming resident */
export type TaxAfter = Readonly<{
  ruleId: string;
  jurisdiction: string;
  used: number; //      days counted this tax year, including the trip
  limit: number;
  daysLeft: number; //  more days before you'd become resident (not capped at the end of the tax year)
  resetsOn?: ISODate;
}>;

export type TripCheck = Readonly<{
  covered: boolean; //                                      false: no rules for this country
  issues: readonly TripIssue[]; //                          rules this trip would break, and from when
  visaNeeded: readonly string[]; //                        jurisdictions none of your passports can enter visa-free
  spare?: Readonly<{ days: number; jurisdiction: string }>; // tightest entry-rule margin if it fits
  taxAfter: readonly TaxAfter[]; //                         tax tests the trip doesn't break
}>;

/** Is `rule` broken on `day`, given presence `p`? */
const breachedOn = (rule: Rule, p: Presence, day: DayNum): boolean => {
  switch (rule.kind) {
    case 'rolling':
      return usedOn(p, rule, day) > rule.maxDays;
    case 'perVisit':
      return p.has(day) && day > visitEnd(rule, runStart(p, day));
    default:
      return evaluateRule(rule, p, day).level === 'over';
  }
};

/** Over a tax threshold on the trip's first day, counting everything except the trip */
const alreadyOver = (rule: Rule, scenario: readonly Stay[], trip: PlannedTrip, countries: ReadonlySet<string>, entry: DayNum) =>
  evaluateRule(rule, presenceIn(scenario.filter((s) => s !== trip), countries, rule.counting, entry), entry).level === 'over';

/** How many more days you could stay right after the trip ends (entry rules) */
const margin = (rule: RuleOf<'rolling'> | RuleOf<'perVisit'>, p: Presence, exit: DayNum): number =>
  rule.kind === 'rolling'
    ? consecutiveAllowance(p, rule, exit + 1)
    : Math.max(0, visitEnd(rule, runStart(p, exit)) - exit);

export const checkPlannedTrip = (
  trip: PlannedTrip,
  stays: readonly TripLike[],
  jurisdictions: readonly Jurisdiction[],
  profile: Profile,
  today: DayNum,
): TripCheck => {
  const relevant = jurisdictions.filter((j) => j.countries.has(trip.country));
  const scenario = scenarioFor(trip, stays, today);
  const [entry, exit] = [toDayNum(trip.entry), toDayNum(trip.exit)];
  const issues: TripIssue[] = [];
  const visaNeeded = new Set<string>();
  let spare: TripCheck['spare'];
  const taxAfter: TaxAfter[] = [];

  for (const j of relevant) {
    for (const rule of j.rules) {
      const a = applicability(rule, j, profile);
      if (a === 'visaRequired') visaNeeded.add(j.name);
      if (a !== 'applies') continue;
      const p = presenceIn(scenario, j.countries, rule.counting, exit);
      // Already tax resident there this tax year before the trip: the trip changes nothing
      if (rule.category === 'tax' && alreadyOver(rule, scenario, trip, j.countries, entry)) continue;
      const first = range(entry, exit).find((d) => breachedOn(rule, p, d));
      if (first !== undefined) {
        issues.push({ ruleId: rule.id, jurisdiction: j.name, rule: rule.label, category: rule.category, on: toISO(first) });
      } else if (rule.kind === 'rolling' || rule.kind === 'perVisit') {
        const days = margin(rule, p, exit);
        if (!spare || days < spare.days) spare = { days, jurisdiction: j.name };
      } else {
        // As of the day after the trip: days already counted, including the trip
        const after = evaluateRule(rule, p, exit + 1);
        const daysLeft = Math.max(0, Math.ceil(after.limit - after.used - 1e-9) - 1); // reaching the limit = resident
        taxAfter.push({ ruleId: rule.id, jurisdiction: j.name, used: after.used, limit: after.limit, daysLeft, resetsOn: after.resetsOn });
      }
    }
  }
  return { covered: relevant.length > 0, issues, visaNeeded: [...visaNeeded], spare, taxAfter };
};
