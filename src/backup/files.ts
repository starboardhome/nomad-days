/** Expo glue: write/share and pick/read backup files. Encryption itself lives in envelope.ts. */
import { getRandomBytes } from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { localToday, toISO } from '../domain/days';
import type { DataStore } from '../storage/dataStore';
import { BACKUP_EXTENSION, decryptBackup, encryptBackup, type Progress } from './envelope';

const backupFileName = () => `nomad-days-${toISO(localToday())}.${BACKUP_EXTENSION}`;

/** Thrown when the user closes the folder picker without choosing one */
export class SaveCancelled extends Error {
  constructor() {
    super('No folder chosen, so nothing was saved.');
  }
}

const encrypt = async (store: DataStore, passphrase: string, onProgress?: Progress) =>
  encryptBackup(await store.load(), passphrase, getRandomBytes, undefined, onProgress);

/** Encrypts everything and opens the share sheet (save to Files, AirDrop, email to yourself…) */
export const exportBackup = async (store: DataStore, passphrase: string, onProgress?: Progress): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const text = await encrypt(store, passphrase, onProgress);

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

/**
 * Android only: asks for a folder (Downloads, Documents, a USB stick…), then encrypts and writes the backup there.
 * Nothing leaves the device and no other app sees it. Throws SaveCancelled if no folder was chosen.
 */
export const saveBackupToDevice = async (store: DataStore, passphrase: string, onProgress?: Progress): Promise<void> => {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_PICKER_CANCELLED') throw new SaveCancelled();
    throw e;
  }
  const text = await encrypt(store, passphrase, onProgress);
  // octet-stream so the system doesn't add ".json" to the name
  const file = folder.createFile(backupFileName(), 'application/octet-stream');
  file.write(text);
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
