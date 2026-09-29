import type { RuleOf } from '../../rules/schema';
import { addMonths, toISO, type DayNum } from '../days';
import { runStart, type Presence } from '../presence';
import { levelFor, type RuleStatus } from '../status';

/** Last permitted day of a visit that starts on `entry` */
export const visitEnd = ({ limit }: RuleOf<'perVisit'>, entry: DayNum): DayNum =>
  limit.unit === 'days' ? entry + limit.value - 1 : addMonths(entry, limit.value) - 1;

export const evaluatePerVisit = (rule: RuleOf<'perVisit'>, p: Presence, today: DayNum): RuleStatus => {
  const present = p.has(today);
  const entry = present ? runStart(p, today) : today; // not there → "if you arrived today"
  const lastSafe = visitEnd(rule, entry);
  const daysLeft = Math.max(0, lastSafe - today + 1);

  return {
    ruleId: rule.id,
    category: rule.category,
    present,
    used: present ? today - entry + 1 : 0,
    limit: lastSafe - entry + 1,
    daysLeft,
    lastSafeDay: daysLeft > 0 ? toISO(lastSafe) : undefined,
    level: levelFor(daysLeft, present && today > lastSafe),
  };
};
