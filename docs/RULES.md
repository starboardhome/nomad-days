# Rules data

Stay and tax rules ship with the app in `src/rules/data/*.json`. They change only with a new release. The app never downloads rules.

## Rule kinds

| kind | Use for | Key fields |
|---|---|---|
| `rolling` | Schengen 90/180 | `maxDays`, `windowDays` |
| `perVisit` | UK 6 months, US Visa Waiver 90 days | `limit: { unit: "days" \| "months", value }` |
| `taxYear` | UK SRT, calendar-year 183-day tests | `threshold`, `yearStart` (`"MM-DD"`, e.g. `"04-06"`, `"01-01"`) |
| `weightedYears` | US substantial presence test | `threshold`, `minCurrentYearDays`, `yearDivisors` (`[1, 3, 6]`) |

Common fields:
- `category`: `entry` or `tax`.
- `counting`: `anyPartOfDay` or `midnight`.
- `exemptNationalities` / `eligibleNationalities`: country codes, or groups such as `"@EU"` from `groups.json`.
- `notes`: shown to users.
- `sources`: required, and must be https links.

## Adding or updating a jurisdiction

1. Copy an existing file, e.g. `uk.json`, to `src/rules/data/<id>.json` and edit it.
2. Set `lastReviewed` to today's date.
3. Run `npm run rules:gen`. This updates the import list in `index.generated.ts`.
4. Run `npm run rules:check && npm run test:domain`.
5. Add a test in `src/domain/tests/evaluators.unit.ts` using a real example from the official source.

CI runs `rules:check` on every push. A monthly run fails if any file hasn't been reviewed in the last 12 months.

## Adding a new rule kind

1. Add a schema in `src/rules/schema.ts` and include it in `RuleSchema`.
2. Write `src/domain/evaluators/<kind>.ts`, which returns a `RuleStatus`.
3. Register it in the `evaluators` map in `src/domain/evaluate.ts`. TypeScript will report an error until you do.

## Known gaps

- **UK SRT:** only the automatic 183-day test is modelled, not the sufficient ties test.
- **US:** exempt days are not modelled (transit, commuters, medical, exempt individuals), and neither is the closer connection exception.
- **Schengen:** bilateral visa-waiver agreements are not modelled. Cyprus is expected to join, pending an EU Council vote expected around December 2026.
