/**
 * Pure view-model for the dashboard: turns rule results into display-ready cards.
 * No React here, so it's unit-tested directly.
 */
import type { AppData } from '../../data/schema';
import { countryName, flagOf } from '../../data/countries';
import { isCustomJurisdiction } from '../../domain/custom';
import { actualStays } from '../../domain/plan';
import { evaluateAll, type JurisdictionResult, type RuleResult } from '../../domain/evaluate';
import { toDayNum, toISO, yearOf, type DayNum } from '../../domain/days';
import type { Level } from '../../domain/status';
import type { Jurisdiction } from '../../rules';
import { allJurisdictions, UK_SRT_RULE } from '../jurisdictions';
import { upcomingPlans, type PlannedItem } from '../plans/model';
import { formatDate, formatShortDate, plural } from '../../ui/format';

export type RuleLine = Readonly<{
  id: string;
  label: string;
  category: 'entry' | 'tax';
  level: Level | 'na';
  headline: string; // "22 days left"
  details: readonly string[]; // "Used 69 of 90 days", "Leave by 19 Oct 2026"
  notes: readonly string[];
  plans: readonly PlanLine[]; // tax tests: what upcoming trips would do, e.g. "153 days before tax residency"
  link?: Readonly<{ label: string; href: '/uk-ties' }>;
  big?: BigNumber; // the headline as a number, when it is one
}>;

/** "21" + "days left after today" */
export type BigNumber = Readonly<{ value: number; caption: string }>;

/** What the collapsed card shows: the rule that runs out first, as one big number where possible */
export type Summary = Readonly<{
  value?: number; //  21
  text: string; //    "days left after today", or "Overstayed" when there's no number
  rule?: string; //   which rule it comes from
  level: Level | 'na';
}>;

export type PlanLine = Readonly<{ text: string; tone: 'ok' | 'danger' }>;

export type Card = Readonly<{
  id: string;
  name: string;
  flag: string; // 🇪🇺, 🇬🇧, …
  summary: Summary;
  present: boolean;
  level: Level;
  ownRulesFor?: string; // country code, if these are the user's own rules (editable)
  rules: readonly RuleLine[];
}>;

export type Dashboard = Readonly<{
  here?: string; //                    country code you're in right now (open stay)
  cards: readonly Card[];
  uncovered: readonly string[]; //     visited countries with no rules (suggest a custom rule)
}>;

const SEVERITY: Record<Level, number> = { over: 3, blocked: 2, warning: 1, ok: 0 };

export { allJurisdictions };

const d = (iso?: string) => (iso ? formatDate(iso) : undefined);
const compact = (xs: readonly (string | undefined | false)[]) => xs.filter((x): x is string => !!x);

/**
 * While you're there, today is already in "Used N", so count what's left from tomorrow
 * (otherwise "Used 1 of 90" next to "90 days left" adds up to 91).
 */
const afterToday = (daysLeft: number, suffix: string, lastDay: string) =>
  daysLeft > 1 ? `${plural(daysLeft - 1, 'day')} ${suffix}` : lastDay;

/** Days left as a number. While you're there, today is already counted, so it's the days after today. */
const bigDays = (s: NonNullable<RuleResult['status']>, whilePresent: string, otherwise: string): BigNumber | undefined =>
  s.level === 'over' || s.level === 'blocked'
    ? undefined
    : s.present
      ? s.daysLeft > 1
        ? { value: s.daysLeft - 1, caption: whilePresent }
        : undefined // "Last day today"
      : { value: s.daysLeft, caption: otherwise };

const entryLine = ({ rule, status: s }: RuleResult): Pick<RuleLine, 'headline' | 'details' | 'big'> => {
  if (!s) return { headline: '', details: [] };
  const usage =
    rule.kind === 'rolling'
      ? `Used ${s.used} of ${s.limit} days in the last ${rule.windowDays}`
      : s.present
        ? `Day ${s.used} of ${s.limit} on this visit`
        : `Up to ${plural(s.limit, 'day')} per visit`;
  const headline =
    s.level === 'over'
      ? 'Overstayed'
      : s.level === 'blocked'
        ? 'No days available'
        : s.present
          ? afterToday(s.daysLeft, 'left after today', 'Last day today')
          : `${plural(s.daysLeft, 'day')} available`;
  return {
    headline,
    big: bigDays(s, 'days left after today', 'days available'),
    details: compact([
      (s.present || rule.kind === 'rolling') && usage,
      s.lastSafeDay && (s.present ? `Leave by ${d(s.lastSafeDay)}` : `Arrive today → stay until ${d(s.lastSafeDay)}`),
      s.nextEntry && `${s.level === 'blocked' ? 'Can return' : 'Then back from'} ${d(s.nextEntry)}`,
    ]),
  };
};

/** The (tax) year ends before the threshold could be reached */
const cappedByYearEnd = (s: NonNullable<RuleResult['status']>): boolean =>
  !!s.lastSafeDay && !!s.resetsOn && toDayNum(s.lastSafeDay) >= toDayNum(s.resetsOn) - 1;

/** Tax headline. When the end of the (tax) year is what limits the count, say so instead of giving a number. */
const taxHeadline = (s: NonNullable<RuleResult['status']>, weighted: boolean): string => {
  if (s.level === 'over') return 'Tax residency threshold reached';
  if (s.level === 'blocked') return 'At the limit: one more day makes you tax resident';
  const yearEnd = s.resetsOn ? toDayNum(s.resetsOn) - 1 : undefined;
  if (yearEnd !== undefined && cappedByYearEnd(s)) {
    return weighted
      ? `Below the limit for the rest of ${yearOf(yearEnd)}`
      : `Below the limit for the rest of the tax year (to ${formatDate(toISO(yearEnd))})`;
  }
  return s.present
    ? afterToday(s.daysLeft, 'left before tax residency', 'Last day before tax residency')
    : `${plural(s.daysLeft, 'day')} before tax residency`;
};

/** "112 of 183 days this tax year" (or, for a rolling test such as New Zealand's, "in the last 365") */
const taxUsage = (rule: RuleResult['rule'], used: number, limit: number) =>
  rule.kind === 'rolling'
    ? `${used} of ${limit} days in the last ${rule.windowDays}`
    : rule.kind === 'weightedYears'
      ? `${used} of ${limit} weighted days this year`
      : `${used} of ${limit} days this tax year`;

const taxLine = ({ rule, status: s }: RuleResult): Pick<RuleLine, 'headline' | 'details' | 'big'> => {
  if (!s) return { headline: '', details: [] };
  const weighted = rule.kind === 'weightedYears';
  return {
    headline: taxHeadline(s, weighted),
    big: cappedByYearEnd(s) ? undefined : bigDays(s, 'days left before tax residency', 'days before tax residency'),
    details: compact([
      taxUsage(rule, s.used, s.limit),
      s.lastSafeDay && s.level !== 'over' && `Safe until ${d(s.lastSafeDay)} if you ${s.present ? 'stay' : 'arrive today'}`,
      s.resetsOn && `Count resets ${d(s.resetsOn)}`,
    ]),
  };
};

const NOT_APPLICABLE: Record<Exclude<RuleResult['applicability'], 'applies'>, string> = {
  exempt: 'Doesn’t apply to you',
  visaRequired: 'Visa needed: your passports aren’t eligible',
};

export const ruleLine = (r: RuleResult): RuleLine => {
  const base = { id: r.rule.id, label: r.rule.label, category: r.rule.category, notes: r.rule.notes, plans: [] };
  if (r.applicability !== 'applies' || !r.status) {
    return { ...base, level: 'na', headline: NOT_APPLICABLE[r.applicability as 'exempt'], details: [] };
  }
  return { ...base, level: r.status.level, ...(r.rule.category === 'entry' ? entryLine(r) : taxLine(r)) };
};

/** For a tax test: the estimate after each upcoming trip that counts toward it */
const planLines = (r: RuleResult, upcoming: readonly PlannedItem[], today: DayNum): PlanLine[] => {
  if (r.rule.category !== 'tax' || r.applicability !== 'applies') return [];
  const year = yearOf(today);
  return upcoming.flatMap(({ trip, check }): PlanLine[] => {
    const label = `With your ${trip.plan} trip (${formatShortDate(trip.entry, year)} – ${formatShortDate(trip.exit, year)})`;
    const issue = check.issues.find((i) => i.ruleId === r.rule.id);
    if (issue) return [{ tone: 'danger', text: `${label}: tax resident from ${formatDate(issue.on)}` }];
    const after = check.taxAfter.find((t) => t.ruleId === r.rule.id);
    if (!after) return [];
    // The trip may end in a later tax year than today's count
    const laterYear = after.resetsOn && after.resetsOn !== r.status?.resetsOn;
    const period =
      r.rule.kind === 'rolling'
        ? ` days in the last ${r.rule.windowDays}`
        : laterYear
          ? ` in the tax year to ${formatDate(toISO(toDayNum(after.resetsOn!) - 1))}`
          : ' this tax year';
    return [{ tone: 'ok', text: `${label}: ${plural(after.daysLeft, 'day')} before tax residency (${after.used} of ${after.limit}${period})` }];
  });
};

/** 🇪🇺 for Schengen, the country's flag for a single-country jurisdiction */
export const flagFor = (j: Jurisdiction): string =>
  j.id === 'schengen' ? '🇪🇺' : j.countries.size === 1 ? flagOf([...j.countries][0]) : '🌍';

/**
 * The rule that matters most right now: the most severe level, then the fewest days left.
 * A tax test that can't be reached before the year ends has no number and comes last.
 */
export const summarize = (rules: readonly RuleLine[]): Summary => {
  const live = rules.filter((r) => r.level !== 'na');
  if (!live.length) return { text: rules[0]?.headline ?? 'No limits apply to you', level: 'na' };
  const rank = (r: RuleLine) => r.big?.value ?? (r.level === 'ok' ? Infinity : 0);
  const [top] = [...live].sort((a, b) => SEVERITY[b.level as Level] - SEVERITY[a.level as Level] || rank(a) - rank(b));
  return top.big
    ? { value: top.big.value, text: top.big.caption, rule: top.label, level: top.level }
    : { text: top.headline, rule: top.label, level: top.level };
};

const toCard = (res: JurisdictionResult, upcoming: readonly PlannedItem[], today: DayNum, answeredTies: boolean): Card => {
  const rules = res.results.map((r) => ({ ...ruleLine(r), plans: planLines(r, upcoming, today), ...tiesLink(r, answeredTies) }));
  return {
    id: res.jurisdiction.id,
    ...(isCustomJurisdiction(res.jurisdiction.id) && { ownRulesFor: [...res.jurisdiction.countries][0] }),
    name: res.jurisdiction.name,
    flag: flagFor(res.jurisdiction),
    summary: summarize(rules),
    present: res.results.some((r) => r.status?.present),
    level: res.level,
    rules,
  };
};

/** The UK 183-day test can be lowered by your ties: link to the questions */
const tiesLink = (r: RuleResult, answered: boolean): Pick<RuleLine, 'link'> =>
  r.rule.id === UK_SRT_RULE && r.applicability === 'applies'
    ? { link: { label: answered ? 'Your UK ties · Edit' : 'Check your UK ties (they can lower this limit)', href: '/uk-ties' } }
    : {};

const byPriority = (a: Card, b: Card) =>
  Number(b.present) - Number(a.present) || SEVERITY[b.level] - SEVERITY[a.level] || a.name.localeCompare(b.name);

export const currentCountry = (data: AppData, today: DayNum): string | undefined =>
  actualStays(data.stays).find((s) => !s.exit && toDayNum(s.entry) <= today)?.country;

export const buildDashboard = (data: AppData, today: DayNum): Dashboard => {
  const { taxResidence, passports } = data.profile;
  if (!taxResidence) return { cards: [], uncovered: [] };

  const js = allJurisdictions(data, today);
  const profile = { passports, taxResidence };
  const real = actualStays(data.stays); // planned trips only count once you confirm them
  const upcoming = upcomingPlans(data, today);
  // Bundled rules show where you've been or plan to go; your own rules always show (you added them
  // for a reason, often before the trip)
  const relevant = (j: Jurisdiction) =>
    isCustomJurisdiction(j.id) || [...real, ...upcoming.map((p) => p.trip)].some((s) => j.countries.has(s.country));
  const results = evaluateAll(js.filter(relevant), real, profile, today, true);
  const answeredTies = data.settings.ukTies?.leaver !== undefined;
  const cards = results.map((r) => toCard(r, upcoming, today, answeredTies)).sort(byPriority);
  const covered = (c: string) => js.some((j) => j.countries.has(c));
  const uncovered = [...new Set(data.stays.map((s) => s.country))]
    .filter((c) => c !== taxResidence && !covered(c))
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));

  return { here: currentCountry(data, today), cards, uncovered };
};

export const todayISO = (today: DayNum) => toISO(today);
export const currentYear = (today: DayNum) => yearOf(today);
