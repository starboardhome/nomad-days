import { create } from 'zustand';
import { emptyAppData, type AppData, type Profile, type Settings, type StayRecord } from '../data/schema';
import type { DataStore } from '../storage/dataStore';
import { openDataStore } from '../storage/openDataStore';

type Status = 'loading' | 'ready' | 'error';

type AppState = Readonly<{
  status: Status;
  error?: string;
  data: AppData;
  store?: DataStore;
  wasReset: boolean; //   old database couldn't be unlocked → suggest restoring a backup
  persistent: boolean; // false in the web preview
}>;

type Actions = Readonly<{
  init: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  saveStays: (stays: readonly StayRecord[]) => Promise<void>;
  deleteStay: (id: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  reload: () => Promise<void>;
  dismissReset: () => void;
}>;

export const useApp = create<AppState & Actions>((set, get) => {
  /** Run a write, then refresh state from storage so the UI always shows what's persisted */
  const commit = async (write: (store: DataStore) => Promise<void>) => {
    const { store } = get();
    if (!store) throw new Error('Storage is not ready yet');
    await write(store);
    set({ data: await store.load() });
  };

  return {
    status: 'loading',
    data: emptyAppData(),
    wasReset: false,
    persistent: true,

    init: async () => {
      if (get().store) return;
      try {
        const { store, wasReset, persistent } = await openDataStore();
        set({ store, wasReset, persistent, data: await store.load(), status: 'ready' });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },
    saveProfile: (profile) => commit((s) => s.saveProfile(profile)),
    saveStays: (stays) => commit((s) => s.saveStays(stays)),
    deleteStay: (id) => commit((s) => s.deleteStay(id)),
    saveSettings: (settings) => commit((s) => s.saveSettings(settings)),
    reload: () => commit(async () => {}),
    dismissReset: () => set({ wasReset: false }),
  };
});
