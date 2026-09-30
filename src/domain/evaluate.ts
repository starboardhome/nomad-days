import type { Jurisdiction, Rule, RuleKind, RuleOf } from '../rules/schema';
import { applicability, type Applicability, type Profile } from './applicability';
import { localToday, type DayNum } from './days';
import { evaluatePerVisit } from './evaluators/perVisit';
import { evaluateRolling } from './evaluators/rolling';
import { evaluateTaxYear } from './evaluators/taxYear';
import { evaluateWeightedYears } from './evaluators/weightedYears';
import { presenceIn, type Presence, type Stay } from './presence';
import type { Level, RuleStatus } from './status';

type Evaluator<K extends RuleKind> = (rule: RuleOf<K>, p: Presence, today: DayNum) => RuleStatus;

/** Add a new rule kind: add its schema, write an evaluator, register it here. */
const evaluators: { [K in RuleKind]: Evaluator<K> } = {
  rolling: evaluateRolling,
  perVisit: evaluatePerVisit,
  taxYear: evaluateTaxYear,
  weightedYears: evaluateWeightedYears,
};

export const evaluateRule = (rule: Rule, p: Presence, today: DayNum): RuleStatus =>
  (evaluators[rule.kind] as Evaluator<RuleKind>)(rule as never, p, today);

export type RuleResult = Readonly<{
  rule: Rule;
  applicability: Applicability;
  status?: RuleStatus; // only when applicability === 'applies'
}>;

export type JurisdictionResult = Readonly<{
  jurisdiction: Jurisdiction;
  results: readonly RuleResult[];
  level: Level; // worst level across applicable rules
}>;

const SEVERITY: readonly Level[] = ['ok', 'warning', 'blocked', 'over'];
const worst = (levels: readonly Level[]): Level =>
  levels.reduce<Level>((a, b) => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a), 'ok');

export const evaluateJurisdiction = (
  jurisdiction: Jurisdiction,
  stays: readonly Stay[],
  profile: Profile,
  today: DayNum = localToday(),
): JurisdictionResult => {
  const results = jurisdiction.rules.map((rule): RuleResult => {
    const a = applicability(rule, jurisdiction, profile);
    return a !== 'applies'
      ? { rule, applicability: a }
      : {
          rule,
          applicability: a,
          status: evaluateRule(rule, presenceIn(stays, jurisdiction.countries, rule.counting, today), today),
        };
  });
  return {
    jurisdiction,
    results,
    level: worst(results.flatMap((r) => (r.status ? [r.status.level] : []))),
  };
};

/** Evaluate every jurisdiction the person has visited (or all, if `all` is true) */
export const evaluateAll = (
  jurisdictions: readonly Jurisdiction[],
  stays: readonly Stay[],
  profile: Profile,
  today: DayNum = localToday(),
  all = false,
): readonly JurisdictionResult[] =>
  jurisdictions
    .filter((j) => all || stays.some((s) => j.countries.has(s.country)))
    .map((j) => evaluateJurisdiction(j, stays, profile, today));
