import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toDayNum } from '../../../domain/days';
import { evaluateJurisdiction } from '../../../domain/evaluate';
import { resolveJurisdiction } from '../../../rules';
import { memoryStore } from '../../../storage/dataStore';
import {
  activePresets,
  applyPreset,
  checkRuleDraft,
  emptyRuleDraft,
  fromJurisdiction,
  parseCount,
  ruleSummary,
  toJurisdiction,
  type RuleDraft,
} from '../model';

const today = '2026-09-30';
const thai = (patch: Partial<RuleDraft> = {}): RuleDraft => ({ ...applyPreset(emptyRuleDraft('TH'), 'visit60'), ...patch });
const errors = (d: RuleDraft) => checkRuleDraft(d, []).errors;

describe('custom rule form checks', () => {
  it('requires a country and at least one test', () => {
    assert.deepEqual(errors({ ...emptyRuleDraft(), entry: 'none' }), [
      'Choose a country.',
      'Add an entry limit, a tax-days test, or both.',
    ]);
  });

  it('validates the entry limit for the chosen mode', () => {
    assert.equal(errors(thai({ perVisitDays: '' })).length, 1);
    assert.equal(errors(thai({ perVisitDays: '0' })).length, 1);
    assert.deepEqual(errors(thai({ entry: 'rolling', rollingMax: '200', rollingWindow: '180' })), [
      'The days allowed can’t be more than the window.',
    ]);
    // The per-visit field is ignored once another mode is chosen
    assert.deepEqual(errors(thai({ entry: 'none', perVisitDays: '', tax: true })), []);
  });

  it('validates the tax test and source link', () => {
    assert.equal(errors(thai({ tax: true, taxThreshold: '400' })).length, 1);
    assert.equal(errors(thai({ tax: true, taxYearStart: '02-30' })).length, 1);
    assert.equal(errors(thai({ source: 'http://example.com' })).length, 1);
    assert.deepEqual(errors(thai({ source: ' https://www.immigration.go.th/ ' })), []);
  });

  it('warns about replacing saved rules and overlapping bundled ones', () => {
    const saved = [toJurisdiction(thai(), today)];
    assert.equal(checkRuleDraft(thai(), saved).warnings.length, 1);
    assert.deepEqual(checkRuleDraft(thai(), saved, 'custom-th').warnings, []); // editing the same one
    assert.match(checkRuleDraft(thai({ country: 'FR' }), []).warnings[0], /Schengen/);
  });

  it('parses counts strictly', () => {
    assert.deepEqual(['30', '', '0', '-1', '1.5', '12345'].map(parseCount), [30, undefined, undefined, undefined, undefined, undefined]);
  });
});

describe('custom rule presets', () => {
  it('fills fields and reports which presets match', () => {
    const d = applyPreset(applyPreset(emptyRuleDraft('TH'), 'rolling90'), 'tax183');
    assert.deepEqual(activePresets(d), ['rolling90', 'tax183']);
    assert.deepEqual(activePresets(applyPreset(d, 'visit30')), ['visit30', 'tax183']);
  });
});

describe('custom rule draft ⇄ jurisdiction', () => {
  it('builds a valid jurisdiction and loads it back unchanged', () => {
    const draft = thai({ tax: true, taxCounting: 'midnight', taxYearStart: '04-06', source: 'https://example.go.th/visa' });
    const j = toJurisdiction(draft, today);
    assert.equal(j.id, 'custom-th');
    assert.equal(j.name, 'Thailand');
    assert.deepEqual(j.countries, ['TH']);
    assert.equal(ruleSummary(j), 'Up to 60 days per visit · Tax residency after 183 days');
    assert.deepEqual(fromJurisdiction(j), draft);
  });

  it('round-trips rolling rules and a missing source', () => {
    const draft = thai({ entry: 'rolling', perVisitDays: '', rollingMax: '90', rollingWindow: '180' });
    assert.deepEqual(fromJurisdiction(toJurisdiction(draft, today)), draft);
  });

  it('refuses to build an invalid draft', () => {
    assert.throws(() => toJurisdiction(emptyRuleDraft(), today));
  });

  it('is evaluated like any other jurisdiction', () => {
    const j = resolveJurisdiction(toJurisdiction(thai(), today), {});
    const r = evaluateJurisdiction(j, [{ country: 'TH', entry: '2026-09-01' }], { passports: ['AU'], taxResidence: 'AU' }, toDayNum(today));
    assert.equal(r.results[0].status?.lastSafeDay, '2026-10-30');
  });
});

describe('memoryStore custom jurisdictions', () => {
  it('saves, replaces and deletes by id', async () => {
    const store = memoryStore();
    await store.saveCustomJurisdiction(toJurisdiction(thai(), today));
    await store.saveCustomJurisdiction(toJurisdiction(thai({ perVisitDays: '30' }), today));
    const saved = (await store.load()).customJurisdictions;
    assert.deepEqual(saved.map(ruleSummary), ['Up to 30 days per visit']);
    await store.deleteCustomJurisdiction('custom-th');
    assert.deepEqual((await store.load()).customJurisdictions, []);
  });
});
