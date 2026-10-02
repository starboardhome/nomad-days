import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jurisdictions } from '../../rules';
import { createCustomJurisdiction } from '../custom';
import { actualStays, awaitingConfirmation, checkPlannedTrip, scenarioFor, upcomingTrips, type PlannedTrip, type TripLike } from '../plan';
import { day } from './helpers';

const today = day('2026-10-02');
const aussie = { passports: ['AU'], taxResidence: 'AE' };
const trip = (id: string, country: string, entry: string, exit?: string, plan?: 'booked' | 'maybe'): TripLike => ({
  id,
  country,
  entry,
  exit,
  plan,
});
const planned = (id: string, country: string, entry: string, exit: string, plan: 'booked' | 'maybe' = 'maybe') =>
  trip(id, country, entry, exit, plan) as PlannedTrip;
const check = (t: PlannedTrip, stays: readonly TripLike[], profile = aussie) =>
  checkPlannedTrip(t, stays, jurisdictions, profile, today);

// 80 days in France (14 Jul – 1 Oct), so 10 Schengen days are left in the window
const summer = trip('fr', 'FR', '2026-07-14', '2026-10-01');

describe('planned trip checks', () => {
  it('fits, with days to spare', () => {
    const r = check(planned('es', 'ES', '2026-10-10', '2026-10-14'), [summer]);
    assert.deepEqual(r.issues, []);
    assert.equal(r.covered, true);
    assert.deepEqual(r.spare, { days: 5, jurisdiction: 'Schengen Area' }); // 5 + 5 more = 90
  });

  it('reports the first day a trip would break a rule', () => {
    const r = check(planned('es', 'ES', '2026-10-10', '2026-10-25'), [summer]);
    assert.deepEqual(r.issues, [
      { ruleId: 'schengen-90-180', jurisdiction: 'Schengen Area', rule: '90 days in any 180-day period', category: 'entry', on: '2026-10-20' },
    ]);
    assert.equal(r.spare, undefined);
  });

  it('counts booked trips toward later trips, but not maybe trips', () => {
    const later = planned('it', 'IT', '2026-11-01', '2026-11-03', 'maybe');
    const booked = planned('es', 'ES', '2026-10-10', '2026-10-17', 'booked'); // uses 8 of the 10 left
    const maybe = planned('pt', 'PT', '2026-10-20', '2026-10-27', 'maybe');
    assert.equal(check(later, [summer, booked]).issues.length, 1);
    assert.deepEqual(check(later, [summer, maybe]).issues, []);
  });

  it('assumes you stay where you are until your next planned trip', () => {
    const inFrance = trip('fr', 'FR', '2026-09-01'); // still there: 32 days so far
    const scenario = scenarioFor(planned('es', 'ES', '2026-12-01', '2026-12-05'), [inFrance], today);
    assert.equal(scenario.find((s) => s.country === 'FR')?.exit, '2026-12-01');
    // ...which uses up the allowance before the trip even starts
    assert.equal(check(planned('es', 'ES', '2026-12-01', '2026-12-05'), [inFrance]).issues[0].on, '2026-12-01');
  });

  it('flags countries your passports need a visa for, and uncovered countries', () => {
    const r = check(planned('us', 'US', '2026-11-01', '2026-11-10'), [], { passports: ['IN'], taxResidence: 'IN' });
    assert.deepEqual(r.visaNeeded, ['United States']);
    const nowhere = check(planned('th', 'TH', '2026-11-01', '2026-11-10'), []);
    assert.deepEqual([nowhere.covered, nowhere.issues, nowhere.spare], [false, [], undefined]);
  });

  it('checks your own rules and tax tests too', () => {
    const thailand = createCustomJurisdiction(
      'TH',
      'Thailand',
      [{ category: 'entry', kind: 'perVisit', label: '30 days', counting: 'anyPartOfDay', limit: { unit: 'days', value: 30 } }],
      '2026-10-02',
    );
    const th = planned('th', 'TH', '2026-11-01', '2026-12-10');
    assert.equal(checkPlannedTrip(th, [], [thailand], aussie, today).issues[0].on, '2026-12-01');

    // 183 UK midnights in the tax year from 6 Apr 2027
    const uk = check(planned('uk', 'GB', '2027-04-06', '2027-10-31', 'booked'), []);
    assert.deepEqual(uk.issues.map((i) => [i.category, i.on]), [
      ['entry', '2027-10-06'], // 6 months per visit: last allowed day is 5 Oct
      ['tax', '2027-10-05'], //   183rd night in the UK (6 Apr is night 1)
    ]);
  });
});

describe('planned trip lists', () => {
  const stays = [summer, planned('a', 'ES', '2026-09-30', '2026-10-05'), planned('b', 'IT', '2026-12-01', '2026-12-02'), planned('c', 'PT', '2026-11-01', '2026-11-02')];

  it('separates real trips, trips to confirm and upcoming ones', () => {
    assert.deepEqual(actualStays(stays).map((s) => s.id), ['fr']);
    assert.deepEqual(awaitingConfirmation(stays, today).map((s) => s.id), ['a']);
    assert.deepEqual(upcomingTrips(stays, today).map((s) => s.id), ['c', 'b']);
  });
});
