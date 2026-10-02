import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyAppData, type AppData } from '../../../data/schema';
import { toDayNum } from '../../../domain/days';
import { applyPreset, emptyRuleDraft, toJurisdiction } from '../../rules/model';
import { buildDashboard, ruleLine } from '../model';

const today = toDayNum('2026-09-28');
const day = toDayNum;

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

describe('dashboard: planned trips under tax tests', () => {
  // A British/Irish passport (UK visitor rule N/A) but UAE tax resident, so the UK tax test applies
  const uk = withData({
    profile: { taxResidence: 'AE', passports: ['IE'] },
    stays: [
      { id: 'sep', country: 'GB', entry: '2026-09-01', exit: '2026-09-19' }, // 18 nights this tax year
      { id: 'nov', country: 'GB', entry: '2026-11-10', exit: '2026-11-20', plan: 'booked' }, // 10 more
      { id: 'may', country: 'GB', entry: '2027-05-01', exit: '2027-05-11', plan: 'maybe' }, // next tax year
    ],
  });
  const taxLine = (d: AppData) => buildDashboard(d, day('2026-10-02')).cards.find((c) => c.id === 'uk')!.rules[1];

  it('adds what each upcoming trip would leave', () => {
    const line = taxLine(uk);
    assert.equal(line.headline, '164 days before tax residency');
    assert.deepEqual(line.plans, [
      { tone: 'ok', text: 'With your booked trip (10 Nov – 20 Nov): 154 days before tax residency (28 of 183 this tax year)' },
      {
        tone: 'ok',
        text: 'With your maybe trip (1 May 2027 – 11 May 2027): 172 days before tax residency (10 of 183 in the tax year to 5 Apr 2028)',
      },
    ]);
  });

  it('says when a trip would make you tax resident', () => {
    // 18 nights + 165 from 10 Oct = 183rd night on 23 Mar
    const long = withData({ ...uk, stays: [uk.stays[0], { id: 'w', country: 'GB', entry: '2026-10-10', exit: '2027-04-05', plan: 'booked' }] });
    assert.deepEqual(taxLine(long).plans, [
      { tone: 'danger', text: 'With your booked trip (10 Oct – 5 Apr 2027): tax resident from 23 Mar 2027' },
    ]);
  });

  it('uses your UK ties: a leaver with 3 ties is resident after 46 days', () => {
    const tied = withData({ ...uk, settings: { ...uk.settings, ukTies: { leaver: true, family: true, accommodation: true } } });
    const line = taxLine(tied);
    // Family + accommodation, plus the country tie: the UK is where they've spent most midnights this tax year
    assert.equal(line.label, 'Statutory Residence Test: 46 days with your UK ties');
    assert.match(line.notes[0], /3 UK ties \(family, accommodation, country\)/);
    assert.equal(line.headline, '27 days before tax residency'); // 45 - 18
    assert.equal(line.plans[0].text, 'With your booked trip (10 Nov – 20 Nov): 17 days before tax residency (28 of 46 this tax year)');
  });

  it("doesn't blame a trip for a tax threshold you've already reached", () => {
    const resident = withData({ ...uk, settings: { ...uk.settings, ukTies: { leaver: true, family: true, accommodation: true, work: true } } });
    const line = taxLine(resident); // 5 ties: resident from 16 days, and there have been 18
    assert.equal(line.headline, 'Tax residency threshold reached');
    assert.deepEqual(line.plans.filter((p) => p.text.includes('10 Nov')), []);
  });

  it('shows a country you only plan to visit', () => {
    const plannedOnly = withData({ ...uk, stays: [uk.stays[1]] });
    assert.ok(buildDashboard(plannedOnly, day('2026-10-02')).cards.some((c) => c.id === 'uk'));
  });
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

  it('shows your own rules even for countries you have no trips in yet', () => {
    const own = (c: string) => toJurisdiction(applyPreset(emptyRuleDraft(c), 'visit30'), '2026-09-28');
    const dash = buildDashboard({ ...aussieInEurope, customJurisdictions: [own('TH'), own('VN')] }, today);
    const vietnam = dash.cards.find((c) => c.id === 'custom-vn');
    assert.ok(dash.cards.find((c) => c.id === 'custom-th'));
    assert.equal(vietnam?.present, false);
    assert.equal(vietnam?.rules[0].headline, '30 days available');
    // Bundled rules still only show where you've been (no US card)
    assert.equal(dash.cards.some((c) => c.id === 'us'), false);
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
