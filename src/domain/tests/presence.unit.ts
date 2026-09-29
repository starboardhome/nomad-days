import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { presenceIn, runStart } from '../presence';
import { day, stay } from './helpers';

const FR_DE = new Set(['FR', 'DE']);
const today = day('2026-09-29');

describe('presence', () => {
  it('counts entry and exit days under anyPartOfDay', () => {
    const p = presenceIn([stay('FR', '2026-06-01', '2026-06-10')], FR_DE, 'anyPartOfDay', today);
    assert.equal(p.size, 10);
  });

  it('excludes the exit day under the midnight rule', () => {
    const p = presenceIn([stay('FR', '2026-06-01', '2026-06-10')], FR_DE, 'midnight', today);
    assert.equal(p.size, 9);
  });

  it('counts a same-day transit as zero days under the midnight rule', () => {
    const p = presenceIn([stay('FR', '2026-06-01', '2026-06-01')], FR_DE, 'midnight', today);
    assert.equal(p.size, 0);
  });

  it('merges back-to-back trips across countries in the same zone', () => {
    const p = presenceIn(
      [stay('FR', '2026-06-01', '2026-06-10'), stay('DE', '2026-06-10', '2026-06-20'), stay('GB', '2026-06-21')],
      FR_DE,
      'anyPartOfDay',
      today,
    );
    assert.equal(p.size, 20); // 10 June counted once
  });

  it('counts an open stay up to today and ignores future trips', () => {
    const p = presenceIn([stay('FR', '2026-09-20'), stay('DE', '2026-12-01')], FR_DE, 'anyPartOfDay', today);
    assert.equal(p.size, 10);
  });

  it('finds the start of the current run', () => {
    const p = presenceIn([stay('FR', '2026-09-01', '2026-09-10'), stay('DE', '2026-09-10')], FR_DE, 'anyPartOfDay', today);
    assert.equal(runStart(p, today), day('2026-09-01'));
  });
});
