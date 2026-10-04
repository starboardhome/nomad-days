import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toDayNum } from '../../../domain/days';
import { ukTies } from '../../../domain/ukTies';
import { stay } from '../../../domain/tests/helpers';
import { ninetyDayHint, tiesVerdict, unansweredNote } from '../model';

const today = toDayNum('2026-10-04');
const years = ['2025–26', '2024–25'] as const;

describe('UK ties wording', () => {
  it('counts a Yes to the 90-day question without any logged trips', () => {
    const answers = { leaver: true, ninetyDays: true };
    const r = ukTies(answers, [], today);
    assert.deepEqual([r.ties.ninetyDays, r.threshold], [true, 121]);
    assert.equal(ninetyDayHint(answers, r, years), 'Counted as a tie from your answer. You don’t need to log those trips.');
  });

  it('says logging trips is optional, and only mentions logged days when there are some', () => {
    assert.doesNotMatch(ninetyDayHint({}, ukTies({}, [], today), years), /Logged so far/);
    const r = ukTies({}, [stay('GB', '2025-06-01', '2025-06-11')], today);
    assert.match(ninetyDayHint({}, r, years), /You don’t need to log those trips\. Logged so far: 2025–26: 10 days, 2024–25: 0 days\./);
  });

  it('notes when logged trips already make the 90-day tie', () => {
    const r = ukTies({ ninetyDays: false }, [stay('GB', '2025-05-01', '2025-09-01')], today);
    assert.match(ninetyDayHint({ ninetyDays: false }, r, years), /already show more than 90 days .* counts whatever you answer/);
  });

  it('explains why one tie does not lower the limit for an arriver', () => {
    const r = ukTies({ leaver: false, ninetyDays: true }, [], today);
    assert.deepEqual(tiesVerdict(r), {
      heading: 'UK resident from 183 days in a tax year (up to 182 is fine)',
      body: 'You have 1 UK tie (90-day). As an arriver, you need 2 UK ties for a 121-day limit, so the 183-day test still applies.',
    });
  });

  it('confirms when the limit is lowered', () => {
    const v = tiesVerdict(ukTies({ leaver: true, ninetyDays: true }, [], today));
    assert.equal(v.heading, 'UK resident from 121 days in a tax year (up to 120 is fine)');
    assert.match(v.body, /as a leaver\. The Days tab now uses this limit\./);
  });

  it('says other answers wait for the leaver question', () => {
    assert.match(unansweredNote(ukTies({ ninetyDays: true }, [], today)), /saved: 1 UK tie \(90-day\)\. They only count once/);
    assert.equal(unansweredNote(ukTies({}, [], today)), 'Until then, only the 183-day test is checked.');
  });
});
