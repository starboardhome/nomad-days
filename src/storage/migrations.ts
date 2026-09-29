import type { Db } from './db';

/**
 * Append-only list of schema changes. Never edit a migration once released:
 * add a new entry instead. Entry i moves the database from version i to i + 1.
 */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE profile (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     tax_residence TEXT
   );
   INSERT INTO profile (id, tax_residence) VALUES (1, NULL);

   CREATE TABLE passports (country TEXT PRIMARY KEY);

   CREATE TABLE stays (
     id TEXT PRIMARY KEY,
     country TEXT NOT NULL,
     entry TEXT NOT NULL,
     exit TEXT,
     note TEXT
   );
   CREATE INDEX stays_entry ON stays (entry);

   CREATE TABLE custom_jurisdictions (
     id TEXT PRIMARY KEY,
     json TEXT NOT NULL
   );`,
  // v2: app settings (reminder preferences) as one JSON document
  `CREATE TABLE settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
];

export const schemaVersion = async (db: Db): Promise<number> =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;

/** Brings the database up to the latest schema. Safe to run on every launch. */
export const migrate = async (db: Db): Promise<number> => {
  const from = await schemaVersion(db);
  if (from > MIGRATIONS.length) {
    throw new Error(`Database is from a newer app version (v${from}). Please update the app.`);
  }
  for (const [i, sql] of MIGRATIONS.entries()) {
    if (i < from) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
  return MIGRATIONS.length;
};
