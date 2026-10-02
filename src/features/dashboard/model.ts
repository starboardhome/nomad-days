/**
 * Pure view-model for the dashboard: turns rule results into display-ready cards.
 * No React here, so it's unit-tested directly.
 */
import type { AppData } from '../../data/schema';
import { countryName } from '../../data/countries';
import { isCustomJurisdiction } from '../../domain/custom';
import { evaluateAll, type JurisdictionResult, type RuleResult } from '../../domain/evaluate';
import { toDayNum, toISO, yearOf, type DayNum } from '../../domain/days';
import type { Level } from '../../domain/status';
import { jurisdictions as bundled, resolveJurisdiction, type Jurisdiction } from '../../rules';
import { formatDate, plural } from '../../ui/format';

export type RuleLine = Readonly<{
  id: string;
  label: string;
  category: 'entry' | 'tax';
  level: Level | 'na';
  headline: string; // "22 days left"
  details: readonly string[]; // "Used 69 of 90 days", "Leave by 19 Oct 2026"
  notes: readonly string[];
}>;

export type Card = Readonly<{
  id: string;
  name: string;
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

export const allJurisdictions = (data: AppData): readonly Jurisdiction[] => [
  ...bundled,
  ...data.customJurisdictions.map((j) => resolveJurisdiction(j, {})),
];

const d = (iso?: string) => (iso ? formatDate(iso) : undefined);
const compact = (xs: readonly (string | undefined | false)[]) => xs.filter((x): x is string => !!x);

const entryLine = ({ rule, status: s }: RuleResult): Pick<RuleLine, 'headline' | 'details'> => {
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
          ? `${plural(s.daysLeft, 'day')} left`
          : `${plural(s.daysLeft, 'day')} available`;
  return {
    headline,
    details: compact([
      (s.present || rule.kind === 'rolling') && usage,
      s.lastSafeDay && (s.present ? `Leave by ${d(s.lastSafeDay)}` : `Arrive today → stay until ${d(s.lastSafeDay)}`),
      s.nextEntry && `${s.level === 'blocked' ? 'Can return' : 'Then back from'} ${d(s.nextEntry)}`,
    ]),
  };
};

const taxLine = ({ rule, status: s }: RuleResult): Pick<RuleLine, 'headline' | 'details'> => {
  if (!s) return { headline: '', details: [] };
  const weighted = rule.kind === 'weightedYears';
  return {
    headline: s.level === 'over' ? 'Tax residency threshold reached' : `${plural(s.daysLeft, 'day')} before tax residency`,
    details: compact([
      `${s.used} of ${s.limit} ${weighted ? 'weighted days' : 'days'} this ${weighted ? 'year' : 'tax year'}`,
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
  const base = { id: r.rule.id, label: r.rule.label, category: r.rule.category, notes: r.rule.notes };
  if (r.applicability !== 'applies' || !r.status) {
    return { ...base, level: 'na', headline: NOT_APPLICABLE[r.applicability as 'exempt'], details: [] };
  }
  return { ...base, level: r.status.level, ...(r.rule.category === 'entry' ? entryLine(r) : taxLine(r)) };
};

const toCard = (res: JurisdictionResult): Card => ({
  id: res.jurisdiction.id,
  ...(isCustomJurisdiction(res.jurisdiction.id) && { ownRulesFor: [...res.jurisdiction.countries][0] }),
  name: res.jurisdiction.name,
  present: res.results.some((r) => r.status?.present),
  level: res.level,
  rules: res.results.map(ruleLine),
});

const byPriority = (a: Card, b: Card) =>
  Number(b.present) - Number(a.present) || SEVERITY[b.level] - SEVERITY[a.level] || a.name.localeCompare(b.name);

export const currentCountry = (data: AppData, today: DayNum): string | undefined =>
  data.stays.find((s) => !s.exit && toDayNum(s.entry) <= today)?.country;

export const buildDashboard = (data: AppData, today: DayNum): Dashboard => {
  const { taxResidence, passports } = data.profile;
  if (!taxResidence) return { cards: [], uncovered: [] };

  const js = allJurisdictions(data);
  const profile = { passports, taxResidence };
  // Bundled rules only matter where you've been; your own rules always show (you added them for a reason,
  // often before the trip)
  const isOwn = (j: Jurisdiction) => isCustomJurisdiction(j.id);
  const results = [
    ...evaluateAll(js.filter((j) => !isOwn(j)), data.stays, profile, today),
    ...evaluateAll(js.filter(isOwn), data.stays, profile, today, true),
  ];
  const cards = results.map(toCard).sort(byPriority);
  const covered = (c: string) => js.some((j) => j.countries.has(c));
  const uncovered = [...new Set(data.stays.map((s) => s.country))]
    .filter((c) => c !== taxResidence && !covered(c))
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));

  return { here: currentCountry(data, today), cards, uncovered };
};

export const todayISO = (today: DayNum) => toISO(today);
export const currentYear = (today: DayNum) => yearOf(today);
