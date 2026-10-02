import { randomUUID } from 'expo-crypto';
import { useMemo, useState } from 'react';
import type { Plan } from '../../data/schema';
import { toDayNum, toISO, type DayNum } from '../../domain/days';
import type { PlannedTrip } from '../../domain/plan';
import { useApp } from '../../state/appStore';
import { checkTrip, verdictFor } from '../plans/model';
import { checkDraft, confirmPlanned, toStayRecord, tripToClose, type TripDraft } from './model';

/** Form state + validation + save/delete for one trip ('new' creates one), real or planned */
export const useTripDraft = (id: string, today: DayNum, initialPlan?: Plan) => {
  const data = useApp((s) => s.data);
  const { saveStays, deleteStay } = useApp();
  const { stays } = data;
  const existing = stays.find((s) => s.id === id);
  const [draft, setDraft] = useState<TripDraft>(
    () =>
      existing ??
      (initialPlan === 'booked' || initialPlan === 'maybe'
        ? { id: randomUUID(), entry: toISO(today + 7), exit: toISO(today + 13), plan: initialPlan } // a week, from next week
        : { id: randomUUID(), entry: toISO(today) }),
  );

  const check = useMemo(() => checkDraft(draft, stays, today), [draft, stays, today]);
  const closes = useMemo(() => (existing ? undefined : tripToClose(draft, stays)), [draft, stays, existing]);
  // Live "will this trip fit?" for planned trips
  const verdict = useMemo(() => {
    if (!draft.plan || !draft.country || !draft.exit || check.errors.length) return undefined;
    const trip = { ...draft, country: draft.country, exit: draft.exit, plan: draft.plan } as PlannedTrip;
    return verdictFor(checkTrip(trip, data, today), draft.country);
  }, [draft, data, today, check.errors.length]);

  const update = (patch: Partial<TripDraft>) => setDraft((d) => ({ ...d, ...patch }));
  /** Real trip, or a plan (which needs an end date: default to a week) */
  const setPlan = (plan?: Plan) =>
    setDraft((d) => (plan ? { ...d, plan, exit: d.exit ?? toISO(toDayNum(d.entry) + 6) } : { ...d, plan: undefined }));
  const save = () => saveStays([...(closes ? [closes] : []), toStayRecord(draft)]);
  const remove = () => deleteStay(draft.id);
  /** A planned trip that has started: "Yes, I went" */
  const startedPlan = existing?.plan && toDayNum(existing.entry) <= today ? existing : undefined;
  const confirm = () => saveStays(confirmPlanned(toStayRecord(draft), stays));

  return { draft, update, setPlan, check, closes, verdict, isNew: !existing, startedPlan, save, remove, confirm };
};
