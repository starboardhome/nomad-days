# Nomad Days

Count your days abroad so you stay within the Schengen 90/180 rule, visitor limits and tax-residency thresholds. Everything stays on your phone.

- **Log trips** (country, arrival and departure) and see days used, days left, your last safe day, and when you can return.
- **Bundled rules** for Schengen, the UK and the US, plus **your own rules** for any other country.
- **Private:** no accounts, servers or analytics. Data is encrypted on the device, and backups are encrypted files you export.

Estimates only. This is not legal or tax advice.

## Development

Expo SDK 57, React Native, TypeScript and Expo Router.

```bash
npm install
npx expo run:ios            # or run:android (the app needs a development build, not Expo Go)
npm run dev                 # dev server for the development build
npm run test:unit           # unit tests
npm run typecheck
npm run rules:check         # validate bundled rules
```

- [docs/RULES.md](docs/RULES.md): adding a country or region
- [docs/SECURITY.md](docs/SECURITY.md): privacy model and backup format
- [docs/PRIVACY.md](docs/PRIVACY.md): privacy policy
- [docs/RELEASING.md](docs/RELEASING.md): store and F-Droid releases

## Licence

[GPL-3.0-or-later](LICENSE)
