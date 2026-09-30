import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useApp } from '../../state/appStore';
import { syncReminders } from './sync';

const sync = () => {
  const { status, data } = useApp.getState();
  if (status !== 'ready') return;
  syncReminders(data).catch((e) => console.warn('Reminder sync failed', e));
};

/** Reschedules whenever data changes and whenever the app comes back to the foreground (a new day) */
export const useReminderSync = () => {
  const data = useApp((s) => s.data);
  const status = useApp((s) => s.status);
  useEffect(sync, [data, status]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, []);
};
