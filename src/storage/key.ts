import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { bytesToHex } from '@noble/hashes/utils.js';

const KEY_NAME = 'nomad-days.db-key.v1';

/**
 * iOS: readable only while the device is unlocked, and never synced to iCloud or
 * copied to another device. Android: stored in the hardware-backed Keystore.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const isValidKey = (key: string): boolean => /^[0-9a-f]{64}$/.test(key);

/** The 256-bit database key. Created on first launch. It never leaves the device's secure storage. */
export const getOrCreateDbKey = async (): Promise<{ key: string; created: boolean }> => {
  const existing = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);
  if (existing && isValidKey(existing)) return { key: existing, created: false };

  const key = bytesToHex(getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, key, OPTIONS);
  return { key, created: true };
};

export const deleteDbKey = (): Promise<void> => SecureStore.deleteItemAsync(KEY_NAME, OPTIONS);
