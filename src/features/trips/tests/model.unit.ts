import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countryLabel, countryName, flagOf, searchCountries } from '../../../data/countries';
import { toDayNum } from '../../../domain/days';
import { memoryStore } from '../../../storage/dataStore';
import { checkDraft, toStayRecord, tripRow, tripToClose } from '../model';

const today = toDayNum('2026-09-28');
const others = [
  { id: 'fr', country: 'FR', entry: '2026-06-01', exit: '2026-06-10' },
  { id: 'it', country: 'IT', entry: '2026-09-20' },
];

describe('trip form checks', () => {
  it('requires a country and ordered dates', () => {
    assert.deepEqual(checkDraft({ id: 'n', entry: '2026-06-10', exit: '2026-06-01' }, [], today).errors, [
      'Choose a country.',
      'The exit date is before the entry date.',
    ]);
  });

  it('rejects future trips', () => {
    assert.equal(checkDraft({ id: 'n', country: 'FR', entry: '2026-10-01' }, [], today).errors.length, 1);
  });

  it('allows one shared travel day but warns about real overlaps', () => {
    const travelDay = checkDraft({ id: 'n', country: 'DE', entry: '2026-06-10', exit: '2026-06-12' }, others, today);
    assert.deepEqual(travelDay.warnings, []);
    const clash = checkDraft({ id: 'n', country: 'DE', entry: '2026-06-05', exit: '2026-06-12' }, others, today);
    assert.equal(clash.warnings.length, 1);
    assert.match(clash.warnings[0], /France/);
  });

  it('closes the previous open trip on the new entry day instead of warning', () => {
    const draft = { id: 'n', country: 'ES', entry: '2026-09-27' };
    assert.deepEqual(checkDraft(draft, others, today).warnings, []);
    assert.deepEqual(tripToClose(draft, others), { ...others[1], exit: '2026-09-27' });
    assert.equal(tripToClose({ ...draft, exit: '2026-09-28' }, others), undefined);
  });

  it('warns when a later trip is also open', () => {
    const w = checkDraft({ id: 'n', country: 'ES', entry: '2026-09-01' }, others, today).warnings;
    assert.ok(w.some((x) => x.includes('still there')));
  });

  it('ignores the trip being edited', () => {
    assert.deepEqual(checkDraft({ ...others[1], exit: undefined }, others, today).warnings, []);
  });

  it('builds a clean record', () => {
    assert.deepEqual(toStayRecord({ id: 'n', country: 'FR', entry: '2026-06-01', note: '  ' }), {
      id: 'n',
      country: 'FR',
      entry: '2026-06-01',
    });
  });

  it('formats list rows', () => {
    assert.deepEqual(tripRow(others[0], today), {
      id: 'fr',
      title: '🇫🇷 France',
      subtitle: '1 Jun – 10 Jun · 10 days',
      ongoing: false,
    });
    assert.equal(tripRow(others[1], today).subtitle, '20 Sep – now · 9 days');
  });
});

describe('countries', () => {
  it('names and flags', () => {
    assert.equal(countryName('GB'), 'United Kingdom');
    assert.equal(flagOf('au'), '🇦🇺');
    assert.equal(countryLabel('JP'), '🇯🇵 Japan');
  });

  it('searches by name (accent-insensitive) or code', () => {
    assert.deepEqual(searchCountries('cote').map((c) => c.code), ['CI']);
    assert.deepEqual(searchCountries('ae').map((c) => c.code).slice(0, 1), ['AE']);
    assert.ok(searchCountries('united').length >= 3);
  });
});

describe('memoryStore', () => {
  it('validates writes and orders stays like SQLite', async () => {
    const store = memoryStore();
    await store.saveStays([{ id: 'a', country: 'FR', entry: '2026-01-01' }]);
    await store.saveStays([{ id: 'b', country: 'IT', entry: '2026-05-01' }]);
    assert.deepEqual((await store.load()).stays.map((s) => s.id), ['b', 'a']);
    await assert.rejects(store.saveStays([{ id: 'c', country: 'fr', entry: '2026-01-01' }]));
  });
});
