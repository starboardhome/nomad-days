import { useMemo, useState } from 'react';
import { toISO, type DayNum } from '../../domain/days';
import { customJurisdictionId } from '../../domain/custom';
import { Iso2Schema } from '../../rules';
import { useApp } from '../../state/appStore';
import { applyPreset, checkRuleDraft, emptyRuleDraft, fromJurisdiction, toJurisdiction, type PresetId, type RuleDraft } from './model';

/** Form state + validation + save/delete for one country's own rules ('new' starts blank) */
export const useRuleDraft = (param: string, today: DayNum) => {
  const saved = useApp((s) => s.data.customJurisdictions);
  const { saveCustomJurisdiction, deleteCustomJurisdiction } = useApp();
  const country = Iso2Schema.safeParse(param?.toUpperCase()).data;
  const existing = country ? saved.find((j) => j.id === customJurisdictionId(country)) : undefined;
  const [draft, setDraft] = useState<RuleDraft>(() => (existing ? fromJurisdiction(existing) : emptyRuleDraft(country)));

  const check = useMemo(() => checkRuleDraft(draft, saved, existing?.id), [draft, saved, existing?.id]);

  const update = (patch: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const preset = (id: PresetId) => setDraft((d) => applyPreset(d, id));
  const save = async () => {
    const next = toJurisdiction(draft, toISO(today));
    await saveCustomJurisdiction(next);
    if (existing && existing.id !== next.id) await deleteCustomJurisdiction(existing.id); // country changed
  };
  const remove = () => deleteCustomJurisdiction(existing!.id);

  return { draft, update, preset, check, isNew: !existing, save, remove };
};
