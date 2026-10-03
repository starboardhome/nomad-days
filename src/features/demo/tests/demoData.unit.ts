import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppDataSchema } from '../../../data/schema';
import { toDayNum } from '../../../domain/days';
import { buildDashboard } from '../../dashboard/model';
import { upcomingPlans } from '../../plans/model';
import { demoData } from '../demoData';

const today = toDayNum('2026-10-03');

describe('demo data', () => {
  it('is valid app data that tells the screenshot story', () => {
    const data = AppDataSchema.parse(demoData(today));
    const dash = buildDashboard(data, today);
    const story = {
      here: dash.here,
      cards: dash.cards.map((c) => `${c.name}: ${c.rules.map((r) => r.headline).join(' / ')}`),
      plans: upcomingPlans(data, today).map((p) => `${p.trip.country} ${p.trip.plan}: ${p.verdict.short}`),
    };
    assert.equal(dash.here, 'ES');
    assert.ok(story.plans.some((p) => p.startsWith('PT maybe: ✗')), 'the maybe trip shows a warning');
    assert.ok(story.plans.some((p) => p.startsWith('GB booked: ✓')), 'the booked UK trip fits');
  });
});
