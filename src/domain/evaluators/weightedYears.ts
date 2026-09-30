import type { RuleOf } from '../../rules/schema';
import { startOfYear, toISO, yearOf, type DayNum } from '../days';
import { countBetween, type Presence } from '../presence';
import { levelFor, type RuleStatus } from '../status';

const EPSILON = 1e-9; // guards against 1/3 + 1/6 float error

const daysInYear = (p: Presence, year: number) =>
  countBetween(p, startOfYear(year), startOfYear(year + 1) - 1);

/** Weighted days carried in from previous years (e.g. ⅓ of last year + ⅙ of the year before) */
const carriedDays = (rule: RuleOf<'weightedYears'>, p: Presence, year: number) =>
  rule.yearDivisors.slice(1).reduce((sum, divisor, i) => sum + daysInYear(p, year - i - 1) / divisor, 0);

export const evaluateWeightedYears = (
  rule: RuleOf<'weightedYears'>,
  p: Presence,
  today: DayNum,
): RuleStatus => {
  const year = yearOf(today);
  const nextYear = startOfYear(year + 1);
  const carried = carriedDays(rule, p, year);
  const thisYearBeforeToday = countBetween(p, startOfYear(year), today - 1);
  const thisYear = thisYearBeforeToday + (p.has(today) ? 1 : 0);

  // Resident once this year's days reach `need`
  const need = Math.max(rule.minCurrentYearDays, Math.ceil(rule.threshold - carried - EPSILON));
  const daysLeft = Math.max(0, Math.min(need - 1 - thisYearBeforeToday, nextYear - today));

  return {
    ruleId: rule.id,
    category: rule.category,
    present: p.has(today),
    used: Math.round((thisYear + carried) * 10) / 10,
    limit: rule.threshold,
    daysLeft,
    lastSafeDay: daysLeft > 0 ? toISO(today + daysLeft - 1) : undefined,
    resetsOn: toISO(nextYear),
    level: levelFor(daysLeft, thisYear >= need),
  };
};
