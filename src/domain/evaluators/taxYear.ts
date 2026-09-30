import type { RuleOf } from '../../rules/schema';
import { periodStartOnOrBefore, toISO, type DayNum } from '../days';
import { countBetween, type Presence } from '../presence';
import { levelFor, type RuleStatus } from '../status';

export const evaluateTaxYear = (rule: RuleOf<'taxYear'>, p: Presence, today: DayNum): RuleStatus => {
  const start = periodStartOnOrBefore(today, rule.yearStart);
  const nextStart = periodStartOnOrBefore(start + 400, rule.yearStart);
  const usedBeforeToday = countBetween(p, start, today - 1);
  const used = usedBeforeToday + (p.has(today) ? 1 : 0);
  const safeMax = rule.threshold - 1; // reaching the threshold makes you resident
  const daysLeft = Math.max(0, Math.min(safeMax - usedBeforeToday, nextStart - today));

  return {
    ruleId: rule.id,
    category: rule.category,
    present: p.has(today),
    used,
    limit: rule.threshold,
    daysLeft,
    lastSafeDay: daysLeft > 0 ? toISO(today + daysLeft - 1) : undefined,
    resetsOn: toISO(nextStart),
    level: levelFor(daysLeft, used >= rule.threshold),
  };
};
