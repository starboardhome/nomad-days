import type { AppData } from '../data/schema';
import { jurisdictions as bundled, resolveJurisdiction, type Jurisdiction } from '../rules';

/** Bundled jurisdictions plus the user's own rules */
export const allJurisdictions = (data: AppData): readonly Jurisdiction[] => [
  ...bundled,
  ...data.customJurisdictions.map((j) => resolveJurisdiction(j, {})),
];
