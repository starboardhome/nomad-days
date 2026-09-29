import { JurisdictionSchema, type Jurisdiction, type RawRule } from '../rules/schema';
import { resolveJurisdiction } from '../rules/load';

type Managed = 'id' | 'sources' | 'notes' | 'exemptNationalities' | 'eligibleNationalities';
/** Any rule kind, minus the fields the app fills in (distributes over the union) */
export type CustomRuleInput = RawRule extends infer R
  ? R extends RawRule
    ? Omit<R, Managed> & { notes?: string[] }
    : never
  : never;

/**
 * A user-defined jurisdiction for a country the app doesn't bundle
 * (stored on-device only). Validated with the same schema as bundled rules.
 */
export const createCustomJurisdiction = (
  country: string,
  name: string,
  rules: readonly CustomRuleInput[],
  today: string,
): Jurisdiction => {
  const id = `custom-${country.toLowerCase()}`;
  const raw = JurisdictionSchema.parse({
    id,
    name,
    countries: [country],
    lastReviewed: today,
    rules: rules.map((r, i) => ({
      ...r,
      id: `${id}-${i + 1}`,
      sources: ['https://user-defined.local'],
    })),
  });
  return resolveJurisdiction(raw, {});
};
