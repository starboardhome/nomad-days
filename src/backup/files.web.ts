/** Web preview: backups need the device's file system and share sheet. */
import type { DataStore } from '../storage/dataStore';
import type { Progress } from './envelope';

const unavailable = (): never => {
  throw new Error('Backups are only available in the iOS and Android apps.');
};

export const exportBackup = async (_store: DataStore, _passphrase: string, _onProgress?: Progress): Promise<void> =>
  unavailable();
export const pickBackupFile = async (): Promise<string | null> => unavailable();
export const restoreBackup = async (_store: DataStore, _text: string, _passphrase: string, _onProgress?: Progress) =>
  unavailable();
