import { z } from 'zod';

// ── Primitives ──────────────────────────────────────────────
export const Iso2Schema = z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 code, e.g. "FR"');
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
/** A country code ("AU") or a group reference ("@EU") defined in groups.json */
const CountryRefSchema = z.string().regex(/^([A-Z]{2}|@[A-Z_]+)$/, '"AU" or "@GROUP"');
const IdSchema = z.string().regex(/^[a-z0-9-]+$/, 'lowercase-kebab-case');
const PositiveInt = z.number().int().positive();

export const CountingSchema = z.enum([
  'anyPartOfDay', // entry and exit days both count (Schengen, US)
  'midnight', //     only days you are present at midnight count (UK SRT)
]);

// ── Rule kinds ──────────────────────────────────────────────
const RuleBase = z.object({
  id: IdSchema,
  category: z.enum(['entry', 'tax']),
  label: z.string().min(1),
  counting: CountingSchema,
  /** Holders of any of these passports are exempt from the rule */
  exemptNationalities: z.array(CountryRefSchema).default([]),
  /** If set, only holders of these passports can use the rule (e.g. Visa Waiver) */
  eligibleNationalities: z.array(CountryRefSchema).optional(),
  notes: z.array(z.string()).default([]),
  sources: z.array(z.string().startsWith('https://')).min(1),
});

/** At most `maxDays` present in any rolling `windowDays` window (Schengen 90/180) */
const RollingSchema = RuleBase.extend({
  kind: z.literal('rolling'),
  maxDays: PositiveInt,
  windowDays: PositiveInt,
});

/** Maximum length of a single continuous visit (UK 6 months, US VWP 90 days) */
const PerVisitSchema = RuleBase.extend({
  kind: z.literal('perVisit'),
  limit: z.object({ unit: z.enum(['days', 'months']), value: PositiveInt }),
});

/** Resident once `threshold` days are reached in a (tax) year starting on `yearStart` */
const TaxYearSchema = RuleBase.extend({
  kind: z.literal('taxYear'),
  threshold: PositiveInt,
  yearStart: z.string().regex(/^\d{2}-\d{2}$/, 'MM-DD, e.g. "04-06"'),
});

/**
 * Weighted multi-year test (US substantial presence test):
 * resident if days(current year) ≥ minCurrentYearDays
 *         AND Σ days(year − i) / yearDivisors[i] ≥ threshold
 */
const WeightedYearsSchema = RuleBase.extend({
  kind: z.literal('weightedYears'),
  threshold: PositiveInt,
  minCurrentYearDays: z.number().int().nonnegative(),
  yearDivisors: z.array(PositiveInt).min(1),
});

export const RuleSchema = z.discriminatedUnion('kind', [
  RollingSchema,
  PerVisitSchema,
  TaxYearSchema,
  WeightedYearsSchema,
]);

export const JurisdictionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  countries: z.array(CountryRefSchema).min(1),
  lastReviewed: IsoDateSchema,
  rules: z.array(RuleSchema).min(1),
});

export const GroupsSchema = z.record(z.string().regex(/^[A-Z_]+$/), z.array(Iso2Schema).min(1));

// ── Types ───────────────────────────────────────────────────
export type Counting = z.infer<typeof CountingSchema>;
export type RawRule = z.infer<typeof RuleSchema>;
export type RawJurisdiction = z.infer<typeof JurisdictionSchema>;
export type Groups = z.infer<typeof GroupsSchema>;

type Resolve<R> = Omit<R, 'exemptNationalities' | 'eligibleNationalities'> & {
  exemptNationalities: ReadonlySet<string>;
  eligibleNationalities?: ReadonlySet<string>;
};

/** A rule with "@GROUP" references expanded to country codes (distributes over the union) */
export type Rule = RawRule extends infer R ? (R extends RawRule ? Resolve<R> : never) : never;
export type RuleKind = Rule['kind'];
export type RuleOf<K extends RuleKind> = Extract<Rule, { kind: K }>;

export type Jurisdiction = Readonly<{
  id: string;
  name: string;
  countries: ReadonlySet<string>;
  lastReviewed: string;
  rules: readonly Rule[];
}>;
