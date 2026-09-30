import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jurisdictions } from '../../rules';
import { applicability } from '../applicability';
import { createCustomJurisdiction } from '../custom';
import { evaluateAll, evaluateJurisdiction } from '../evaluate';
import { bundled, day, ruleOf, stay } from './helpers';

const today = day('2026-09-28');
const aussie = { passports: ['AU'], taxResidence: 'AE' };

describe('applicability', () => {
  const schengen = bundled('schengen');
  const rule90 = ruleOf('schengen', 'schengen-90-180', 'rolling');

  it('applies 90/180 to non-EU passports', () => {
    assert.equal(applicability(rule90, schengen, aussie), 'applies');
  });

  it('exempts anyone holding an EU/EEA/Swiss passport (best passport wins)', () => {
    assert.equal(applicability(rule90, schengen, { passports: ['AU', 'IE'], taxResidence: 'AE' }), 'exempt');
  });

  it('marks Visa Waiver as visaRequired for non-eligible passports', () => {
    const vwp = ruleOf('us', 'us-visa-waiver-90', 'perVisit');
    assert.equal(applicability(vwp, bundled('us'), { passports: ['IN'], taxResidence: 'IN' }), 'visaRequired');
    assert.equal(applicability(vwp, bundled('us'), aussie), 'applies');
  });

  it('skips tax tests for the country you are already tax resident in', () => {
    const srt = ruleOf('uk', 'uk-srt-automatic-183', 'taxYear');
    assert.equal(applicability(srt, bundled('uk'), { passports: ['AU'], taxResidence: 'GB' }), 'exempt');
  });
});

describe('evaluateJurisdiction', () => {
  it('reports the worst level across rules', () => {
    const r = evaluateJurisdiction(bundled('uk'), [stay('GB', '2026-04-06')], aussie, day('2026-10-05'));
    assert.deepEqual(r.results.map((x) => x.status?.level), ['warning', 'over']);
    assert.equal(r.level, 'over');
  });

  it('only evaluates visited jurisdictions by default', () => {
    const r = evaluateAll(jurisdictions, [stay('FR', '2026-09-01')], aussie, today);
    assert.deepEqual(r.map((x) => x.jurisdiction.id), ['schengen']);
  });
});

describe('custom jurisdictions', () => {
  it('builds and evaluates a user-defined rule', () => {
    const thailand = createCustomJurisdiction(
      'TH',
      'Thailand',
      [{ category: 'entry', kind: 'perVisit', label: '60 days visa-exempt', counting: 'anyPartOfDay', limit: { unit: 'days', value: 60 } }],
      '2026-09-28',
    );
    const r = evaluateJurisdiction(thailand, [stay('TH', '2026-09-01')], aussie, today);
    assert.equal(r.results[0].status?.lastSafeDay, '2026-10-30');
  });

  it('rejects invalid custom rules', () => {
    assert.throws(() =>
      createCustomJurisdiction(
        'TH',
        'Thailand',
        [{ category: 'entry', kind: 'rolling', label: 'x', counting: 'anyPartOfDay', maxDays: -1, windowDays: 180 }],
        '2026-09-28',
      ),
    );
  });
});
