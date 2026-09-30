import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyAppData, type AppData } from '../../../data/schema';
import { toDayNum } from '../../../domain/days';
import { applyPreset, emptyRuleDraft, toJurisdiction } from '../../rules/model';
import { buildDashboard, ruleLine } from '../model';

const today = toDayNum('2026-09-28');

const withData = (patch: Partial<AppData>): AppData => ({ ...emptyAppData(), ...patch });

const aussieInEurope = withData({
  profile: { taxResidence: 'AE', passports: ['AU'] },
  stays: [
    { id: 'a', country: 'FR', entry: '2026-06-01', exit: '2026-07-30' },
    { id: 'b', country: 'IT', entry: '2026-09-20' },
    { id: 'c', country: 'TH', entry: '2026-08-01', exit: '2026-08-20' },
    { id: 'd', country: 'AE', entry: '2026-08-21', exit: '2026-09-19' },
  ],
});

describe('dashboard model', () => {
  it('covers a country once the user adds their own rules', () => {
    const thailand = toJurisdiction(applyPreset(emptyRuleDraft('TH'), 'visit60'), '2026-09-28');
    const dash = buildDashboard({ ...aussieInEurope, customJurisdictions: [thailand] }, today);
    assert.deepEqual(dash.uncovered, []);
    const card = dash.cards.find((c) => c.id === 'custom-th');
    assert.equal(card?.ownRulesFor, 'TH');
    assert.equal(dash.cards.find((c) => c.id === 'schengen')?.ownRulesFor, undefined);
  });

  it('shows nothing until onboarding is complete', () => {
    assert.deepEqual(buildDashboard(emptyAppData(), today), { cards: [], uncovered: [] });
  });

  it('builds a Schengen card with plain-English lines', () => {
    const dash = buildDashboard(aussieInEurope, today);
    assert.equal(dash.here, 'IT');
    const [schengen] = dash.cards;
    assert.equal(schengen.name, 'Schengen Area');
    assert.equal(schengen.present, true);
    const line = schengen.rules[0];
    assert.equal(line.headline, '22 days left');
    assert.deepEqual(line.details, [
      'Used 69 of 90 days in the last 180',
      'Leave by 19 Oct 2026',
      'Then back from 28 Nov 2026',
    ]);
  });

  it('lists visited countries with no rules, excluding the tax residence', () => {
    assert.deepEqual(buildDashboard(aussieInEurope, today).uncovered, ['TH']);
  });

  it('puts the jurisdiction you are in first, then the most urgent', () => {
    const data = withData({
      profile: { taxResidence: 'AE', passports: ['AU'] },
      stays: [
        { id: 'u', country: 'US', entry: '2026-07-01', exit: '2026-09-10' },
        { id: 'g', country: 'GB', entry: '2026-09-15' },
      ],
    });
    assert.deepEqual(buildDashboard(data, today).cards.map((c) => c.id), ['uk', 'us']);
  });

  it('explains rules that do not apply', () => {
    const data = withData({ profile: { taxResidence: 'GB', passports: ['IE'] }, stays: [{ id: 'g', country: 'GB', entry: '2026-09-01' }] });
    const uk = buildDashboard(data, today).cards[0];
    assert.deepEqual(uk.rules.map((r) => [r.level, r.headline]), [
      ['na', 'Doesn’t apply to you'],
      ['na', 'Doesn’t apply to you'],
    ]);
  });

  it('describes tax tests', () => {
    const data = withData({ profile: { taxResidence: 'AE', passports: ['AU'] }, stays: [{ id: 'g', country: 'GB', entry: '2026-04-06', exit: '2026-08-01' }] });
    const tax = buildDashboard(data, today).cards[0].rules.find((r) => r.category === 'tax')!;
    assert.equal(tax.headline, '65 days before tax residency');
    assert.deepEqual(tax.details, ['117 of 183 days this tax year', 'Safe until 1 Dec 2026 if you arrive today', 'Count resets 6 Apr 2027']);
  });

  it('describes what is available when you are not there', () => {
    const data = withData({ profile: { taxResidence: 'AE', passports: ['AU'] }, stays: [{ id: 'g', country: 'GB', entry: '2026-04-06', exit: '2026-08-01' }] });
    const visitor = buildDashboard(data, today).cards[0].rules[0];
    assert.equal(visitor.headline, '181 days available');
    assert.deepEqual(visitor.details, ['Arrive today → stay until 27 Mar 2027']);
  });

  it('flags an overstay', () => {
    const data = withData({ profile: { taxResidence: 'AE', passports: ['AU'] }, stays: [{ id: 'x', country: 'DE', entry: '2026-06-01' }] });
    const line = buildDashboard(data, today).cards[0].rules[0];
    assert.equal(line.level, 'over');
    assert.equal(line.headline, 'Overstayed');
  });

  it('handles visa-required passports', () => {
    const data = withData({ profile: { taxResidence: 'IN', passports: ['IN'] }, stays: [{ id: 'u', country: 'US', entry: '2026-09-01' }] });
    const vwp = buildDashboard(data, today).cards[0].rules[0];
    assert.equal(vwp.headline, 'Visa needed: your passports aren’t eligible');
    assert.equal(typeof ruleLine, 'function');
  });
});
