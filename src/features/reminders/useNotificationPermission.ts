import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { LocalReminders, type PermissionStatus } from '../../../modules/local-reminders';

/** Current notification permission, re-checked when returning from system settings */
export const useNotificationPermission = () => {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const refresh = useCallback(() => {
    LocalReminders.getPermissionAsync().then(setStatus).catch(() => setStatus('denied'));
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const request = async (): Promise<PermissionStatus> => {
    const next = await LocalReminders.requestPermissionAsync();
    setStatus(next);
    return next;
  };
  return { status, request };
};
