import { JurisdictionSchema, type Jurisdiction, type RawJurisdiction, type RawRule } from '../rules/schema';
import { resolveJurisdiction } from '../rules/load';

type Managed = 'id' | 'sources' | 'notes' | 'exemptNationalities' | 'eligibleNationalities';
/** Any rule kind, minus the fields the app fills in (distributes over the union) */
export type CustomRuleInput = RawRule extends infer R
  ? R extends RawRule
    ? Omit<R, Managed> & { notes?: string[] }
    : never
  : never;

/** Placeholder source for rules without a link (the schema requires one) */
export const NO_SOURCE = 'https://user-defined.local';

export const customJurisdictionId = (country: string) => `custom-${country.toLowerCase()}`;
export const isCustomJurisdiction = (id: string) => id.startsWith('custom-');

/**
 * A user-defined jurisdiction for a country the app doesn't bundle, in its stored form
 * (on-device only). Validated with the same schema as bundled rules.
 */
export const buildCustomJurisdiction = (
  country: string,
  name: string,
  rules: readonly CustomRuleInput[],
  today: string,
  source: string = NO_SOURCE,
): RawJurisdiction => {
  const id = customJurisdictionId(country);
  return JurisdictionSchema.parse({
    id,
    name,
    countries: [country],
    lastReviewed: today,
    rules: rules.map((r, i) => ({ ...r, id: `${id}-${i + 1}`, sources: [source] })),
  });
};

/** Same as buildCustomJurisdiction, resolved for evaluation */
export const createCustomJurisdiction = (
  ...args: Parameters<typeof buildCustomJurisdiction>
): Jurisdiction => resolveJurisdiction(buildCustomJurisdiction(...args), {});
