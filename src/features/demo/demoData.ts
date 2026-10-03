/**
 * A believable traveller for store screenshots and the web preview (never loaded in release builds):
 * an Australian passport holder, tax resident in the UAE, who has lived in the UK before and now
 * moves between Europe, the UK and Thailand. Dates are relative to `today`, so it never looks stale.
 */
import { defaultSettings, type AppData, type StayRecord } from '../../data/schema';
import { toISO, type DayNum } from '../../domain/days';
import { applyPreset, emptyRuleDraft, toJurisdiction } from '../rules/model';

export const DEMO_IDS = { maybeTrip: 'demo-maybe-pt' } as const;

export const demoData = (today: DayNum): AppData => {
  const d = (n: number) => toISO(today + n);
  const stays: StayRecord[] = [
    // Real trips
    { id: 'demo-uk', country: 'GB', entry: d(-150), exit: d(-120), note: 'London, work' },
    { id: 'demo-fr', country: 'FR', entry: d(-110), exit: d(-80) },
    { id: 'demo-ae', country: 'AE', entry: d(-80), exit: d(-40) },
    { id: 'demo-th', country: 'TH', entry: d(-40), exit: d(-12), note: 'Chiang Mai' },
    { id: 'demo-es', country: 'ES', entry: d(-12), note: 'Valencia' }, // here now
    // Plans
    { id: 'demo-booked-uk', country: 'GB', entry: d(20), exit: d(34), plan: 'booked' },
    { id: DEMO_IDS.maybeTrip, country: 'PT', entry: d(40), exit: d(90), plan: 'maybe' },
    { id: 'demo-booked-th', country: 'TH', entry: d(100), exit: d(130), plan: 'booked' },
  ];
  return {
    schemaVersion: 1,
    profile: { taxResidence: 'AE', passports: ['AU'] },
    stays,
    customJurisdictions: [toJurisdiction(applyPreset(emptyRuleDraft('TH'), 'visit60'), toISO(today))],
    settings: {
      ...defaultSettings(),
      reminders: { enabled: true, leadDays: [14, 7, 1], hour: 9 },
      ukTies: { leaver: true, family: false, accommodation: true, work: false, ninetyDays: false },
    },
  };
};
