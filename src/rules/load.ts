import {
  GroupsSchema,
  JurisdictionSchema,
  type Groups,
  type Jurisdiction,
  type RawJurisdiction,
  type RawRule,
  type Rule,
} from './schema';

/** Expand ["@EU", "GB"] into a set of country codes. Throws on unknown groups. */
export const expandRefs = (refs: readonly string[], groups: Groups): ReadonlySet<string> =>
  new Set(
    refs.flatMap((ref) => {
      if (!ref.startsWith('@')) return [ref];
      const members = groups[ref.slice(1)];
      if (!members) throw new Error(`Unknown country group "${ref}"`);
      return members;
    }),
  );

const resolveRule = (rule: RawRule, groups: Groups): Rule =>
  ({
    ...rule,
    exemptNationalities: expandRefs(rule.exemptNationalities, groups),
    eligibleNationalities: rule.eligibleNationalities
      ? expandRefs(rule.eligibleNationalities, groups)
      : undefined,
  }) as Rule;

export const resolveJurisdiction = (raw: RawJurisdiction, groups: Groups): Jurisdiction => ({
  id: raw.id,
  name: raw.name,
  lastReviewed: raw.lastReviewed,
  countries: expandRefs(raw.countries, groups),
  rules: raw.rules.map((r) => resolveRule(r, groups)),
});

/** Parse + resolve bundled JSON. Throws with a readable message if any file is invalid. */
export const loadJurisdictions = (
  files: readonly unknown[],
  groupsFile: unknown,
): readonly Jurisdiction[] => {
  const groups = GroupsSchema.parse(groupsFile);
  return files.map((file) => resolveJurisdiction(JurisdictionSchema.parse(file), groups));
};
