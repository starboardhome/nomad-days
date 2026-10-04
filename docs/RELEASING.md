# Releasing

## Identity (fixed once published)

| | |
|---|---|
| App ID (iOS and Android) | `io.github.starboardhome.nomaddays` |
| Name | Nomad Days |
| Licence | GPL-3.0-or-later |
| Developer name | **Starboard Home** on Google Play and F-Droid. The App Store shows the legal name of the individual Apple Developer account (a brand name there needs an organisation account) |
| Support | GitHub Issues |
| Store text | `fastlane/metadata/android/en-US/` (title, short and full description). For the App Store, paste the full description without the `<b>` tags |
| Export compliance | `ios.config.usesNonExemptEncryption: false` in `app.json`: encryption only protects the user's own data (exempt), so App Store Connect doesn't ask on each build |
| Privacy policy | <https://starboardhome.github.io/nomad-days/privacy/>, published from [`docs/PRIVACY.md`](PRIVACY.md) by `.github/workflows/pages.yml`. Use this URL in the store listings |

## Each release

1. Bump `expo.version` in `app.json`, plus `android.versionCode` and `ios.buildNumber` (both +1).
2. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` (500 characters at most).
3. Run `npm run test:unit && npm run typecheck && npm run rules:check`.
4. Tag it: `git tag v<version> && git push --tags`. F-Droid builds from tags.
5. Build for the stores with EAS: `npx eas-cli@latest build --platform all --profile production`, then `npx eas-cli@latest submit --profile production`.

## EAS build profiles (`eas.json`)

| Profile | What it builds | Use it for |
|---|---|---|
| `development` | Debug build: Android APK, iOS Simulator app | Running against `npm run dev` on another machine or a teammate's simulator |
| `preview` | Release build, internal distribution (Android APK; iOS ad hoc, needs registered devices) | Testing on real phones before a release |
| `production` | Store build (Android App Bundle; iOS App Store) | Google Play and the App Store |

Versions come from `app.json` (`appVersionSource: local`), so bump `version`, `android.versionCode` and `ios.buildNumber` there. F-Droid reads the same values.

## Still to do before the first release

- [x] App icon: `assets/source/mark.svg` (groups `calendar` and `today`) on a white background (`BACKGROUND` in `make-icons.cjs`, plus `android.adaptiveIcon.backgroundColor` in `app.json`). After changing it, run `node scripts/dev/make-icons.cjs` (app icons, splash, iOS Icon Composer layer), then `npm run screenshots -- --no-build` (feature graphic, F-Droid icon)
- [x] Screenshots: `npm run screenshots` (see below)
- [x] Developer name: Starboard Home (Google Play, F-Droid); legal name on the App Store
- [x] Publish `docs/PRIVACY.md` on GitHub Pages (needs Pages enabled once: Settings → Pages → Source: GitHub Actions)
- [x] `eas.json` with `development`, `preview` and `production` profiles
- [x] Link the EAS project (`npx eas-cli@latest init`): project `@starboardhome/nomad-days`
- [x] Make the repository public (F-Droid only builds public source)
- [x] Merge request to fdroiddata: [fdroid/fdroiddata!51068](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51068). Its pipeline passes; it's waiting for F-Droid review (see [F-Droid](#f-droid))

## Store screenshots

`npm run screenshots` (needs Playwright with Chromium: `npm i -g playwright && npx playwright install chromium`) builds the web app, opens six screens with the demo traveller (`?demo`) and frames them with captions:

| Output | Size | Upload to |
|---|---|---|
| `store/ios/*.png` | 1320 × 2868 | App Store Connect (6.9" iPhone) |
| `store/android/*.png` | 1080 × 1920 | Google Play phone screenshots |
| `store/android/feature-graphic.png` | 1024 × 500 | Google Play feature graphic |
| `fastlane/metadata/android/en-US/images/` | | F-Droid (picked up automatically) |

Screens and captions are in `SHOTS` in `scripts/dev/store-screenshots.cjs`; the demo data is `src/features/demo/demoData.ts`. Re-run after UI changes. The captures come from the web build, which closely matches the apps; for pixel-exact native captures, use **Settings → Developer → Load demo data** in a debug build and screenshot the simulator.

## F-Droid

The recipe is [`docs/fdroid/io.github.starboardhome.nomaddays.yml`](fdroid/io.github.starboardhome.nomaddays.yml). It follows the pattern of other Expo apps in fdroiddata:
- Node 24 from nodejs.org, pinned by sha256.
- Expo modules built from source (`buildFromSource`) instead of their prebuilt AARs.
- JDK 17 targets moved to 21 (the build server's JDK). That covers the React Native Gradle plugin and every module's `build.gradle` and `build.gradle.kts`. Modules that pin Kotlin's `jvmTarget` (`react-native-worklets`, `react-native-reanimated`) otherwise fail with "Inconsistent JVM Target Compatibility".
- `expo prebuild`, then the signing config removed so F-Droid can sign.
- NDK `27.1.12297006`, matching React Native's.
- **One APK per CPU type** (armeabi-v7a, arm64-v8a, x86_64), with versionCode `1000 × upstream + 1/2/3`. The universal APK was 131 MB; one ABI is about 45 MB. `VercodeOperation` lets auto-update compute these.
- **`commit:` is the full commit hash** of the release tag, never the tag name (F-Droid's template requires this).
- **Reproducible builds are off**, so F-Droid signs the APK with its own key. F-Droid and Play installs therefore can't update each other, and turning reproducible builds on later isn't possible for this app ID. Explain this in the merge request; the template asks for a reason.

What has been checked, and how to check it again after dependency upgrades:
- `fdroid lint` passes, and `fdroid rewritemeta` leaves the file unchanged (canonical format). fdroiddata CI runs fdroidserver from `master` with ruamel.yaml 0.18, which wraps long lines differently from the 2.4.5 release, so check the format with `pip install git+https://gitlab.com/fdroid/fdroidserver.git ruamel.yaml==0.18.10`.
- The prebuild steps run cleanly on a checkout. Every `sed` matches, and `android/app/build.gradle` comes out with no `signingConfig`.
- F-Droid's source scanner reports 0 problems. It deletes 137 prebuilt files under `node_modules` (Expo AARs and JARs, the optional libSQL and sqlite-vec libraries, and the dev-only esbuild and dotslash). It ignores the Hermes compiler and four Gradle files that point at React Native's local Maven repository.
- **`fdroid build` passed** on F-Droid's CI for `v1.0.0` (single universal APK) (merge request pipeline, 4 October 2026), and all 9 jobs pass. The scanner warns about two harmless files, an icon font and a Windows DLL that ships with the Hermes compiler; these don't block the build. Each successful pipeline also produces a signed test APK in the `fdroid build` job's artifacts.

### Opening the merge request

Opened for 1.0.0, then closed by F-Droid for not following the template (ticked boxes the recipe didn't meet: tag instead of hash, no ABI split, no reproducible-builds reason, Reports warnings not explained). Fixed for 1.0.1 ([fdroid/fdroiddata!51068](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51068), from the fork `starboardhome/nomad-days` on GitLab). Later releases need no new merge request: F-Droid finds new `v*` tags (`UpdateCheckMode: Tags`) and adds the build itself. Use these steps only if the recipe has to change.

1. Fork <https://gitlab.com/fdroid/fdroiddata> on GitLab and clone your fork.
2. Create a branch named `io.github.starboardhome.nomaddays` and copy the recipe to `metadata/io.github.starboardhome.nomaddays.yml`.
3. Run `fdroid lint io.github.starboardhome.nomaddays` and `fdroid rewritemeta io.github.starboardhome.nomaddays`. Install the tools with `pip install fdroidserver`, ideally in a virtualenv.
4. Commit with the message `New app: Nomad Days`, push, and open the merge request using the **App inclusion** template. Tick only the boxes that are true, and write the reason under any that aren't (reproducible builds, Reports warnings). Don't verify your GitLab account to run CI; leave a note in the merge request instead.
5. If the pipeline's build fails, fix the recipe on the branch. Mirror any fix back into `docs/fdroid/`.

Expect the reviewers to ask about the following:
- **OpenSSL for SQLCipher:** it comes prebuilt from Maven Central (`io.github.ronickg:openssl`). Maven Central is an allowed repository, but they may ask.
- **React Native's own artifacts** (`react-android`, `hermes-android`) also come from Maven Central, as in other React Native apps on F-Droid.
- **Reproducible builds:** if we want F-Droid to ship our signed APK, add `Binaries:` and `AllowedAPKSigningKeys:` once our own release APK builds identically.
