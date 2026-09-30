import { emptyAppData, AppDataSchema, type AppData, type Profile, type Settings, type StayRecord } from '../data/schema';
import type { RawJurisdiction } from '../rules/schema';
import type { Db } from './db';
import {
  deleteCustomJurisdiction,
  deleteStay,
  loadAppData,
  replaceAppData,
  saveCustomJurisdiction,
  saveProfile,
  saveSettings,
  saveStays,
} from './repo';

/** What the app needs from storage. SQLite on devices; in-memory for web preview and tests. */
export interface DataStore {
  load(): Promise<AppData>;
  saveProfile(profile: Profile): Promise<void>;
  saveStays(stays: readonly StayRecord[]): Promise<void>;
  deleteStay(id: string): Promise<void>;
  saveCustomJurisdiction(j: RawJurisdiction): Promise<void>;
  deleteCustomJurisdiction(id: string): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  replaceAll(data: AppData): Promise<void>;
}

export const sqliteStore = (db: Db): DataStore => ({
  load: () => loadAppData(db),
  saveProfile: (p) => saveProfile(db, p),
  saveStays: (s) => saveStays(db, s),
  deleteStay: (id) => deleteStay(db, id),
  saveCustomJurisdiction: (j) => saveCustomJurisdiction(db, j),
  deleteCustomJurisdiction: (id) => deleteCustomJurisdiction(db, id),
  saveSettings: (s) => saveSettings(db, s),
  replaceAll: (d) => replaceAppData(db, d),
});

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

const newestFirst = (a: StayRecord, b: StayRecord) =>
  b.entry.localeCompare(a.entry) || a.id.localeCompare(b.id);

/** Non-persistent store with the same validation rules */
export const memoryStore = (initial: AppData = emptyAppData()): DataStore => {
  let data = AppDataSchema.parse(initial);
  const update = (next: AppData) => {
    data = AppDataSchema.parse(next);
  };
  return {
    load: async () => {
      const copy: AppData = JSON.parse(JSON.stringify(data));
      return { ...copy, stays: [...copy.stays].sort(newestFirst) }; // same order as SQLite
    },
    saveProfile: async (profile) =>
      update({ ...data, profile: { ...profile, passports: [...new Set(profile.passports)].sort() } }),
    saveStays: async (stays) => {
      const ids = new Set(stays.map((s) => s.id));
      update({ ...data, stays: [...data.stays.filter((s) => !ids.has(s.id)), ...stays] });
    },
    deleteStay: async (id) => update({ ...data, stays: data.stays.filter((s) => s.id !== id) }),
    saveCustomJurisdiction: async (j) =>
      update({ ...data, customJurisdictions: [...data.customJurisdictions.filter((c) => c.id !== j.id), j].sort(byId) }),
    deleteCustomJurisdiction: async (id) =>
      update({ ...data, customJurisdictions: data.customJurisdictions.filter((c) => c.id !== id) }),
    saveSettings: async (settings) => update({ ...data, settings }),
    replaceAll: async (next) => update(next),
  };
};
