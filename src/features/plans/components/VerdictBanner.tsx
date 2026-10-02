import { Banner } from '../../../ui/Banner';
import type { Verdict } from '../model';

const TONE = { ok: 'info', unknown: 'info', warn: 'warn', danger: 'danger' } as const;

export const VerdictBanner = ({ verdict }: { verdict: Verdict }) => (
  <Banner tone={TONE[verdict.tone]} title={verdict.tone === 'ok' ? `✓ ${verdict.title}` : verdict.title}>
    {verdict.details.length ? verdict.details.join('\n') : undefined}
  </Banner>
);
