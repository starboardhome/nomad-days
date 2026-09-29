/** Expo glue: write/share and pick/read backup files. Encryption itself lives in envelope.ts. */
import { getRandomBytes } from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { localToday, toISO } from '../domain/days';
import type { DataStore } from '../storage/dataStore';
import { BACKUP_EXTENSION, decryptBackup, encryptBackup, type Progress } from './envelope';

const backupFileName = () => `nomad-days-${toISO(localToday())}.${BACKUP_EXTENSION}`;

/** Encrypts everything and opens the share sheet (save to Files, AirDrop, email to yourself…) */
export const exportBackup = async (store: DataStore, passphrase: string, onProgress?: Progress): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const text = await encryptBackup(await store.load(), passphrase, getRandomBytes, undefined, onProgress);

  const file = new File(Paths.cache, backupFileName());
  file.create({ overwrite: true });
  file.write(text);
  // The file is already encrypted. It stays in the cache, which the OS clears, and is overwritten on the next export.
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your encrypted backup',
  });
};

/** Lets the user pick a backup file. Returns its text, or null if they cancelled. */
export const pickBackupFile = async (): Promise<string | null> => {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  try {
    return await file.text();
  } finally {
    if (file.exists) file.delete(); // remove the cached copy
  }
};

/** Decrypts and validates the backup, then replaces all data on the device. Throws BackupError on failure. */
export const restoreBackup = async (store: DataStore, text: string, passphrase: string, onProgress?: Progress) => {
  const data = await decryptBackup(text, passphrase, onProgress);
  await store.replaceAll(data);
  return data;
};
