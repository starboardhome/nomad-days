import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { priorUkDays, residenceThreshold, tiesNeeded, ukIsTopCountry, ukTies } from '../ukTies';
import { day, stay } from './helpers';

const today = day('2026-10-02'); // tax year 2026-27 (from 6 Apr 2026)

describe('UK sufficient ties table', () => {
  it('needs fewer ties the more days you spend, and fewer as a leaver', () => {
    // [days, leaver, arriver]
    const table: [number, number | undefined, number | undefined][] = [
      [15, undefined, undefined],
      [16, 4, undefined],
      [45, 4, undefined],
      [46, 3, 4],
      [90, 3, 4],
      [91, 2, 3],
      [120, 2, 3],
      [121, 1, 2],
      [182, 1, 2],
      [183, 0, 0],
    ];
    for (const [days, leaver, arriver] of table) {
      assert.equal(tiesNeeded(days, true), leaver, `leaver ${days}`);
      assert.equal(tiesNeeded(days, false), arriver, `arriver ${days}`);
    }
  });

  it('turns a number of ties into the days that would make you resident', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5].map((t) => residenceThreshold(t, true)), [183, 121, 91, 46, 16, 16]);
    assert.deepEqual([0, 1, 2, 3, 4].map((t) => residenceThreshold(t, false)), [183, 183, 121, 91, 46]);
  });
});

describe('UK ties from your trips', () => {
  it('counts UK midnights in the two previous tax years (90-day tie)', () => {
    const stays = [stay('GB', '2025-06-01', '2025-09-10'), stay('GB', '2024-12-01', '2024-12-11')];
    assert.deepEqual(priorUkDays(stays, today), [101, 10]); // 2025-26: 1 Jun–9 Sep nights; 2024-25: 10 nights
    assert.equal(ukTies({ leaver: false }, stays, today).ties.ninetyDays, true);
  });

  it('gives the country tie when the UK is top for midnights this tax year (leavers only)', () => {
    const stays = [stay('GB', '2026-04-10', '2026-06-10'), stay('FR', '2026-06-10', '2026-07-01'), stay('ES', '2026-07-01', '2026-08-01')];
    assert.equal(ukIsTopCountry(stays, today), true);
    assert.equal(ukTies({ leaver: true }, stays, today).ties.country, true);
    assert.equal(ukTies({ leaver: false }, stays, today).ties.country, false);
    assert.equal(ukIsTopCountry([...stays, stay('PT', '2026-08-01', '2026-10-01')], today), true); // 61 each: joint top counts
    assert.equal(ukIsTopCountry([...stays, stay('PT', '2026-08-01')], today), false); // still there: 62 > 61
  });

  it('combines your answers with the ties from trips', () => {
    const r = ukTies({ leaver: true, family: true, accommodation: true }, [], today);
    assert.deepEqual([r.answered, r.count, r.threshold], [true, 2, 91]);
    assert.equal(ukTies({}, [], today).answered, false);
  });
});
