import { StayRecordSchema, type Plan, type StayRecord } from '../../data/schema';
import { countryLabel } from '../../data/countries';
import { toDayNum, type DayNum } from '../../domain/days';
import { daysInclusive, formatShortDate, plural } from '../../ui/format';
import { toISO, yearOf } from '../../domain/days';

export type TripDraft = Readonly<{
  id: string;
  country?: string;
  entry: string;
  exit?: string; // undefined = still there
  note?: string;
  plan?: Plan; //   undefined = a trip that happened (or is happening)
}>;

/** Overlaps only matter between trips of the same kind (maybe trips are alternatives) */
const comparable = (draft: TripDraft, others: readonly StayRecord[]) =>
  draft.plan === 'maybe' ? [] : others.filter((o) => o.plan === draft.plan);

export type DraftCheck = Readonly<{ errors: readonly string[]; warnings: readonly string[] }>;

const overlapDays = (a: TripDraft, b: StayRecord, today: DayNum) => {
  const end = (x?: string) => (x ? toDayNum(x) : today);
  const from = Math.max(toDayNum(a.entry), toDayNum(b.entry));
  const to = Math.min(end(a.exit), end(b.exit));
  return to - from + 1;
};

/** Validates a trip form. Errors block saving; warnings are shown but allowed. */
export const checkDraft = (draft: TripDraft, others: readonly StayRecord[], today: DayNum): DraftCheck => {
  const errors = [
    !draft.country && 'Choose a country.',
    draft.exit && draft.exit < draft.entry && 'The exit date is before the entry date.',
    !draft.plan && toDayNum(draft.entry) > today && 'The entry date is in the future. Mark the trip as Booked or Maybe to plan it.',
    draft.plan && !draft.exit && 'Add the date you plan to leave.',
  ].filter((e): e is string => !!e);

  const same = comparable(draft, others);
  const clashes = errors.length
    ? []
    : same.filter(
        (o) => o.id !== draft.id && o.id !== tripToClose(draft, others)?.id && overlapDays(draft, o, today) > 1,
      ); // 1 shared day = a travel day
  // An older open trip is closed automatically (see tripToClose); only a *later* one is a problem
  const openElsewhere = !draft.exit && same.some((o) => o.id !== draft.id && !o.exit && o.entry > draft.entry);

  const warnings = [
    ...clashes.map((o) => `Overlaps your ${countryLabel(o.country)} trip by more than a travel day.`),
    openElsewhere && 'A later trip is also marked “still there”. Add an exit date to one of them.',
  ].filter((w): w is string => !!w);

  return { errors, warnings };
};

/**
 * Logging a new "still there" trip means you've left wherever you were:
 * returns the older open trip, ending on the new trip's entry day (a travel day).
 */
export const tripToClose = (draft: TripDraft, others: readonly StayRecord[]): StayRecord | undefined => {
  if (draft.exit || draft.plan) return undefined;
  const open = others.find((o) => o.id !== draft.id && !o.plan && !o.exit && o.entry <= draft.entry);
  return open ? { ...open, exit: draft.entry } : undefined;
};

export const toStayRecord = (draft: TripDraft): StayRecord =>
  StayRecordSchema.parse({
    id: draft.id,
    country: draft.country,
    entry: draft.entry,
    ...(draft.exit ? { exit: draft.exit } : {}),
    ...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
    ...(draft.plan ? { plan: draft.plan } : {}),
  });

/**
 * "Yes, I went": the planned trip becomes a real one, and the trip you were on
 * ends on its first day (a travel day), like logging a move.
 */
export const confirmPlanned = (trip: StayRecord, stays: readonly StayRecord[]): StayRecord[] => {
  const { plan: _plan, ...real } = trip;
  const open = stays.find((s) => s.id !== trip.id && !s.plan && !s.exit && s.entry <= trip.entry);
  return [...(open ? [{ ...open, exit: trip.entry }] : []), real];
};

const PLAN_LABEL: Record<Plan, string> = { booked: 'Booked', maybe: 'Maybe' };

export type TripRow = Readonly<{ id: string; title: string; subtitle: string; ongoing: boolean }>;

export const tripRow = (s: StayRecord, today: DayNum): TripRow => {
  const year = yearOf(today);
  const end = s.exit ?? toISO(today);
  const range = `${formatShortDate(s.entry, year)} – ${s.exit ? formatShortDate(s.exit, year) : 'now'}`;
  return {
    id: s.id,
    title: countryLabel(s.country),
    subtitle: `${s.plan ? `${PLAN_LABEL[s.plan]} · ` : ''}${range} · ${plural(daysInclusive(s.entry, end), 'day')}`,
    ongoing: !s.exit && !s.plan,
  };
};
