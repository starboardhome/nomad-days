import * as SQLite from 'expo-sqlite';
import { getOrCreateDbKey, isValidKey } from './key';
import { migrate } from './migrations';

export const DB_NAME = 'nomad-days.db';

export type OpenResult = Readonly<{
  db: SQLite.SQLiteDatabase;
  /** true if an old database couldn't be unlocked and a fresh one was created (restore from a backup) */
  wasReset: boolean;
}>;

const unlock = async (db: SQLite.SQLiteDatabase, hexKey: string) => {
  if (!isValidKey(hexKey)) throw new Error('Invalid database key');
  // Raw 256-bit key: SQLCipher skips its own key derivation. The key is hex-checked above, so it is safe to interpolate.
  await db.execAsync(`PRAGMA key = "x'${hexKey}'"`);
  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!cipher?.cipher_version) {
    // Never fall back to an unencrypted database
    throw new Error('SQLCipher is not enabled. Set "useSQLCipher": true for expo-sqlite in app.json and rebuild.');
  }
  // Fails with "file is not a database" if the key doesn't match
  await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
};

const openWithKey = async (hexKey: string) => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    await unlock(db, hexKey);
    return db;
  } catch (e) {
    await db.closeAsync();
    throw e;
  }
};

const isWrongKey = (e: unknown) => /not a database|SQLITE_NOTADB/i.test(String(e));

/**
 * Opens the encrypted database, creating it and its key on first launch.
 * If the key is gone (e.g. the app data was restored onto a new phone without its
 * Keychain/Keystore), the old file can't be read. It is replaced with an empty
 * database and `wasReset` is set, so the UI can offer to restore a backup.
 */
export const openAppDatabase = async (): Promise<OpenResult> => {
  const { key } = await getOrCreateDbKey();
  try {
    const db = await openWithKey(key);
    await migrate(db);
    return { db, wasReset: false };
  } catch (e) {
    if (!isWrongKey(e)) throw e;
    await SQLite.deleteDatabaseAsync(DB_NAME);
    const db = await openWithKey(key);
    await migrate(db);
    return { db, wasReset: true };
  }
};
