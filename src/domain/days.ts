/**
 * Dates as whole-day integers (days since 1970-01-01, UTC).
 * Integers avoid time-zone and DST bugs and make window maths cheap.
 */
export type ISODate = string; // 'YYYY-MM-DD'
export type DayNum = number;

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const fromUTC = (year: number, monthIndex: number, day: number): DayNum =>
  Date.UTC(year, monthIndex, day) / MS_PER_DAY;

const utc = (day: DayNum) => new Date(day * MS_PER_DAY);

export const toDayNum = (iso: ISODate): DayNum => {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date "${iso}"`);
  return fromUTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const toISO = (day: DayNum): ISODate => utc(day).toISOString().slice(0, 10);

/** Today's calendar date on the user's device */
export const localToday = (now: Date = new Date()): DayNum =>
  fromUTC(now.getFullYear(), now.getMonth(), now.getDate());

export const yearOf = (day: DayNum): number => utc(day).getUTCFullYear();

export const startOfYear = (year: number): DayNum => fromUTC(year, 0, 1);

/** Add calendar months, clamping to month end (31 Jan + 1 month → 28/29 Feb) */
export const addMonths = (day: DayNum, months: number): DayNum => {
  const d = utc(day);
  const target = fromUTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1);
  const t = utc(target);
  const lastDayOfTarget = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return target + Math.min(d.getUTCDate(), lastDayOfTarget) - 1;
};

/** Most recent occurrence of MM-DD on or before `day` (e.g. UK tax year start "04-06") */
export const periodStartOnOrBefore = (day: DayNum, monthDay: string): DayNum => {
  const [month, dom] = monthDay.split('-').map(Number);
  const year = yearOf(day);
  const thisYear = fromUTC(year, month - 1, dom);
  return thisYear <= day ? thisYear : fromUTC(year - 1, month - 1, dom);
};

/** Inclusive integer range [from, to] */
export const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
