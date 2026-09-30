import { LocalReminders } from '../../../modules/local-reminders';
import type { AppData } from '../../data/schema';
import { localToday } from '../../domain/days';
import { planReminders } from './plan';

/**
 * Makes the OS schedule match the plan exactly: everything is replaced each time,
 * so there's no stale or duplicated reminder to track. Returns how many are scheduled.
 */
export const syncReminders = async (data: AppData, today = localToday(), now = Date.now()): Promise<number> => {
  if (!data.settings.reminders.enabled || (await LocalReminders.getPermissionAsync()) !== 'granted') {
    await LocalReminders.cancelAllAsync();
    return 0;
  }
  const plan = planReminders(data, today, now);
  return LocalReminders.replaceAllAsync(plan.map(({ id, title, body, fireAtMs }) => ({ id, title, body, fireAtMs })));
};
