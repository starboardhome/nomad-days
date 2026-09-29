import {
  AppDataSchema,
  ProfileSchema,
  StayRecordSchema,
  type AppData,
  type Profile,
  type StayRecord,
} from '../data/schema';
import { JurisdictionSchema, type RawJurisdiction } from '../rules/schema';
import type { Db } from './db';

type StayRow = { id: string; country: string; entry: string; exit: string | null; note: string | null };

const toStay = (row: StayRow): StayRecord =>
  StayRecordSchema.parse({
    id: row.id,
    country: row.country,
    entry: row.entry,
    ...(row.exit ? { exit: row.exit } : {}),
    ...(row.note ? { note: row.note } : {}),
  });

// ── Profile ─────────────────────────────────────────────────
export const getProfile = async (db: Db): Promise<Profile> => {
  const row = await db.getFirstAsync<{ tax_residence: string | null }>(
    'SELECT tax_residence FROM profile WHERE id = 1',
    [],
  );
  const passports = await db.getAllAsync<{ country: string }>('SELECT country FROM passports ORDER BY country', []);
  return ProfileSchema.parse({
    taxResidence: row?.tax_residence ?? null,
    passports: passports.map((p) => p.country),
  });
};

const writeProfile = async (db: Db, profile: Profile) => {
  await db.runAsync('UPDATE profile SET tax_residence = ? WHERE id = 1', [profile.taxResidence]);
  await db.runAsync('DELETE FROM passports', []);
  for (const country of new Set(profile.passports)) {
    await db.runAsync('INSERT INTO passports (country) VALUES (?)', [country]);
  }
};

export const saveProfile = async (db: Db, profile: Profile): Promise<void> => {
  const valid = ProfileSchema.parse(profile);
  await db.withTransactionAsync(() => writeProfile(db, valid));
};

// ── Stays ───────────────────────────────────────────────────
export const listStays = async (db: Db): Promise<StayRecord[]> =>
  (await db.getAllAsync<StayRow>('SELECT id, country, entry, exit, note FROM stays ORDER BY entry DESC, id', [])).map(
    toStay,
  );

const writeStay = (db: Db, s: StayRecord) =>
  db.runAsync(
    `INSERT INTO stays (id, country, entry, exit, note) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET country = excluded.country, entry = excluded.entry,
       exit = excluded.exit, note = excluded.note`,
    [s.id, s.country, s.entry, s.exit ?? null, s.note ?? null],
  );

/** Insert or update a stay. Throws if the stay is invalid (e.g. exit before entry). */
export const saveStay = async (db: Db, stay: StayRecord): Promise<void> => {
  await writeStay(db, StayRecordSchema.parse(stay));
};

/** Save several stays atomically (e.g. a new trip plus closing the previous one) */
export const saveStays = async (db: Db, stays: readonly StayRecord[]): Promise<void> => {
  const valid = stays.map((s) => StayRecordSchema.parse(s));
  await db.withTransactionAsync(async () => {
    for (const s of valid) await writeStay(db, s);
  });
};

export const deleteStay = async (db: Db, id: string): Promise<void> => {
  await db.runAsync('DELETE FROM stays WHERE id = ?', [id]);
};

// ── Custom jurisdictions ───────────────────────────────────
export const listCustomJurisdictions = async (db: Db): Promise<RawJurisdiction[]> =>
  (await db.getAllAsync<{ json: string }>('SELECT json FROM custom_jurisdictions ORDER BY id', [])).map((r) =>
    JurisdictionSchema.parse(JSON.parse(r.json)),
  );

const writeCustom = (db: Db, j: RawJurisdiction) =>
  db.runAsync(
    'INSERT INTO custom_jurisdictions (id, json) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET json = excluded.json',
    [j.id, JSON.stringify(j)],
  );

export const saveCustomJurisdiction = async (db: Db, j: RawJurisdiction): Promise<void> => {
  await writeCustom(db, JurisdictionSchema.parse(j));
};

export const deleteCustomJurisdiction = async (db: Db, id: string): Promise<void> => {
  await db.runAsync('DELETE FROM custom_jurisdictions WHERE id = ?', [id]);
};

// ── Whole-database snapshot (used by backup export/import) ─
export const loadAppData = async (db: Db): Promise<AppData> =>
  AppDataSchema.parse({
    schemaVersion: 1,
    profile: await getProfile(db),
    stays: await listStays(db),
    customJurisdictions: await listCustomJurisdictions(db),
  });

/** Replace everything with `data` in one transaction. Validates first, so bad data never half-writes. */
export const replaceAppData = async (db: Db, data: AppData): Promise<void> => {
  const valid = AppDataSchema.parse(data);
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM stays; DELETE FROM custom_jurisdictions;');
    await writeProfile(db, valid.profile);
    for (const s of valid.stays) await writeStay(db, s);
    for (const j of valid.customJurisdictions) await writeCustom(db, j);
  });
};
