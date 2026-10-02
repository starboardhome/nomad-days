import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyAppData, type AppData, type StayRecord } from '../../../data/schema';
import { toDayNum } from '../../../domain/days';
import { checkDraft, confirmPlanned, tripRow, tripToClose } from '../../trips/model';
import { plansToConfirm, upcomingPlans, verdictFor } from '../model';

const today = toDayNum('2026-10-02');
const summer: StayRecord = { id: 'fr', country: 'FR', entry: '2026-07-14', exit: '2026-10-01' }; // 80 Schengen days
const data = (stays: StayRecord[]): AppData => ({ ...emptyAppData(), profile: { taxResidence: 'AE', passports: ['AU'] }, stays });

describe('planned trips in the trip form', () => {
  it('needs Booked or Maybe for future dates, and an end date when planned', () => {
    const future = { id: 'n', country: 'ES', entry: '2026-11-01' };
    assert.match(checkDraft(future, [], today).errors[0], /Booked or Maybe/);
    assert.deepEqual(checkDraft({ ...future, plan: 'maybe' }, [], today).errors, ['Add the date you plan to leave.']);
    assert.deepEqual(checkDraft({ ...future, exit: '2026-11-05', plan: 'booked' }, [], today).errors, []);
  });

  it('only compares overlaps between trips of the same kind', () => {
    const booked: StayRecord = { id: 'b', country: 'IT', entry: '2026-11-01', exit: '2026-11-10', plan: 'booked' };
    const draft = { id: 'n', country: 'ES', entry: '2026-11-03', exit: '2026-11-08' };
    assert.equal(checkDraft({ ...draft, plan: 'booked' }, [booked], today).warnings.length, 1);
    assert.deepEqual(checkDraft({ ...draft, plan: 'maybe' }, [booked], today).warnings, []); // alternatives
  });

  it("doesn't close your current trip for a plan", () => {
    const here: StayRecord = { id: 'here', country: 'TH', entry: '2026-09-01' };
    assert.equal(tripToClose({ id: 'n', country: 'VN', entry: '2026-11-01', exit: '2026-11-05', plan: 'booked' }, [here]), undefined);
  });

  it('confirming makes the trip real and ends the one you were on', () => {
    const here: StayRecord = { id: 'here', country: 'TH', entry: '2026-09-01' };
    const plan: StayRecord = { id: 'p', country: 'VN', entry: '2026-10-01', exit: '2026-10-09', plan: 'booked' };
    assert.deepEqual(confirmPlanned(plan, [here, plan]), [
      { ...here, exit: '2026-10-01' },
      { id: 'p', country: 'VN', entry: '2026-10-01', exit: '2026-10-09' },
    ]);
  });

  it('labels planned rows', () => {
    const plan: StayRecord = { id: 'p', country: 'VN', entry: '2026-11-01', exit: '2026-11-05', plan: 'maybe' };
    assert.equal(tripRow(plan, today).subtitle, 'Maybe · 1 Nov – 5 Nov · 5 days');
    assert.equal(tripRow(plan, today).ongoing, false);
  });
});

describe('planned trip verdicts', () => {
  it('summarises fits, breaches, visas and uncovered countries', () => {
    const d = data([
      summer,
      { id: 'ok', country: 'ES', entry: '2026-10-10', exit: '2026-10-14', plan: 'maybe' },
      { id: 'over', country: 'IT', entry: '2026-10-10', exit: '2026-10-25', plan: 'maybe' },
      { id: 'th', country: 'TH', entry: '2026-12-01', exit: '2026-12-10', plan: 'booked' },
    ]);
    const byId = Object.fromEntries(upcomingPlans(d, today).map((p) => [p.trip.id, p.verdict]));
    assert.equal(byId.ok.short, '✓ Fits · 5 days to spare');
    assert.equal(byId.over.short, '✗ Over the limit from 20 Oct 2026');
    assert.match(byId.over.details[0], /Schengen Area limit from 20 Oct 2026/);
    assert.equal(byId.th.tone, 'unknown');

    const visa = verdictFor({ covered: true, issues: [], visaNeeded: ['United States'] }, 'US');
    assert.deepEqual([visa.tone, visa.short], ['warn', 'Visa needed']);
  });

  it('asks to confirm planned trips once they start', () => {
    const d = data([summer, { id: 'p', country: 'ES', entry: '2026-10-02', exit: '2026-10-05', plan: 'booked' }]);
    assert.deepEqual(plansToConfirm(d, today).map((s) => s.id), ['p']);
    assert.deepEqual(upcomingPlans(d, today), []);
  });
});
