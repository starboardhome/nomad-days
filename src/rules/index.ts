import groups from './data/groups.json';
import { jurisdictionFiles } from './data/index.generated';
import { loadJurisdictions } from './load';
import type { Jurisdiction } from './schema';

export * from './schema';
export { expandRefs, resolveJurisdiction } from './load';

/** All bundled jurisdictions, validated at startup. */
export const jurisdictions: readonly Jurisdiction[] = loadJurisdictions(jurisdictionFiles, groups);

export const jurisdictionById = (id: string): Jurisdiction | undefined =>
  jurisdictions.find((j) => j.id === id);

/** Which bundled jurisdiction(s) a country belongs to, e.g. "FR" → Schengen */
export const jurisdictionsForCountry = (iso2: string): readonly Jurisdiction[] =>
  jurisdictions.filter((j) => j.countries.has(iso2));
