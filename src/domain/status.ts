import type { Rule } from '../rules/schema';
import type { ISODate } from './days';

export type Level = 'ok' | 'warning' | 'blocked' | 'over';

/**
 * Result of evaluating one rule on one day.
 * `daysLeft` = how many consecutive days, starting today, you can be present
 * (today included) without breaching the rule.
 */
export type RuleStatus = Readonly<{
  ruleId: string;
  category: Rule['category'];
  present: boolean;
  used: number; //          days counted so far (may be fractional for weighted tests)
  limit: number;
  daysLeft: number;
  lastSafeDay?: ISODate; // last day you can be present if you stay (or arrive) today
  nextEntry?: ISODate; //   earliest re-entry after leaving on lastSafeDay (entry rules)
  resetsOn?: ISODate; //    start of the next counting period (tax rules)
  level: Level;
}>;

export const WARN_WITHIN_DAYS = 14;

export const levelFor = (daysLeft: number, isOver: boolean): Level =>
  isOver ? 'over' : daysLeft === 0 ? 'blocked' : daysLeft <= WARN_WITHIN_DAYS ? 'warning' : 'ok';
