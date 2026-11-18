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

describe('passport-specific limits (New Zealand visa waiver)', () => {
  const nz = bundled('new-zealand');
  // Arrived 1 Sep: day 28 of the visit on 28 Sep
  const entryRule = (passports: string[]) =>
    evaluateJurisdiction(nz, [stay('NZ', '2026-09-01')], { passports, taxResidence: 'AE' }, today).results.find(
      (r) => r.rule.category === 'entry',
    )!;

  it('gives most visa waiver passports 3 months', () => {
    const r = entryRule(['US']);
    assert.equal(r.rule.label, 'Visa waiver (NZeTA): up to 3 months per visit');
    assert.equal(r.status!.lastSafeDay, '2026-11-30');
  });

  it('gives British citizens 6 months, also when they hold another passport', () => {
    for (const passports of [['GB'], ['US', 'GB']]) {
      const r = entryRule(passports);
      assert.equal(r.rule.label, 'Visa waiver (NZeTA): up to 6 months per visit for British citizens');
      assert.equal(r.status!.lastSafeDay, '2027-02-28');
    }
  });

  it('still exempts Australians', () => {
    assert.equal(entryRule(['AU', 'GB']).applicability, 'exempt');
  });
});

describe('visitor limits by passport (Singapore, Panama)', () => {
  const visit = (jId: string, country: string, passports: string[]) =>
    evaluateJurisdiction(bundled(jId), [stay(country, '2026-09-01')], { passports, taxResidence: 'AE' }, today).results.find(
      (r) => r.rule.category === 'entry',
    )!;

  it('Singapore: 90 days for listed passports, 30 for others', () => {
    assert.equal(visit('singapore', 'SG', ['GB']).status!.limit, 90);
    assert.equal(visit('singapore', 'SG', ['FR']).status!.limit, 90);
    assert.equal(visit('singapore', 'SG', ['IN']).status!.limit, 30);
  });

  it('Panama: 180 days for US and Canadian citizens, 90 for others', () => {
    assert.equal(visit('panama', 'PA', ['CA']).status!.limit, 180);
    assert.equal(visit('panama', 'PA', ['GB']).status!.limit, 90);
  });
});

describe('where you live', () => {
  it('skips visitor limits as well as tax tests in your country of tax residence', () => {
    const uae = bundled('uae');
    const resident = { passports: ['AU'], taxResidence: 'AE' };
    for (const rule of uae.rules) assert.equal(applicability(rule, uae, resident), 'exempt');
    const visitor = { passports: ['AU'], taxResidence: 'GB' };
    assert.equal(applicability(uae.rules[0], uae, visitor), 'applies');
  });
});
