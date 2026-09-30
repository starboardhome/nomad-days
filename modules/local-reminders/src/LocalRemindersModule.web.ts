import type { PermissionStatus, Reminder } from './types';

/** Web preview: notifications aren't scheduled, but the UI still works */
export default {
  getPermissionAsync: async (): Promise<PermissionStatus> => 'undetermined',
  requestPermissionAsync: async (): Promise<PermissionStatus> => 'granted',
  replaceAllAsync: async (reminders: readonly Reminder[]): Promise<number> => reminders.length,
  cancelAllAsync: async (): Promise<void> => {},
};
