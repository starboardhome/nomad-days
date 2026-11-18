---
name: fdroid-release
description: Getting an Expo / React Native app into F-Droid and keeping it there. Covers the fdroiddata recipe, the merge request, review rounds, and updates after inclusion. Use when submitting to F-Droid, updating the recipe or its merge request, reading an F-Droid pipeline, or answering an F-Droid reviewer.
---

# F-Droid release playbook

How Nomad Days (Expo SDK 57, React Native 0.86, SQLCipher, a local Kotlin module with WorkManager) got into F-Droid. It took two months and five releases, 1.0.0 to 1.0.5, from the first merge request to inclusion. Most of that time went on mistakes listed here. Follow this and the next app should take one or two review rounds.

The live recipe is `docs/fdroid/io.github.starboardhome.nomaddays.yml`. Copy it as the starting point for a new Expo app.

## Hard rules

1. **`commit:` is the full 40-character hash** of the release commit, never the tag name.
2. **Tag the exact hash**, not "whatever main is": `git fetch origin && git tag vX.Y.Z <full-hash> && git push origin vX.Y.Z`. A stale local `main` once put `v1.0.1` on the wrong commit.
3. **Tick only template boxes that are true.** F-Droid closed the first merge request because boxes were ticked that the recipe didn't meet. Write the reason under any box you can't tick.
4. **One APK per ABI** (armeabi-v7a, arm64-v8a, x86_64) with versionCode `1000 × code + 1/2/3`, plus `VercodeOperation` so auto-update can work them out. A universal React Native APK is about 130 MB, and building it timed out F-Droid CI at one hour.
5. **Per-ABI changelogs:** `fastlane/metadata/android/en-US/changelogs/<code>.txt` and `<code>001.txt`, `<code>002.txt` and `<code>003.txt`, at most 500 characters each. F-Droid looks changelogs up by the per-ABI versionCode.
6. **Append to `gradle.properties` with `printf '\n…\n'`, never `echo >>`.** `expo prebuild` writes the file with no final newline, so `echo >>` glued the new line onto `expo.sqlite.useSQLCipher=true`. That silently disabled SQLCipher and the ABI split in two published builds. Guard every property you rely on with `grep -qx 'key=value' android/gradle.properties` in `prebuild`.
7. **Node comes from Debian**, not nvm or a downloaded tarball (reviewers ask for this): `apt-get install -y -t forky npm` with forky added to apt sources in `sudo`.
8. **Move JDK 17 targets to 21** (the build server's JDK) in `build.gradle` and in **`build.gradle.kts`**: `jvmTarget = '17'`, `JvmTarget.fromTarget("17")`, `JvmTarget.JVM_17` and `JavaVersion`. Missing the `.kts` forms gave "Inconsistent JVM Target Compatibility" in react-native-worklets.
9. **Validate with fdroidserver master**, because its YAML formatting differs from the release: `pip install git+https://gitlab.com/fdroid/fdroidserver.git ruamel.yaml==0.18.10`, then `fdroid lint <appid>` and `fdroid rewritemeta <appid>`. The file must come out unchanged. rewritemeta once wrapped a long `Changelog:` URL, and the field was then dropped.
10. **Mirror every recipe change into the repo copy** (`docs/fdroid/`), with a small PR after each GitLab paste.
11. **"Flake" needs proof.** Re-run a job only when it died before Gradle started, for example apt failing with `Broken pipe` from deb.debian.org. A Gradle or R8 failure is real.

## What reviewers asked for, and the fix

| Asked by | Request | Fix in this app |
|---|---|---|
| linsui (maintainer) | Follow the MR template | An honest description. Unmet boxes explained: no reproducible builds (F-Droid signs), and Reports warnings (Hermes DLL, icon font) are harmless |
| linsui | Debian Node | `apt-get install -t forky npm` |
| mezinster (reviewer) | Split APKs per ABI | Three `Builds:` entries, `-PreactNativeArchitectures=<abi>` |
| mezinster | Per-ABI changelogs | `<code>001`–`003.txt`, checked by `scripts/ci/check-changelogs.mjs` |
| mezinster | Remove unused permissions | `app.json` → `android.blockedPermissions`: SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE. Also `allowBackup: false` |
| mezinster | (found) SQLCipher missing from the APK | The `printf`/newline fix and the `grep -qx` guards (rules 6 and 7) |
| junkerderprovinz (tester) | No network traffic seen in PCAPdroid, so drop `INTERNET` | Block `INTERNET` in `app.json`, and add `plugins/withDebugInternet.js` to declare it in the **debug** manifest only. Without that plugin, Metro can't load JS in dev builds |
| junkerderprovinz | Drop USE_BIOMETRIC and USE_FINGERPRINT | `blockedPermissions`. A dependency's AAR merges them in, even though the app never asks for biometrics |
| junkerderprovinz | Reminder text stored in plain text in WorkManager's database | AES-GCM with an Android Keystore key (`ReminderCipher.kt`), without requiring an unlocked device so reminders still fire while the phone is locked |
| junkerderprovinz | Save backups to the device, not only Share | `Directory.pickDirectoryAsync()` and `createFile(name, 'application/octet-stream')` |
| linsui | "If you release a new version, update this MR" | Update the recipe to the new tag (see below) |
| linsui | Enable R8 | `expo-build-properties`: `android.enableMinifyInReleaseBuilds` and `enableShrinkResourcesInReleaseBuilds` set to `true` |
| ianrosswilliams (tester) | Checked with `aapt2 dump badging`, DEX tracker scan, logcat | Nothing to fix. Know that these are what reviewers run |

**Start a new app with all of this already done:** no INTERNET in release builds if the app is offline, no unused permissions, R8 on, sensitive data encrypted at rest (including WorkManager input data), ABI split, per-ABI changelogs.

## The recipe, step by step (Expo prebuild)

```yaml
sudo:
  - echo "deb https://deb.debian.org/debian forky main" > /etc/apt/sources.list.d/forky.list
  - apt-get update
  - apt-get install -y -t forky npm
prebuild:
  - sed -i -e '1a "expo":{"autolinking":{"android":{"buildFromSource":[".*"]}}},' package.json   # no prebuilt Expo AARs
  - npm ci --loglevel=error
  - sdkmanager 'cmake;3.22.1'
  - (JDK 17 → 21 seds: RN gradle plugin, then every node_modules/*/android/build.gradle*)
  - npx expo prebuild --platform android --no-install
  - sed -i -e '/signingConfig /d' android/app/build.gradle                                # F-Droid signs
  - sed -i 's/versionCode \([0-9][0-9]*\)/versionCode (\1 * 1000 + N)/' android/app/build.gradle
  - sed -i '/reactNativeArchitectures=/d' android/gradle.properties
  - printf '\nreactNativeArchitectures=<abi>\n' >> android/gradle.properties
  - printf '\norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=2g\norg.gradle.workers.max=2\n' >> android/gradle.properties
  - grep -qx 'expo.sqlite.useSQLCipher=true' android/gradle.properties
  - grep -qx 'reactNativeArchitectures=<abi>' android/gradle.properties
scandelete: [node_modules]
build:
  - cd android/app
  - gradle assembleRelease -PreactNativeArchitectures=<abi>
ndk: 27.1.12297006   # React Native's NDK
```

Also: `scanignore` for the Hermes compiler and the Gradle files that point at React Native's local Maven repository; `AutoUpdateMode: Version`; `UpdateCheckMode: Tags ^v\d+\.\d+\.\d+$`; `UpdateCheckData: app.json|"versionCode":\s*(\d+)|.|"version":\s*"([^"]+)"` (the app has no `android/` in git); and a `MaintainerNotes` block explaining the prebuild, buildFromSource and the ABI split.

## Before opening the merge request

- [ ] Repository public, licence file present, `AuthorName` set (a brand such as "Starboard Home" is fine; it doesn't have to be a legal name)
- [ ] `fastlane/metadata/android/en-US/`: title, short and full description, icon, screenshots, changelogs
- [ ] Our own CI proves:
  - `.github/workflows/native.yml`: no Firebase or Play Services (`releaseRuntimeClasspath` dependency check), and the merged release manifest has none of the `blockedPermissions` while the debug manifest keeps INTERNET (`scripts/ci/check-android-permissions.sh`)
  - `.github/workflows/launch.yml`: a release (R8) APK launches on an AOSP emulator without Google services, and the onboarding text appears. Onboarding needs the encrypted database, so this catches R8 or SQLCipher breakage that a "process is running" check misses
- [ ] `fdroid lint` and `rewritemeta` are clean (rule 9)
- [ ] Release tagged on the exact hash (rule 2), and the recipe `commit:` is that hash

## Merge request mechanics (GitLab)

1. Fork `fdroid/fdroiddata`. Create a branch named after the app ID, put the recipe at `metadata/<appid>.yml`, and commit "New app: <Name>".
2. CI runs on your fork. GitLab may ask you to verify your account before shared runners start. A pipeline showing **Pending** with a pause icon is waiting for a runner, not stuck on you. Start one with Build → Pipelines → Run pipeline, choosing the branch.
3. Open the MR with the **App inclusion** template (rule 3).
4. The `fdroid build` job takes about 35–40 minutes for three ABIs. Its artifacts include **CI-signed test APKs** you can install on a phone. Uninstall them before installing the real F-Droid build: different key.
5. Anyone can read public pipelines, jobs and logs without signing in, so Claude can check them (`https://gitlab.com/api/v4/projects/<fork-id>/pipelines`, `/-/jobs/<id>/trace.json`). MR comments need sign-in, so paste reviewer comments into the chat.

## Releasing a new version while the MR is open

linsui asked for this explicitly. For each release during review:
1. Bump `version`, `versionCode` and `buildNumber`, add the 4 changelogs, merge to main.
2. Tag the merge commit's full hash (rule 2).
3. In the recipe, change `versionName` (×3), `versionCode` (×3: `<code>001`–`003`), `commit` (×3), `CurrentVersion` and `CurrentVersionCode`. Nothing else.
4. Paste it over the MR file on GitLab and let the pipeline run. Then post a short note: what changed, the new tag, the new versionCodes.
5. Mirror the recipe into `docs/fdroid/` (rule 10).

Plan the release so its changes are what reviewers asked for. Don't tag a release with untested native changes just to update the MR: test on a phone first.

## After inclusion

- F-Droid's build server builds and signs the app. It appears on f-droid.org and in the client within days, sometimes a week or more.
- **Updates are automatic:** push a `vX.Y.Z` tag with the versions bumped and changelogs added, and F-Droid's checkupdates picks it up. No new MR, unless the recipe itself must change (new build steps).
- **Badge:** in the README, `https://f-droid.org/badge/get-it-on.png` (GitHub proxies README images). On the website, download it at build time in the Pages workflow and serve it from the site, so visitors don't contact a third party.
- F-Droid and Play/App Store builds are signed with different keys and can't update each other. Say so in support docs.

## Things that cost time and how to avoid them

| Symptom | Cause | Avoid it by |
|---|---|---|
| MR closed by a maintainer | Template boxes ticked dishonestly | Rule 3 |
| CI timeout at 1 hour | Universal APK (the ABI split silently broken) | Rules 4 and 6 |
| Field missing after rewritemeta | A long line wrapped by ruamel 0.18 | Rule 9: validate with master |
| "Inconsistent JVM Target Compatibility" | `.kts` files not covered by the JDK sed | Rule 8 |
| SQLCipher missing in published builds | `echo >>` onto a file without a final newline | Rule 6 |
| `Broken pipe` during apt | deb.debian.org dropped the connection | Retry the job once (rule 11) |
| Tag on the wrong commit | Stale local main | Rule 2 |
| Metro broken in dev builds after blocking INTERNET | `blockedPermissions` also removes it from debug | The `withDebugInternet` config plugin |
| Dependency audit red on main | New advisories in build tooling | Lockfile-only updates within ranges. Otherwise a dated exception with a reason in `.audit-allowlist.json` |
