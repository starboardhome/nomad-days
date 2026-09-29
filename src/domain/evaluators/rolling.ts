import type { RuleOf } from '../../rules/schema';
import { range, toISO, type DayNum } from '../days';
import { countBetween, type Presence } from '../presence';
import { levelFor, type RuleStatus } from '../status';

type Limits = Pick<RuleOf<'rolling'>, 'maxDays' | 'windowDays'>;

/** Days counted in the window ending on `day` */
export const usedOn = (p: Presence, { windowDays }: Limits, day: DayNum): number =>
  countBetween(p, day - windowDays + 1, day);

/**
 * How many consecutive days you can be present starting on `start`
 * (checks at most `cap` days — pass a small cap when you only need "at least N").
 */
export const consecutiveAllowance = (
  p: Presence,
  limits: Limits,
  start: DayNum,
  cap: number = limits.windowDays,
): number => {
  const { maxDays, windowDays } = limits;
  // If present every day from `start` to `start + k`, days used on that last day are:
  // earlier presence still inside its window + the (k + 1) planned days.
  const usedIfStaying = (k: number) =>
    countBetween(p, start + k - windowDays + 1, start - 1) + (k + 1);
  const firstBreach = range(0, cap - 1).findIndex((k) => usedIfStaying(k) > maxDays);
  return firstBreach === -1 ? cap : firstBreach;
};

/** Earliest day on/after `from` you can enter and stay at least `minStay` days */
export const earliestEntry = (
  p: Presence,
  limits: Limits,
  from: DayNum,
  minStay = 1,
): DayNum | undefined => {
  const need = Math.min(minStay, limits.maxDays);
  return range(from, from + limits.windowDays).find(
    (d) => consecutiveAllowance(p, limits, d, need) >= need,
  );
};

const withDays = (p: Presence, from: DayNum, to: DayNum): Presence =>
  new Set([...p, ...range(from, to)]);

export const evaluateRolling = (rule: RuleOf<'rolling'>, p: Presence, today: DayNum): RuleStatus => {
  const used = usedOn(p, rule, today);
  const daysLeft = consecutiveAllowance(p, rule, today);
  const lastSafe = today + daysLeft - 1;
  // After using the full allowance, when can you come back?
  const reEntry =
    daysLeft > 0
      ? earliestEntry(withDays(p, today, lastSafe), rule, lastSafe + 1)
      : earliestEntry(p, rule, today + 1);

  return {
    ruleId: rule.id,
    category: rule.category,
    present: p.has(today),
    used,
    limit: rule.maxDays,
    daysLeft,
    lastSafeDay: daysLeft > 0 ? toISO(lastSafe) : undefined,
    nextEntry: reEntry === undefined ? undefined : toISO(reEntry),
    level: levelFor(daysLeft, used > rule.maxDays),
  };
};
