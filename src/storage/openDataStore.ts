import { openAppDatabase } from './database';
import { sqliteStore, type DataStore } from './dataStore';

export type OpenedStore = Readonly<{ store: DataStore; wasReset: boolean; persistent: boolean }>;

/** Devices: the encrypted SQLite database. (Web preview uses openDataStore.web.ts.) */
export const openDataStore = async (): Promise<OpenedStore> => {
  const { db, wasReset } = await openAppDatabase();
  return { store: sqliteStore(db), wasReset, persistent: true };
};
