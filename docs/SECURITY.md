# Privacy & security model

Nomad Days has no server, no accounts, no analytics and no crash reporting. Everything stays on the device unless the user exports a backup.

## Data at rest

| What | Where | Protection |
|---|---|---|
| Profile, passports, trips, custom rules | `nomad-days.db` (SQLite) | Encrypted with SQLCipher (AES-256) using a random 256-bit key |
| Database key | iOS Keychain (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`) / Android Keystore | Never synced, never exported, never leaves the device |

- `android.allowBackup` is `false`, so Android never copies app data to Google Drive.
- `openAppDatabase()` refuses to run if SQLCipher isn't compiled in, so it never falls back to a plaintext database.
- If the key is missing, for example when app data has been restored onto another phone, the old file can't be read. It is replaced with an empty database and `wasReset: true` is returned, so the UI can offer to restore a backup.

## Encrypted backups (`.nomadbackup`)

A JSON envelope looks like this:

```json
{
  "format": "nomad-days-backup",
  "version": 1,
  "kdf": { "name": "scrypt", "N": 65536, "r": 8, "p": 1, "salt": "<16 bytes hex>" },
  "cipher": "xchacha20poly1305",
  "nonce": "<24 bytes hex>",
  "ciphertext": "<hex>"
}
```

- **Key:** `scrypt(NFKC(passphrase), salt, N=2^16, r=8, p=1)` produces 32 bytes. The passphrase must be at least 10 characters.
- **Encryption:** XChaCha20-Poly1305 with a random 24-byte nonce. The header fields are authenticated as associated data, so changing any of them makes decryption fail.
- **Contents:** the plaintext is the full `AppData` JSON. It is validated with zod before anything on the device is replaced, and the restore runs in a single transaction.
- **Limits:** imports reject KDF settings above `N=2^20, r=16, p=4`, so a crafted file can't lock up the phone.
- **Libraries:** crypto comes from `@noble/ciphers` and `@noble/hashes`, which are audited, pure JavaScript and have no native code. Random bytes come from `expo-crypto`, which uses the OS's secure random number generator.
- **Lost passphrase:** there is no recovery. That is intentional.

## Reporting a vulnerability

Please open a private security advisory on GitHub rather than a public issue.
