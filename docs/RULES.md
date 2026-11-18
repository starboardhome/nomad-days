# Rules data

Stay and tax rules ship with the app in `src/rules/data/*.json`. They change only with a new release. The app never downloads rules.

## Rule kinds

| kind | Use for | Key fields |
|---|---|---|
| `rolling` | Schengen 90/180; New Zealand's tax test (more than 183 days in any 12 months) | `maxDays`, `windowDays` |
| `perVisit` | UK, Canada and Crown dependencies 6 months, Australia and New Zealand 3 months, US Visa Waiver 90 days | `limit: { unit: "days" \| "months", value }` |
| `taxYear` | UK SRT, Australia (from 1 July), Canada, Isle of Man, Jersey, Guernsey (91 days) | `threshold`, `yearStart` (`"MM-DD"`, e.g. `"04-06"`, `"01-01"`) |
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
4. Run `npm run rules:check && npm run test:unit`.
5. Add a test in `src/domain/tests/evaluators.unit.ts` using a real example from the official source.

CI runs `rules:check` on every push. A monthly run fails if any file hasn't been reviewed in the last 12 months.

## Adding a new rule kind

1. Add a schema in `src/rules/schema.ts` and include it in `RuleSchema`.
2. Write `src/domain/evaluators/<kind>.ts`, which returns a `RuleStatus`.
3. Register it in the `evaluators` map in `src/domain/evaluate.ts`. TypeScript will report an error until you do.

## Known gaps

- **UK SRT:** the 183-day test and the sufficient ties test (from your answers on the UK ties screen) are modelled. The other automatic overseas and UK tests (for example full-time work abroad) aren't.
- **US:** exempt days are not modelled (transit, commuters, medical, exempt individuals), and neither is the closer connection exception.
- **Schengen:** bilateral visa-waiver agreements are not modelled. Cyprus is expected to join, pending an EU Council vote expected around December 2026.
- **Australia:** only the 183-day test is modelled. The 'resides' and domicile tests (which can make you resident sooner) and the usual-place-of-abode exception are explained in notes. Visitor visa (subclass 600) holders may have 3, 6 or 12 months; the app uses the ETA/eVisitor 3 months.
- **New Zealand:** British citizens can stay 6 months on the visa waiver; the app uses the general 3 months. The permanent place of abode test isn't modelled.
- **Canada:** the stay is set by the border officer (usually 6 months). Residential ties, which can make you a factual resident sooner, aren't modelled.
- **Crown dependencies (Isle of Man, Jersey, Guernsey):** the 4-year average tests, Jersey's place-of-abode test and Guernsey's 35-day test are in notes, not modelled. Each is counted separately from the UK, although they share the Common Travel Area.
