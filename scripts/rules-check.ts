/**
 * Validates every bundled rules file. Runs in CI and fails the build on any error.
 *
 *   npm run rules:check                 # errors fail, stale reviews warn
 *   npm run rules:check -- --strict     # stale reviews fail too (monthly CI job)
 */
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { join } from 'node:path';
import { GroupsSchema, JurisdictionSchema, type RawJurisdiction } from '../src/rules/schema';
import { expandRefs } from '../src/rules/load';
import { DATA_DIR, INDEX_PATH, jurisdictionFileNames, renderIndex } from './rules-gen';

const STALE_AFTER_DAYS = 365;
const strict = process.argv.includes('--strict');

const readJson = (file: string): unknown => JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));

type Issue = Readonly<{ file: string; message: string }>;

const duplicates = (values: readonly string[]) =>
  values.filter((v, i) => values.indexOf(v) !== i);

const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

const semanticIssues = (file: string, j: RawJurisdiction, groups: Record<string, string[]>): Issue[] => {
  const issue = (message: string): Issue => ({ file, message });
  const refIssues = [j.countries, ...j.rules.flatMap((r) => [r.exemptNationalities, r.eligibleNationalities ?? []])]
    .flatMap((refs) => {
      try {
        expandRefs(refs, groups);
        return [];
      } catch (e) {
        return [issue((e as Error).message)];
      }
    });
  const ruleIssues = j.rules.flatMap((r) => [
    ...(r.kind === 'rolling' && r.maxDays > r.windowDays ? [issue(`${r.id}: maxDays > windowDays`)] : []),
    ...(r.kind === 'weightedYears' && r.yearDivisors[0] !== 1
      ? [issue(`${r.id}: yearDivisors[0] should be 1 (current year counts in full)`)]
      : []),
    ...(r.kind === 'taxYear' && Number.isNaN(Date.parse(`2001-${r.yearStart}`))
      ? [issue(`${r.id}: invalid yearStart "${r.yearStart}"`)]
      : []),
  ]);
  const dupRules = duplicates(j.rules.map((r) => r.id)).map((id) => issue(`duplicate rule id "${id}"`));
  return [...refIssues, ...ruleIssues, ...dupRules];
};

const main = () => {
  const groupsResult = GroupsSchema.safeParse(readJson('groups.json'));
  if (!groupsResult.success) {
    console.error('✖ groups.json\n', z.prettifyError(groupsResult.error));
    process.exit(1);
  }
  const groups = groupsResult.data;
  const files = jurisdictionFileNames();

  const parsed = files.map((file) => ({ file, result: JurisdictionSchema.safeParse(readJson(file)) }));

  const schemaErrors: Issue[] = parsed.flatMap(({ file, result }) =>
    result.success ? [] : [{ file, message: z.prettifyError(result.error) }],
  );
  const valid = parsed.flatMap(({ file, result }) => (result.success ? [{ file, j: result.data }] : []));

  const errors: Issue[] = [
    ...schemaErrors,
    ...valid.flatMap(({ file, j }) => semanticIssues(file, j, groups)),
    ...duplicates(valid.map(({ j }) => j.id)).map((id) => ({ file: '*', message: `duplicate jurisdiction id "${id}"` })),
    ...duplicates(valid.flatMap(({ j }) => j.rules.map((r) => r.id))).map((id) => ({
      file: '*',
      message: `rule id "${id}" used in more than one file`,
    })),
    ...(readFileSync(INDEX_PATH, 'utf8') === renderIndex(files)
      ? []
      : [{ file: 'index.generated.ts', message: 'out of date — run `npm run rules:gen`' }]),
  ];

  const stale: Issue[] = valid
    .filter(({ j }) => daysSince(j.lastReviewed) > STALE_AFTER_DAYS)
    .map(({ file, j }) => ({ file, message: `last reviewed ${j.lastReviewed} (> ${STALE_AFTER_DAYS} days ago)` }));

  errors.forEach(({ file, message }) => console.error(`✖ ${file}: ${message}`));
  stale.forEach(({ file, message }) => console.warn(`⚠ ${file}: ${message}`));

  const failed = errors.length > 0 || (strict && stale.length > 0);
  console.log(
    failed
      ? `\nRules check failed (${errors.length} error(s), ${stale.length} stale).`
      : `✔ ${valid.length} jurisdiction file(s) valid${stale.length ? `, ${stale.length} due for review` : ''}.`,
  );
  process.exit(failed ? 1 : 0);
};

main();
