import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluatePerVisit } from '../evaluators/perVisit';
import { consecutiveAllowance, evaluateRolling } from '../evaluators/rolling';
import { evaluateTaxYear } from '../evaluators/taxYear';
import { evaluateWeightedYears } from '../evaluators/weightedYears';
import { presenceIn, type Stay } from '../presence';
import { bundled, day, ruleOf, stay } from './helpers';

const today = day('2026-09-28');

const presence = (jId: string, counting: 'anyPartOfDay' | 'midnight', stays: Stay[], on = today) =>
  presenceIn(stays, bundled(jId).countries, counting, on);

describe('Schengen 90/180 (rolling)', () => {
  const rule = ruleOf('schengen', 'schengen-90-180', 'rolling');

  it('counts days used across member countries and the date to leave', () => {
    const p = presence('schengen', 'anyPartOfDay', [stay('FR', '2026-06-01', '2026-07-30'), stay('IT', '2026-09-20')]);
    const s = evaluateRolling(rule, p, today);
    assert.equal(s.used, 69); // 60 in Jun–Jul + 20–28 Sep
    assert.equal(s.daysLeft, 22); // today included
    assert.equal(s.lastSafeDay, '2026-10-19');
    assert.equal(s.nextEntry, '2026-11-28'); // after using all 90, 1 June drops out of the window
    assert.equal(s.level, 'ok');
  });

  it('blocks entry when all 90 days are used and gives the re-entry date', () => {
    const p = presence('schengen', 'anyPartOfDay', [stay('ES', '2026-06-01', '2026-08-29')], day('2026-08-30'));
    const s = evaluateRolling(rule, p, day('2026-08-30'));
    assert.equal(s.used, 90);
    assert.equal(s.daysLeft, 0);
    assert.equal(s.level, 'blocked');
    assert.equal(s.nextEntry, '2026-11-28');
  });

  it('flags an overstay', () => {
    const p = presence('schengen', 'anyPartOfDay', [stay('DE', '2026-06-01')], day('2026-09-05'));
    assert.equal(evaluateRolling(rule, p, day('2026-09-05')).level, 'over');
  });

  it('ignores days outside the zone (UK, Cyprus, Ireland)', () => {
    const p = presence('schengen', 'anyPartOfDay', [stay('GB', '2026-06-01', '2026-08-01'), stay('CY', '2026-08-02', '2026-09-01')]);
    assert.equal(evaluateRolling(rule, p, today).used, 0);
  });

  it('lets days roll off so a long stay can continue', () => {
    // 30 days in April; arriving 1 Sept: the April days drop out as you go
    const p = presence('schengen', 'anyPartOfDay', [stay('PT', '2026-04-01', '2026-04-30')], day('2026-09-01'));
    assert.equal(consecutiveAllowance(p, rule, day('2026-09-01')), 90);
  });
});

describe('UK visitor (perVisit, months)', () => {
  const rule = ruleOf('uk', 'uk-visitor-6-months', 'perVisit');

  it('counts from the start of the current visit', () => {
    const p = presence('uk', 'anyPartOfDay', [stay('GB', '2026-05-01')]);
    const s = evaluatePerVisit(rule, p, today);
    assert.equal(s.lastSafeDay, '2026-10-31');
    assert.equal(s.daysLeft, 34);
    assert.equal(s.used, 151);
  });

  it('shows the full allowance when not in the UK', () => {
    const s = evaluatePerVisit(rule, new Set(), today);
    assert.equal(s.present, false);
    assert.equal(s.lastSafeDay, '2027-03-27');
  });
});

describe('US Visa Waiver (perVisit, days)', () => {
  it('allows 90 days including the entry day', () => {
    const rule = ruleOf('us', 'us-visa-waiver-90', 'perVisit');
    const p = presence('us', 'anyPartOfDay', [stay('US', '2026-09-01')]);
    const s = evaluatePerVisit(rule, p, today);
    assert.equal(s.lastSafeDay, '2026-11-29');
    assert.equal(s.daysLeft, 63);
  });
});

describe('UK Statutory Residence Test (taxYear, midnight)', () => {
  const rule = ruleOf('uk', 'uk-srt-automatic-183', 'taxYear');

  it('counts midnights in the tax year from 6 April', () => {
    const p = presence('uk', 'midnight', [stay('GB', '2025-12-01', '2026-01-10'), stay('GB', '2026-04-06', '2026-08-01')]);
    const s = evaluateTaxYear(rule, p, today);
    assert.equal(s.used, 117); // 6 Apr–31 Jul; last tax year's days don't count
    assert.equal(s.daysLeft, 65); // stay at most 182 days
    assert.equal(s.lastSafeDay, '2026-12-01');
    assert.equal(s.resetsOn, '2027-04-06');
  });

  it('flags residency once 183 days are reached', () => {
    const on = (iso: string) =>
      evaluateTaxYear(rule, presence('uk', 'midnight', [stay('GB', '2026-04-06')], day(iso)), day(iso));
    assert.equal(on('2026-10-05').level, 'over'); // 183rd midnight
    const dayBefore = on('2026-10-04');
    assert.equal(dayBefore.daysLeft, 1);
    assert.equal(dayBefore.level, 'warning');
  });
});

describe('US substantial presence test (weightedYears)', () => {
  const rule = ruleOf('us', 'us-substantial-presence', 'weightedYears');
  const with120DaysIn2024And2025 = [stay('US', '2024-01-01', '2024-04-29'), stay('US', '2025-01-01', '2025-04-30')];

  it('applies the ⅓ and ⅙ weights to previous years', () => {
    // carried = 120/3 + 120/6 = 60 → resident at 123 days this year → 122 safe
    const p = presence('us', 'anyPartOfDay', [...with120DaysIn2024And2025, stay('US', '2026-01-01', '2026-04-10')]);
    const s = evaluateWeightedYears(rule, p, today);
    assert.equal(s.used, 160);
    assert.equal(s.daysLeft, 22);
    assert.equal(s.resetsOn, '2027-01-01');
  });

  it('caps the days left at year end', () => {
    const p = presence('us', 'anyPartOfDay', with120DaysIn2024And2025);
    assert.equal(evaluateWeightedYears(rule, p, today).daysLeft, 95); // 28 Sep → 31 Dec
  });

  it('needs at least 31 days in the current year', () => {
    const p = presence('us', 'anyPartOfDay', [stay('US', '2024-01-01', '2024-12-31'), stay('US', '2025-01-01', '2025-12-31')]);
    const s = evaluateWeightedYears(rule, p, day('2026-01-01'));
    assert.equal(s.daysLeft, 30);
  });

  it('handles fractional carried days without float errors', () => {
    // 120/3 + 121/6 = 60.17 → need ceil(122.83) = 123 → 122 safe
    const p = presence('us', 'anyPartOfDay', [stay('US', '2024-01-01', '2024-04-29'), stay('US', '2025-01-01', '2025-05-01')]);
    assert.equal(evaluateWeightedYears(rule, p, day('2026-01-01')).daysLeft, 122);
  });
});
