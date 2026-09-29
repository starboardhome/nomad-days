import { randomUUID } from 'expo-crypto';
import { useMemo, useState } from 'react';
import { useApp } from '../../state/appStore';
import { toISO, type DayNum } from '../../domain/days';
import { checkDraft, toStayRecord, tripToClose, type TripDraft } from './model';

/** Form state + validation + save/delete for one trip ('new' creates one) */
export const useTripDraft = (id: string, today: DayNum) => {
  const { stays } = useApp((s) => s.data);
  const { saveStays, deleteStay } = useApp();
  const existing = stays.find((s) => s.id === id);
  const [draft, setDraft] = useState<TripDraft>(() => existing ?? { id: randomUUID(), entry: toISO(today) });

  const check = useMemo(() => checkDraft(draft, stays, today), [draft, stays, today]);
  const closes = useMemo(() => (existing ? undefined : tripToClose(draft, stays)), [draft, stays, existing]);

  const update = (patch: Partial<TripDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const save = () => saveStays([...(closes ? [closes] : []), toStayRecord(draft)]);
  const remove = () => deleteStay(draft.id);

  return { draft, update, check, closes, isNew: !existing, save, remove };
};
