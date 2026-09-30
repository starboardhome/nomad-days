import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addMonths, localToday, periodStartOnOrBefore, toDayNum, toISO } from '../days';

describe('days', () => {
  it('round-trips ISO dates', () => {
    ['1970-01-01', '2024-02-29', '2026-09-29'].forEach((iso) => assert.equal(toISO(toDayNum(iso)), iso));
  });

  it('rejects malformed dates', () => {
    assert.throws(() => toDayNum('29/09/2026'));
  });

  it('adds months, clamping to month end', () => {
    assert.equal(toISO(addMonths(toDayNum('2026-01-31'), 1)), '2026-02-28');
    assert.equal(toISO(addMonths(toDayNum('2028-01-31'), 1)), '2028-02-29');
    assert.equal(toISO(addMonths(toDayNum('2026-05-01'), 6)), '2026-11-01');
  });

  it('finds the current UK tax year start', () => {
    assert.equal(toISO(periodStartOnOrBefore(toDayNum('2026-09-29'), '04-06')), '2026-04-06');
    assert.equal(toISO(periodStartOnOrBefore(toDayNum('2026-04-05'), '04-06')), '2025-04-06');
    assert.equal(toISO(periodStartOnOrBefore(toDayNum('2026-04-06'), '04-06')), '2026-04-06');
  });

  it('uses the device calendar date, not UTC', () => {
    assert.equal(toISO(localToday(new Date(2026, 8, 29, 23, 59))), '2026-09-29');
    assert.equal(toISO(localToday(new Date(2026, 8, 29, 0, 1))), '2026-09-29');
  });
});
