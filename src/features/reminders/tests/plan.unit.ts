import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyAppData, type AppData } from '../../../data/schema';
import { toDayNum } from '../../../domain/days';
import { atLocalHour, planReminders } from '../plan';

const today = toDayNum('2026-09-28');
const morning = atLocalHour(today, 7); // 07:00 today

const data = (patch: Partial<AppData>): AppData => ({
  ...emptyAppData(),
  profile: { taxResidence: 'AE', passports: ['AU'] },
  settings: { reminders: { enabled: true, leadDays: [14, 7, 1], hour: 9 } },
  ...patch,
});

const inSchengen = data({
  stays: [
    { id: 'a', country: 'FR', entry: '2026-06-01', exit: '2026-07-30' },
    { id: 'b', country: 'IT', entry: '2026-09-20' },
  ],
});

const summary = (plan: ReturnType<typeof planReminders>) => plan.map((r) => `${r.fireOn} ${r.title}`);

describe('reminder planner', () => {
  it('counts down to the last allowed day while you are there', () => {
    // last allowed day is 19 Oct 2026
    assert.deepEqual(summary(planReminders(inSchengen, today, morning)), [
      '2026-10-05 Schengen Area: 14 days to go',
      '2026-10-12 Schengen Area: 7 days to go',
      '2026-10-18 Schengen Area: 1 day to go',
      '2026-10-19 Schengen Area: last allowed day',
    ]);
  });

  it('fires at the chosen local hour', () => {
    const [first] = planReminders(inSchengen, today, morning);
    assert.equal(first.fireAtMs, atLocalHour(toDayNum('2026-10-05'), 9));
    assert.match(first.body, /19 Oct 2026/);
  });

  it('skips reminders whose time has passed', () => {
    const late = { ...inSchengen, settings: { reminders: { enabled: true, leadDays: [23], hour: 9 } } };
    // 23 days before 19 Oct is 26 Sep, already past
    assert.deepEqual(summary(planReminders(late, today, morning)), ['2026-10-19 Schengen Area: last allowed day']);
  });

  it('tells you when you can return after using all your days', () => {
    const used = data({ stays: [{ id: 'x', country: 'ES', entry: '2026-06-01', exit: '2026-08-29' }] });
    assert.deepEqual(summary(planReminders(used, toDayNum('2026-09-10'), atLocalHour(toDayNum('2026-09-10'), 7))), [
      '2026-11-28 Schengen Area: you can return',
    ]);
  });

  it('warns before a tax threshold only if it would be reached before the reset', () => {
    const uk = data({ stays: [{ id: 'g', country: 'GB', entry: '2026-04-06' }] }); // safe until 4 Oct
    const titles = summary(planReminders(uk, today, morning));
    assert.ok(titles.includes('2026-10-03 United Kingdom tax: 1 day to go'), titles.join('\n'));

    const shortStay = data({ stays: [{ id: 'g', country: 'GB', entry: '2027-01-20' }] });
    const noTaxRisk = planReminders(shortStay, toDayNum('2027-02-01'), atLocalHour(toDayNum('2027-02-01'), 7));
    assert.ok(noTaxRisk.every((r) => !r.title.includes('tax')));
  });

  it('plans nothing when reminders are off, before onboarding, or for exempt rules', () => {
    const off = { ...inSchengen, settings: { reminders: { enabled: false, leadDays: [7], hour: 9 } } };
    assert.deepEqual(planReminders(off, today, morning), []);
    assert.deepEqual(planReminders({ ...inSchengen, profile: { taxResidence: null, passports: [] } }, today, morning), []);
    assert.deepEqual(planReminders({ ...inSchengen, profile: { taxResidence: 'AE', passports: ['FR'] } }, today, morning), []);
  });

  it('uses stable ids so rescheduling replaces rather than duplicates', () => {
    const a = planReminders(inSchengen, today, morning).map((r) => r.id);
    const b = planReminders(inSchengen, today, morning).map((r) => r.id);
    assert.deepEqual(a, b);
    assert.equal(new Set(a).size, a.length);
  });
});
