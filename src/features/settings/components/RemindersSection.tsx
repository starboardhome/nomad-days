import { useMemo } from 'react';
import { Linking, View } from 'react-native';
import { LEAD_DAY_OPTIONS, REMINDER_HOUR_OPTIONS, type ReminderSettings } from '../../../data/schema';
import { useApp } from '../../../state/appStore';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Field } from '../../../ui/Field';
import { formatDate, plural } from '../../../ui/format';
import { SelectChips } from '../../../ui/SelectChips';
import { Muted, Overline } from '../../../ui/Text';
import { ToggleRow } from '../../../ui/ToggleRow';
import { useToday } from '../../../ui/useToday';
import { planReminders } from '../../reminders/plan';
import { useNotificationPermission } from '../../reminders/useNotificationPermission';

const LEADS = LEAD_DAY_OPTIONS.map((d) => ({ value: d, label: plural(d, 'day') }));
const HOURS = REMINDER_HOUR_OPTIONS.map((h) => ({ value: h, label: `${h}:00` }));

const toggleIn = (list: readonly number[], v: number): number[] =>
  list.includes(v) ? (list.length > 1 ? list.filter((x) => x !== v) : [...list]) : [...list, v].sort((a, b) => b - a);

const NextUp = () => {
  const data = useApp((s) => s.data);
  const today = useToday();
  const plan = useMemo(() => planReminders(data, today, Date.now()), [data, today]);
  if (!plan.length) return <Muted>Nothing to remind you about yet. Reminders appear as you get close to a limit.</Muted>;
  const next = plan[0];
  return (
    <Muted>
      {`Next: ${formatDate(next.fireOn)}, ${data.settings.reminders.hour}:00 · ${next.title}`}
      {plan.length > 1 ? ` (+${plan.length - 1} more)` : ''}
    </Muted>
  );
};

export const RemindersSection = () => {
  const settings = useApp((s) => s.data.settings);
  const saveSettings = useApp((s) => s.saveSettings);
  const { status, request } = useNotificationPermission();
  const r = settings.reminders;
  const save = (patch: Partial<ReminderSettings>) => saveSettings({ ...settings, reminders: { ...r, ...patch } });

  const onToggle = async (on: boolean) => {
    if (!on) return save({ enabled: false });
    const granted = status === 'granted' || (await request()) === 'granted';
    await save({ enabled: granted });
  };

  const blocked = status === 'denied';

  return (
    <View className="gap-2">
      <Overline className="px-1">Reminders</Overline>
      <Card className="gap-4">
        <ToggleRow label="Remind me before limits" value={r.enabled && !blocked} onChange={onToggle} />
        {blocked ? (
          <View className="gap-2">
            <Banner tone="warn" title="Notifications are turned off for Nomad Days">
              Turn them on in your phone’s settings to get reminders.
            </Banner>
            <Button label="Open settings" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
        {r.enabled && !blocked ? (
          <>
            <Field label="How far ahead">
              <SelectChips label="How far ahead" options={LEADS} selected={r.leadDays} onToggle={(d) => save({ leadDays: toggleIn(r.leadDays, d) })} />
            </Field>
            <Field label="At">
              <SelectChips label="Reminder time" options={HOURS} selected={[r.hour]} onToggle={(hour) => save({ hour })} />
            </Field>
            <NextUp />
          </>
        ) : null}
        <Muted>Reminders are scheduled on this phone. Nothing is sent over the internet.</Muted>
      </Card>
    </View>
  );
};
