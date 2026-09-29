import { memoryStore } from './dataStore';
import type { OpenedStore } from './openDataStore';

/** Web preview only: nothing is saved (SQLCipher and the Keychain aren't available in a browser). */
export const openDataStore = async (): Promise<OpenedStore> => ({
  store: memoryStore(),
  wasReset: false,
  persistent: false,
});
