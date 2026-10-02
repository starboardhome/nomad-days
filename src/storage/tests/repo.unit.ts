import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { defaultSettings, type AppData } from '../../data/schema';
import { MIGRATIONS, migrate, schemaVersion } from '../migrations';
import {
  deleteStay,
  getProfile,
  listCustomJurisdictions,
  listStays,
  loadAppData,
  replaceAppData,
  saveCustomJurisdiction,
  saveProfile,
  getSettings,
  saveSettings,
  saveStay,
  saveStays,
} from '../repo';
import { nodeDb } from './nodeDb';

const thailand = {
  id: 'custom-th',
  name: 'Thailand',
  countries: ['TH'],
  lastReviewed: '2026-09-29',
  rules: [
    {
      id: 'custom-th-1',
      category: 'entry' as const,
      kind: 'perVisit' as const,
      label: '60 days',
      counting: 'anyPartOfDay' as const,
      limit: { unit: 'days' as const, value: 60 },
      exemptNationalities: [],
      notes: [],
      sources: ['https://user-defined.local'],
    },
  ],
};

describe('migrations', () => {
  it('creates the schema and is safe to re-run', async () => {
    const db = nodeDb();
    assert.equal(await schemaVersion(db), 0);
    await migrate(db);
    await migrate(db);
    assert.equal(await schemaVersion(db), MIGRATIONS.length);
  });

  it('upgrades a v1 database without losing data', async () => {
    const db = nodeDb();
    await db.execAsync(MIGRATIONS[0]);
    await db.execAsync('PRAGMA user_version = 1');
    // Written the way the v1 app did (today's repo writes columns that v1 doesn't have yet)
    await db.runAsync("INSERT INTO stays (id, country, entry) VALUES ('kept', 'FR', '2025-01-01')", []);
    await migrate(db);
    assert.deepEqual((await listStays(db)).map((s) => s.id), ['kept']);
    assert.deepEqual(await getSettings(db), defaultSettings());
  });

  it('upgrades a v2 database and stores planned trips', async () => {
    const db = nodeDb();
    for (const sql of MIGRATIONS.slice(0, 2)) await db.execAsync(sql);
    await db.execAsync('PRAGMA user_version = 2');
    await db.runAsync("INSERT INTO stays (id, country, entry) VALUES ('old', 'FR', '2025-01-01')", []);
    await migrate(db);
    await saveStay(db, { id: 'trip', country: 'TH', entry: '2027-01-10', exit: '2027-02-01', plan: 'maybe' });
    assert.deepEqual(await listStays(db), [
      { id: 'trip', country: 'TH', entry: '2027-01-10', exit: '2027-02-01', plan: 'maybe' },
      { id: 'old', country: 'FR', entry: '2025-01-01' },
    ]);
    await assert.rejects(saveStay(db, { id: 'x', country: 'TH', entry: '2027-01-10', plan: 'booked' }), /needs an end date/);
  });

  it('refuses a database from a newer app version', async () => {
    const db = nodeDb();
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length + 1}`);
    await assert.rejects(migrate(db), /newer app version/);
  });
});

describe('repo', () => {
  let db: ReturnType<typeof nodeDb>;
  beforeEach(async () => {
    db = nodeDb();
    await migrate(db);
  });

  it('starts with an empty profile', async () => {
    assert.deepEqual(await getProfile(db), { taxResidence: null, passports: [] });
  });

  it('saves the profile and de-duplicates passports', async () => {
    await saveProfile(db, { taxResidence: 'AE', passports: ['IE', 'AU', 'AU'] });
    assert.deepEqual(await getProfile(db), { taxResidence: 'AE', passports: ['AU', 'IE'] });
  });

  it('rejects invalid country codes', async () => {
    await assert.rejects(saveProfile(db, { taxResidence: 'uae', passports: [] }));
  });

  it('upserts, lists (newest first) and deletes stays', async () => {
    await saveStay(db, { id: 'a', country: 'FR', entry: '2026-06-01', exit: '2026-06-10' });
    await saveStay(db, { id: 'b', country: 'GB', entry: '2026-09-01', note: 'London' });
    await saveStay(db, { id: 'a', country: 'FR', entry: '2026-06-01', exit: '2026-06-12' });
    assert.deepEqual(await listStays(db), [
      { id: 'b', country: 'GB', entry: '2026-09-01', note: 'London' },
      { id: 'a', country: 'FR', entry: '2026-06-01', exit: '2026-06-12' },
    ]);
    await deleteStay(db, 'a');
    assert.equal((await listStays(db)).length, 1);
  });

  it('saves several stays atomically', async () => {
    await saveStays(db, [
      { id: 'x', country: 'FR', entry: '2026-06-01' },
      { id: 'y', country: 'DE', entry: '2026-06-05' },
    ]);
    await assert.rejects(saveStays(db, [{ id: 'z', country: 'ES', entry: '2026-07-01' }, { id: '', country: 'ES', entry: 'bad' }]));
    assert.deepEqual((await listStays(db)).map((s) => s.id), ['y', 'x']);
  });

  it('rejects a stay that ends before it starts', async () => {
    await assert.rejects(saveStay(db, { id: 'x', country: 'FR', entry: '2026-06-10', exit: '2026-06-01' }), /before entry/);
  });

  it('saves settings and validates them', async () => {
    await saveSettings(db, { reminders: { enabled: true, leadDays: [14, 3], hour: 8 } });
    assert.deepEqual(await getSettings(db), { reminders: { enabled: true, leadDays: [14, 3], hour: 8 } });
    await assert.rejects(saveSettings(db, { reminders: { enabled: true, leadDays: [], hour: 25 } }));
  });

  it('stores custom jurisdictions', async () => {
    await saveCustomJurisdiction(db, thailand);
    assert.deepEqual(await listCustomJurisdictions(db), [thailand]);
  });

  it('round-trips a full snapshot', async () => {
    const data: AppData = {
      schemaVersion: 1,
      profile: { taxResidence: 'AE', passports: ['AU'] },
      stays: [{ id: 's1', country: 'US', entry: '2026-01-01', exit: '2026-01-31' }],
      customJurisdictions: [thailand],
      settings: { reminders: { enabled: true, leadDays: [7], hour: 18 } },
    };
    await saveStay(db, { id: 'old', country: 'FR', entry: '2025-01-01' });
    await replaceAppData(db, data);
    assert.deepEqual(await loadAppData(db), data);
  });

  it('leaves existing data untouched if a restore is invalid', async () => {
    await saveStay(db, { id: 'keep', country: 'FR', entry: '2025-01-01' });
    const bad = { schemaVersion: 1, profile: { taxResidence: null, passports: [] }, stays: [{ id: '', country: 'FR', entry: 'nope' }], customJurisdictions: [] };
    await assert.rejects(replaceAppData(db, bad as unknown as AppData));
    assert.deepEqual((await listStays(db)).map((s) => s.id), ['keep']);
  });

  it('rolls back a restore that fails part-way', async () => {
    await saveStay(db, { id: 'keep', country: 'FR', entry: '2025-01-01' });
    const restore: AppData = {
      schemaVersion: 1,
      profile: { taxResidence: 'AE', passports: ['AU'] },
      stays: [],
      customJurisdictions: [thailand],
      settings: defaultSettings(),
    };
    // Simulate a mid-transaction failure by dropping a table the restore writes to
    await db.execAsync('DROP TABLE custom_jurisdictions');
    await assert.rejects(replaceAppData(db, restore));
    assert.deepEqual((await listStays(db)).map((s) => s.id), ['keep']);
    assert.deepEqual(await getProfile(db), { taxResidence: null, passports: [] });
  });
});
