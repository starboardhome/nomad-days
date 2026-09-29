import type { Counting } from '../rules/schema';
import { range, toDayNum, type DayNum, type ISODate } from './days';

/** One trip into one country. No `exit` = still there. */
export type Stay = Readonly<{ country: string; entry: ISODate; exit?: ISODate }>;

/** The set of days a person counts as present in a jurisdiction */
export type Presence = ReadonlySet<DayNum>;

const stayDays = (stay: Stay, counting: Counting, today: DayNum): DayNum[] => {
  const start = toDayNum(stay.entry);
  const end = stay.exit ? toDayNum(stay.exit) : today;
  // Midnight rule: you aren't there at midnight on the day you leave.
  const last = counting === 'midnight' && stay.exit ? end - 1 : end;
  return range(start, Math.min(last, today));
};

/** Days present in any of `countries` (overlapping/back-to-back trips merge naturally) */
export const presenceIn = (
  stays: readonly Stay[],
  countries: ReadonlySet<string>,
  counting: Counting,
  today: DayNum,
): Presence =>
  new Set(
    stays
      .filter((s) => countries.has(s.country) && toDayNum(s.entry) <= today)
      .flatMap((s) => stayDays(s, counting, today)),
  );

/** Number of present days in the inclusive range [from, to] */
export const countBetween = (presence: Presence, from: DayNum, to: DayNum): number =>
  range(from, to).filter((d) => presence.has(d)).length;

/** First day of the unbroken run of presence that includes `day` */
export const runStart = (presence: Presence, day: DayNum): DayNum => {
  let start = day; // iterative: long runs would overflow the stack if recursive
  while (presence.has(start - 1)) start -= 1;
  return start;
};
