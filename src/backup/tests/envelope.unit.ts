import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';
import { defaultSettings, type AppData } from '../../data/schema';
import { BackupError, decryptBackup, encryptBackup, passphraseProblem } from '../envelope';

const rng = (n: number) => new Uint8Array(randomBytes(n));
const FAST = { N: 2 ** 10, r: 8, p: 1 }; // keep tests quick; the app uses DEFAULT_KDF
// Test passphrases are generated per run, so no credential-like literals live in the repo
const randomPassphrase = () => randomBytes(12).toString('hex');
const PASS = randomPassphrase();

const data: AppData = {
  schemaVersion: 1,
  profile: { taxResidence: 'AE', passports: ['AU', 'IE'] },
  stays: [
    { id: 's1', country: 'FR', entry: '2026-06-01', exit: '2026-07-30', note: 'Café ☕ in Paris' },
    { id: 's2', country: 'IT', entry: '2026-09-20' },
  ],
  customJurisdictions: [],
  settings: defaultSettings(),
};

const rejectsWith = (promise: Promise<unknown>, code: BackupError['code']) =>
  assert.rejects(promise, (e: unknown) => e instanceof BackupError && e.code === code);

const mutate = (text: string, fn: (env: Record<string, any>) => void) => {
  const env = JSON.parse(text);
  fn(env);
  return JSON.stringify(env);
};

describe('backup envelope', () => {
  it('round-trips data, including non-ASCII text', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    assert.deepEqual(await decryptBackup(text, PASS), data);
  });

  it('opens backups made before settings existed (fills in defaults)', async () => {
    const { settings: _omit, ...legacy } = data;
    const text = await encryptBackup(legacy as AppData, PASS, rng, FAST);
    assert.deepEqual((await decryptBackup(text, PASS)).settings, defaultSettings());
  });

  it('never contains the plaintext', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    ['Paris', '2026-06-01', '"FR"', 'passports'].forEach((s) => assert.ok(!text.includes(s), s));
  });

  it('uses a fresh salt and nonce every time', async () => {
    const [a, b] = await Promise.all([encryptBackup(data, PASS, rng, FAST), encryptBackup(data, PASS, rng, FAST)]);
    assert.notEqual(JSON.parse(a).nonce, JSON.parse(b).nonce);
    assert.notEqual(JSON.parse(a).kdf.salt, JSON.parse(b).kdf.salt);
  });

  it('rejects the wrong passphrase', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    await rejectsWith(decryptBackup(text, randomPassphrase()), 'wrong-passphrase');
  });

  it('detects a modified ciphertext', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    const tampered = mutate(text, (e) => {
      e.ciphertext = (e.ciphertext[0] === 'a' ? 'b' : 'a') + e.ciphertext.slice(1);
    });
    await rejectsWith(decryptBackup(tampered, PASS), 'wrong-passphrase');
  });

  it('detects a modified header (authenticated as AAD)', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    await rejectsWith(decryptBackup(mutate(text, (e) => (e.kdf.r = 9)), PASS), 'wrong-passphrase');
  });

  it('rejects non-backup files and newer versions', async () => {
    await rejectsWith(decryptBackup('not json', PASS), 'not-a-backup');
    await rejectsWith(decryptBackup('{"hello":"world"}', PASS), 'not-a-backup');
    const text = await encryptBackup(data, PASS, rng, FAST);
    await rejectsWith(decryptBackup(mutate(text, (e) => (e.version = 2)), PASS), 'unsupported-version');
  });

  it('refuses KDF settings that would freeze the phone', async () => {
    const text = await encryptBackup(data, PASS, rng, FAST);
    await rejectsWith(decryptBackup(mutate(text, (e) => (e.kdf.N = 2 ** 24)), PASS), 'not-a-backup');
  });

  it('treats NFC and NFD passphrases the same', async () => {
    const accented = `cr\u00e8me br\u00fbl\u00e9e ${randomPassphrase()}`; // NFC form
    const text = await encryptBackup(data, accented, rng, FAST);
    assert.deepEqual(await decryptBackup(text, accented.normalize('NFD')), data);
  });

  it('requires a passphrase of at least 10 characters', async () => {
    assert.ok(passphraseProblem('short'));
    assert.equal(passphraseProblem('ten chars!'), null);
    await assert.rejects(encryptBackup(data, 'short', rng, FAST));
  });

  it('reports KDF progress', async () => {
    const seen: number[] = [];
    await encryptBackup(data, PASS, rng, FAST, (f) => seen.push(f));
    assert.ok(seen.length > 0 && seen.at(-1)! <= 1);
  });
});
