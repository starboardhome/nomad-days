import { memoryStore } from './dataStore';
import type { OpenedStore } from './openDataStore';

/**
 * Web preview only: nothing is saved (SQLCipher and the Keychain aren't available in a browser).
 * Add `?demo` to the URL to start with the demo traveller (used for store screenshots).
 */
export const openDataStore = async (): Promise<OpenedStore> => {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')) {
    const [{ demoData }, { localToday }] = await Promise.all([import('../features/demo/demoData'), import('../domain/days')]);
    // Screenshots show the app as it is on a phone, so hide the "nothing is saved" preview banner
    return { store: memoryStore(demoData(localToday())), wasReset: false, persistent: true };
  }
  return { store: memoryStore(), wasReset: false, persistent: false };
};
