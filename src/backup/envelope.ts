/**
 * Encrypted backup format (pure — no Expo imports, fully unit-tested).
 *
 *   key        = scrypt(NFKC(passphrase), salt, N, r, p) → 32 bytes
 *   ciphertext = XChaCha20-Poly1305(key, nonce, JSON(AppData), aad = header)
 *
 * The header (format, version, KDF params, cipher) is authenticated as AAD,
 * so changing any of it makes decryption fail.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import { z } from 'zod';
import { AppDataSchema, type AppData } from '../data/schema';

export const BACKUP_FORMAT = 'nomad-days-backup';
export const BACKUP_EXTENSION = 'nomadbackup';
export const MIN_PASSPHRASE_LENGTH = 10;

/** 64 MiB, a few seconds on a phone. Stored in each file so it can be raised later. */
export const DEFAULT_KDF = { N: 2 ** 16, r: 8, p: 1 } as const;
/** Upper bounds accepted on import, so a crafted file can't freeze the app */
const MAX_KDF = { N: 2 ** 20, r: 16, p: 4 } as const;

export type Rng = (byteCount: number) => Uint8Array;
export type KdfParams = Readonly<{ N: number; r: number; p: number }>;
export type Progress = (fraction: number) => void;

const hex = (bytes: number) => z.string().regex(new RegExp(`^[0-9a-f]{${bytes * 2}}$`));

const EnvelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  kdf: z.object({
    name: z.literal('scrypt'),
    N: z.number().int().min(2 ** 10).max(MAX_KDF.N).refine((n) => (n & (n - 1)) === 0, 'N must be a power of 2'),
    r: z.number().int().min(1).max(MAX_KDF.r),
    p: z.number().int().min(1).max(MAX_KDF.p),
    salt: hex(16),
  }),
  cipher: z.literal('xchacha20poly1305'),
  nonce: hex(24),
  ciphertext: z.string().regex(/^([0-9a-f]{2})+$/),
});
type Envelope = z.infer<typeof EnvelopeSchema>;

export type BackupErrorCode = 'not-a-backup' | 'unsupported-version' | 'wrong-passphrase' | 'invalid-data';

export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

/** Unicode normal form, so "é" typed on different keyboards derives the same key */
const UNICODE_FORM = 'NFKC';
const canonical = (text: string) => text.normalize(UNICODE_FORM);

/** Returns an error message, or null if the passphrase is acceptable */
export const passphraseProblem = (passphrase: string): string | null =>
  canonical(passphrase).length < MIN_PASSPHRASE_LENGTH
    ? `Use at least ${MIN_PASSPHRASE_LENGTH} characters. A few random words works well.`
    : null;

/** Canonical header bytes. Fixed key order, so encrypt and decrypt produce identical AAD. */
const headerAad = ({ format, version, kdf, cipher }: Envelope | Omit<Envelope, 'nonce' | 'ciphertext'>) =>
  utf8ToBytes(
    JSON.stringify({
      format,
      version,
      kdf: { name: kdf.name, N: kdf.N, r: kdf.r, p: kdf.p, salt: kdf.salt },
      cipher,
    }),
  );

const deriveKey = (passphrase: string, salt: Uint8Array, { N, r, p }: KdfParams, onProgress?: Progress) =>
  scryptAsync(utf8ToBytes(canonical(passphrase)), salt, { N, r, p, dkLen: 32, onProgress });

export const encryptBackup = async (
  data: AppData,
  passphrase: string,
  rng: Rng,
  kdf: KdfParams = DEFAULT_KDF,
  onProgress?: Progress,
): Promise<string> => {
  const problem = passphraseProblem(passphrase);
  if (problem) throw new Error(problem);

  const salt = rng(16);
  const nonce = rng(24);
  const header: Omit<Envelope, 'nonce' | 'ciphertext'> = {
    format: BACKUP_FORMAT,
    version: 1,
    kdf: { name: 'scrypt', ...kdf, salt: bytesToHex(salt) },
    cipher: 'xchacha20poly1305',
  };
  const key = await deriveKey(passphrase, salt, kdf, onProgress);
  const plaintext = utf8ToBytes(JSON.stringify(AppDataSchema.parse(data)));
  const ciphertext = xchacha20poly1305(key, nonce, headerAad(header)).encrypt(plaintext);
  key.fill(0);

  const envelope: Envelope = { ...header, nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext) };
  return JSON.stringify(envelope);
};

const parseEnvelope = (text: string): Envelope => {
  const json = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new BackupError('not-a-backup', "This file isn't a Nomad Days backup.");
    }
  })();
  const format = (json as { format?: unknown })?.format;
  const version = (json as { version?: unknown })?.version;
  if (format !== BACKUP_FORMAT) throw new BackupError('not-a-backup', "This file isn't a Nomad Days backup.");
  if (version !== 1) {
    throw new BackupError('unsupported-version', 'This backup was made by a newer version of the app. Please update.');
  }
  const result = EnvelopeSchema.safeParse(json);
  if (!result.success) throw new BackupError('not-a-backup', 'This backup file is damaged.');
  return result.data;
};

export const decryptBackup = async (text: string, passphrase: string, onProgress?: Progress): Promise<AppData> => {
  const env = parseEnvelope(text);
  const key = await deriveKey(passphrase, hexToBytes(env.kdf.salt), env.kdf, onProgress);

  const plaintext = (() => {
    try {
      return xchacha20poly1305(key, hexToBytes(env.nonce), headerAad(env)).decrypt(hexToBytes(env.ciphertext));
    } catch {
      // Authentication failure: wrong passphrase, or the file was modified
      throw new BackupError('wrong-passphrase', 'Wrong passphrase, or the file has been modified.');
    } finally {
      key.fill(0);
    }
  })();

  const result = (() => {
    try {
      return AppDataSchema.safeParse(JSON.parse(bytesToUtf8(plaintext)));
    } catch {
      return { success: false as const };
    }
  })();
  if (!result.success) throw new BackupError('invalid-data', 'The backup decrypted but its contents are invalid.');
  return result.data;
};
