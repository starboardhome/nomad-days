/**
 * Pure form model for user-defined ("your own") rules: one jurisdiction per country,
 * with an optional entry limit and an optional tax-days test. No React here.
 */
import { countryLabel, countryName } from '../../data/countries';
import { buildCustomJurisdiction, customJurisdictionId, NO_SOURCE, type CustomRuleInput } from '../../domain/custom';
import { jurisdictionsForCountry, type Counting, type RawJurisdiction, type RawRule } from '../../rules';

export type EntryMode = 'none' | 'perVisit' | 'rolling';

/** Numbers are kept as typed text so fields can be cleared while editing */
export type RuleDraft = Readonly<{
  country?: string;
  entry: EntryMode;
  perVisitDays: string;
  rollingMax: string;
  rollingWindow: string;
  tax: boolean;
  taxThreshold: string;
  taxYearStart: string; // MM-DD
  taxCounting: Counting;
  source: string;
}>;

export type RuleCheck = Readonly<{ errors: readonly string[]; warnings: readonly string[] }>;

type Option<T> = Readonly<{ value: T; label: string }>;

export const ENTRY_OPTIONS: readonly Option<EntryMode>[] = [
  { value: 'perVisit', label: 'Per visit' },
  { value: 'rolling', label: 'Rolling window' },
  { value: 'none', label: 'No limit' },
];

export const YEAR_START_OPTIONS: readonly Option<string>[] = [
  { value: '01-01', label: '1 Jan' },
  { value: '04-01', label: '1 Apr' },
  { value: '04-06', label: '6 Apr' },
  { value: '07-01', label: '1 Jul' },
  { value: '10-01', label: '1 Oct' },
];

export const COUNTING_OPTIONS: readonly Option<Counting>[] = [
  { value: 'anyPartOfDay', label: 'Any part of a day' },
  { value: 'midnight', label: 'Nights (at midnight)' },
];

export const PRESETS = [
  { value: 'visit30', label: '30 per visit', patch: { entry: 'perVisit', perVisitDays: '30' } },
  { value: 'visit60', label: '60 per visit', patch: { entry: 'perVisit', perVisitDays: '60' } },
  { value: 'visit90', label: '90 per visit', patch: { entry: 'perVisit', perVisitDays: '90' } },
  { value: 'rolling90', label: '90 in 180', patch: { entry: 'rolling', rollingMax: '90', rollingWindow: '180' } },
  { value: 'tax183', label: '183 tax days', patch: { tax: true, taxThreshold: '183' } },
] as const satisfies readonly (Option<string> & { patch: Partial<RuleDraft> })[];

export type PresetId = (typeof PRESETS)[number]['value'];

export const emptyRuleDraft = (country?: string): RuleDraft => ({
  country,
  entry: 'perVisit',
  perVisitDays: '',
  rollingMax: '',
  rollingWindow: '180',
  tax: false,
  taxThreshold: '183',
  taxYearStart: '01-01',
  taxCounting: 'anyPartOfDay',
  source: '',
});

const presetPatch = (id: PresetId): Partial<RuleDraft> => PRESETS.find((p) => p.value === id)!.patch;

export const applyPreset = (draft: RuleDraft, id: PresetId): RuleDraft => ({ ...draft, ...presetPatch(id) });

/** Presets the draft currently matches (shown as selected chips) */
export const activePresets = (draft: RuleDraft): PresetId[] =>
  PRESETS.filter((p) => Object.entries(p.patch).every(([k, v]) => draft[k as keyof RuleDraft] === v)).map((p) => p.value);

/** "30" → 30; blank, zero or anything else → undefined */
export const parseCount = (text: string): number | undefined => (/^\d{1,4}$/.test(text) && +text > 0 ? +text : undefined);

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isMonthDay = (s: string) => {
  const m = /^(\d{2})-(\d{2})$/.exec(s);
  return !!m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= DAYS_IN_MONTH[+m[1] - 1];
};

/** Built-in jurisdictions covering a country (own rules would duplicate them) */
const bundledFor = (country?: string) => (country ? jurisdictionsForCountry(country).map((j) => j.name) : []);

/** Errors block saving; warnings are shown but allowed */
export const checkRuleDraft = (
  draft: RuleDraft,
  saved: readonly RawJurisdiction[],
  editingId?: string,
): RuleCheck => {
  const perVisit = parseCount(draft.perVisitDays);
  const [max, window] = [parseCount(draft.rollingMax), parseCount(draft.rollingWindow)];
  const threshold = parseCount(draft.taxThreshold);

  const errors = [
    !draft.country && 'Choose a country.',
    draft.entry === 'none' && !draft.tax && 'Add an entry limit, a tax-days test, or both.',
    draft.entry === 'perVisit' && !perVisit && 'Enter how many days each visit can last.',
    draft.entry === 'rolling' && (!max || !window) && 'Enter the days allowed and the window length.',
    draft.entry === 'rolling' && max && window && max > window && 'The days allowed can’t be more than the window.',
    draft.tax && (!threshold || threshold > 366) && 'Enter a tax-days threshold between 1 and 366.',
    draft.tax && !isMonthDay(draft.taxYearStart) && 'Choose when the tax year starts.',
    draft.source.trim() && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(draft.source.trim()) && 'The source link must start with https://',
    bundledFor(draft.country).length > 0 &&
      `${countryName(draft.country!)} already has built-in rules (${bundledFor(draft.country).join(', ')}). Your own rules are for countries the app doesn’t cover.`,
  ].filter((e): e is string => !!e);

  const c = draft.country;
  const replaces = c && customJurisdictionId(c) !== editingId && saved.some((j) => j.id === customJurisdictionId(c));
  const warnings = [replaces && `You already have rules for ${countryLabel(c)}. Saving replaces them.`].filter(
    (w): w is string => !!w,
  );

  return { errors, warnings };
};

// ── Draft ⇄ stored jurisdiction ───────────────────────────
const entryRule = (d: RuleDraft): CustomRuleInput | undefined => {
  const base = { category: 'entry', counting: 'anyPartOfDay' } as const;
  if (d.entry === 'perVisit') {
    const days = parseCount(d.perVisitDays)!;
    return { ...base, kind: 'perVisit', label: `Up to ${days} days per visit`, limit: { unit: 'days', value: days } };
  }
  if (d.entry === 'rolling') {
    const [maxDays, windowDays] = [parseCount(d.rollingMax)!, parseCount(d.rollingWindow)!];
    return { ...base, kind: 'rolling', label: `${maxDays} days in any ${windowDays}`, maxDays, windowDays };
  }
  return undefined;
};

const taxRule = (d: RuleDraft): CustomRuleInput | undefined => {
  if (!d.tax) return undefined;
  const threshold = parseCount(d.taxThreshold)!;
  return {
    category: 'tax',
    kind: 'taxYear',
    label: `Tax residency after ${threshold} days`,
    counting: d.taxCounting,
    threshold,
    yearStart: d.taxYearStart,
  };
};

/** The stored jurisdiction for a valid draft. Throws if the draft has errors. */
export const toJurisdiction = (draft: RuleDraft, today: string): RawJurisdiction => {
  const errors = checkRuleDraft(draft, []).errors;
  if (errors.length) throw new Error(errors.join(' '));
  const rules = [entryRule(draft), taxRule(draft)].filter((r): r is CustomRuleInput => !!r);
  const country = draft.country!;
  return buildCustomJurisdiction(country, countryName(country), rules, today, draft.source.trim() || NO_SOURCE);
};

const find = <K extends RawRule['kind']>(j: RawJurisdiction, kind: K) =>
  j.rules.find((r): r is Extract<RawRule, { kind: K }> => r.kind === kind);

/** Load a saved jurisdiction back into the form */
export const fromJurisdiction = (j: RawJurisdiction): RuleDraft => {
  const [perVisit, rolling, tax] = [find(j, 'perVisit'), find(j, 'rolling'), find(j, 'taxYear')];
  const empty = emptyRuleDraft(j.countries[0]);
  return {
    ...empty,
    entry: perVisit ? 'perVisit' : rolling ? 'rolling' : 'none',
    ...(perVisit && { perVisitDays: String(perVisit.limit.value) }),
    ...(rolling && { rollingMax: String(rolling.maxDays), rollingWindow: String(rolling.windowDays) }),
    ...(tax && {
      tax: true,
      taxThreshold: String(tax.threshold),
      taxYearStart: tax.yearStart,
      taxCounting: tax.counting,
    }),
    source: j.rules[0].sources.find((s) => s !== NO_SOURCE) ?? '',
  };
};

/** One-line description for lists, e.g. "Up to 30 days per visit · Tax residency after 183 days" */
export const ruleSummary = (j: RawJurisdiction): string => j.rules.map((r) => r.label).join(' · ');
