# Privacy policy

_Last updated: 2 October 2026_

Nomad Days is an open-source app for counting days spent in different countries. This policy covers the iOS and Android apps.

## What the app collects

Nothing. The app has no accounts and no servers. It includes no analytics, crash reporting, advertising or tracking SDKs. The app makes no network requests. Links to official guidance (for example HMRC) open in your web browser only when you tap them.

## Data you enter

The countries of your tax residence and passports, your trips (including planned ones), your own rules, your answers to the UK residence questions and your settings are stored **only on your device**:

- in a database encrypted with SQLCipher (AES-256)
- with the encryption key held in the iOS Keychain or Android Keystore, available only on this device

The key never leaves the device and is excluded from iCloud and Google backups, so any copy of the database in a device backup can't be read. Android device backups are turned off for this app. If you lose or replace your phone, you can only get the data back from a backup file you exported yourself.

## Backups

When you export a backup, the app creates a file encrypted with a passphrase you choose (scrypt and XChaCha20-Poly1305). You decide where that file goes, for example Files, a cloud drive or email. Nobody, including the developers, can decrypt it without your passphrase, and a lost passphrase can't be recovered.

## Reminders

Reminders are scheduled locally by the operating system. No push service is used, and the Android app doesn't include Google Play Services or Firebase.

## Permissions

- **Notifications:** only if you turn on reminders.
- **Files and sharing:** only when you export or restore a backup.

## Children

The app isn't directed at children and collects no data from anyone.

## Changes

Changes to this policy are published in this file, and its history is public in the [repository](https://github.com/starboardhome/nomad-days/commits/main/docs/PRIVACY.md).

## Contact

Open an issue at <https://github.com/starboardhome/nomad-days/issues>.
