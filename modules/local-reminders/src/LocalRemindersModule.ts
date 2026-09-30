import { NativeModule, requireNativeModule } from 'expo';
import type { PermissionStatus, Reminder } from './types';

declare class LocalRemindersModule extends NativeModule<{}> {
  getPermissionAsync(): Promise<PermissionStatus>;
  requestPermissionAsync(): Promise<PermissionStatus>;
  replaceAllAsync(reminders: readonly Reminder[]): Promise<number>;
  cancelAllAsync(): Promise<void>;
}

export default requireNativeModule<LocalRemindersModule>('LocalReminders');
