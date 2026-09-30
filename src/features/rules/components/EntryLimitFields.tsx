import { Field } from '../../../ui/Field';
import { NumberField } from '../../../ui/NumberField';
import { SelectChips } from '../../../ui/SelectChips';
import { ENTRY_OPTIONS, type RuleDraft } from '../model';

type Props = Readonly<{ draft: RuleDraft; update: (patch: Partial<RuleDraft>) => void }>;

export const EntryLimitFields = ({ draft, update }: Props) => (
  <>
    <Field label="How long you can stay" hint="Entry and exit days both count.">
      <SelectChips label="Entry limit" options={ENTRY_OPTIONS} selected={[draft.entry]} onToggle={(entry) => update({ entry })} />
    </Field>
    {draft.entry === 'perVisit' ? (
      <NumberField label="Days per visit" value={draft.perVisitDays} onChange={(perVisitDays) => update({ perVisitDays })} placeholder="e.g. 60" />
    ) : null}
    {draft.entry === 'rolling' ? (
      <>
        <NumberField label="Days allowed" value={draft.rollingMax} onChange={(rollingMax) => update({ rollingMax })} placeholder="e.g. 90" />
        <NumberField label="In any window of (days)" value={draft.rollingWindow} onChange={(rollingWindow) => update({ rollingWindow })} />
      </>
    ) : null}
  </>
);
