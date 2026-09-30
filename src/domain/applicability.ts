import type { Jurisdiction, Rule } from '../rules/schema';

export type Profile = Readonly<{
  passports: readonly string[]; // ISO alpha-2, e.g. ['AU', 'IE']
  taxResidence: string; //         ISO alpha-2 of the country you're tax resident in
}>;

export type Applicability =
  | 'applies'
  | 'exempt' //        e.g. an EU passport in Schengen, or already tax resident there
  | 'visaRequired'; // no passport qualifies for this visa-free route

const holdsAny = (profile: Profile, set: ReadonlySet<string>) =>
  profile.passports.some((p) => set.has(p));

/** Whether a rule applies to this person. With several passports, the best one wins. */
export const applicability = (rule: Rule, jurisdiction: Jurisdiction, profile: Profile): Applicability => {
  if (holdsAny(profile, rule.exemptNationalities)) return 'exempt';
  if (rule.category === 'tax' && jurisdiction.countries.has(profile.taxResidence)) return 'exempt';
  if (rule.eligibleNationalities && !holdsAny(profile, rule.eligibleNationalities)) return 'visaRequired';
  return 'applies';
};
