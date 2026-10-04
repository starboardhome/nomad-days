import { Field } from '../../../ui/Field';
import { NumberField } from '../../../ui/NumberField';
import { SelectChips } from '../../../ui/SelectChips';
import { ToggleRow } from '../../../ui/ToggleRow';
import { COUNTING_OPTIONS, YEAR_START_OPTIONS, type RuleDraft } from '../model';

type Props = Readonly<{ draft: RuleDraft; update: (patch: Partial<RuleDraft>) => void }>;

export const TaxTestFields = ({ draft, update }: Props) => (
  <>
    <ToggleRow label="Count days for tax residency" value={draft.tax} onChange={(tax) => update({ tax })} />
    {draft.tax ? (
      <>
        <NumberField label="Tax resident from (days)" value={draft.taxThreshold} onChange={(taxThreshold) => update({ taxThreshold })} />
        <Field label="Tax year starts">
          <SelectChips label="Tax year starts" options={YEAR_START_OPTIONS} selected={[draft.taxYearStart]} onToggle={(taxYearStart) => update({ taxYearStart })} />
        </Field>
        <Field label="A day counts if you’re there" hint="Most countries count any part of a day. Some (like the UK) count nights only.">
          <SelectChips label="Day counting" options={COUNTING_OPTIONS} selected={[draft.taxCounting]} onToggle={(taxCounting) => update({ taxCounting })} />
        </Field>
      </>
    ) : null}
  </>
);
