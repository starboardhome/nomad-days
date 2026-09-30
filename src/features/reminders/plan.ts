/**
 * Pure reminder planner: turns today's rule results into dated notifications.
 * Re-run after every change (new trip, settings, new day), so plans never go stale.
 */
import type { AppData } from '../../data/schema';
import { toDayNum, toISO, type DayNum } from '../../domain/days';
import { evaluateAll, type RuleResult } from '../../domain/evaluate';
import type { Jurisdiction } from '../../rules';
import { formatDate, plural } from '../../ui/format';
import { allJurisdictions } from '../dashboard/model';

export type PlannedReminder = Readonly<{
  id: string;
  title: string;
  body: string;
  fireAtMs: number;
  fireOn: string; // ISO date, for display
}>;

export const MAX_REMINDERS = 60; // iOS allows 64 pending per app

type Draft = Omit<PlannedReminder, 'fireAtMs' | 'fireOn'> & { on: DayNum };

/** Local wall-clock time on a given day, e.g. 9:00 on 5 Oct */
export const atLocalHour = (day: DayNum, hour: number): number => {
  const [y, m, d] = toISO(day).split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime();
};

const countdown = (j: Jurisdiction, r: RuleResult, leadDays: readonly number[]): Draft[] => {
  const s = r.status!;
  const last = toDayNum(s.lastSafeDay!);
  const isTax = r.rule.category === 'tax';
  const name = isTax ? `${j.name} tax` : j.name;
  const leads = leadDays.map((lead) => ({
    id: `${r.rule.id}:before:${lead}`,
    on: last - lead,
    title: `${name}: ${plural(lead, 'day')} to go`,
    body: isTax
      ? `Staying past ${formatDate(s.lastSafeDay!)} would reach the ${r.rule.label.toLowerCase()} threshold.`
      : `Your last allowed day is ${formatDate(s.lastSafeDay!)} (${r.rule.label.toLowerCase()}).`,
  }));
  const lastDay: Draft[] = isTax
    ? []
    : [{ id: `${r.rule.id}:last`, on: last, title: `${j.name}: last allowed day`, body: 'Leave by the end of today to stay within the limit.' }];
  return [...leads, ...lastDay];
};

const canReturn = (j: Jurisdiction, r: RuleResult): Draft[] => [
  {
    id: `${r.rule.id}:return`,
    on: toDayNum(r.status!.nextEntry!),
    title: `${j.name}: you can return`,
    body: `From today you have days available again (${r.rule.label.toLowerCase()}).`,
  },
];

/** Tax countdowns only matter if you'd hit the threshold before the count resets */
const taxAtRisk = (r: RuleResult) =>
  !!r.status?.lastSafeDay && !!r.status.resetsOn && toDayNum(r.status.lastSafeDay) + 1 < toDayNum(r.status.resetsOn);

const draftsFor = (j: Jurisdiction, r: RuleResult, leadDays: readonly number[]): Draft[] => {
  const s = r.status;
  if (r.applicability !== 'applies' || !s || s.level === 'over') return [];
  if (s.present && s.lastSafeDay && (r.rule.category === 'entry' || taxAtRisk(r))) return countdown(j, r, leadDays);
  if (!s.present && s.level === 'blocked' && s.nextEntry) return canReturn(j, r);
  return [];
};

export const planReminders = (data: AppData, today: DayNum, nowMs: number): readonly PlannedReminder[] => {
  const { enabled, leadDays, hour } = data.settings.reminders;
  const { taxResidence, passports } = data.profile;
  if (!enabled || !taxResidence) return [];

  return evaluateAll(allJurisdictions(data), data.stays, { passports, taxResidence }, today)
    .flatMap(({ jurisdiction, results }) => results.flatMap((r) => draftsFor(jurisdiction, r, leadDays)))
    .map(({ on, ...d }) => ({ ...d, fireOn: toISO(on), fireAtMs: atLocalHour(on, hour) }))
    .filter((r) => r.fireAtMs > nowMs)
    .sort((a, b) => a.fireAtMs - b.fireAtMs)
    .slice(0, MAX_REMINDERS);
};
