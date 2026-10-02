#!/usr/bin/env node
/**
 * `npm audit` for production dependencies, failing on high/critical advisories,
 * except those listed in .audit-allowlist.json with a reason and an expiry date.
 * An expired exception fails too, so every one gets re-checked.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BLOCKING = new Set(['high', 'critical']);
const today = new Date().toISOString().slice(0, 10);
const { exceptions } = JSON.parse(readFileSync(new URL('../../.audit-allowlist.json', import.meta.url), 'utf8'));

let report;
try {
  report = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  report = e.stdout; // npm audit exits non-zero when it finds anything
}
const { vulnerabilities = {} } = JSON.parse(report);

// Direct advisories only (entries in `via` that are objects, not package names)
const advisories = new Map();
for (const v of Object.values(vulnerabilities)) {
  for (const via of v.via) {
    if (typeof via !== 'object') continue;
    const id = via.url?.split('/').pop() ?? String(via.source);
    advisories.set(id, { id, package: via.name, severity: via.severity, title: via.title, url: via.url });
  }
}

const allowed = new Map(exceptions.map((e) => [e.id, e]));
const errors = [];
for (const a of advisories.values()) {
  if (!BLOCKING.has(a.severity)) continue;
  const ex = allowed.get(a.id);
  if (!ex) errors.push(`${a.severity}: ${a.package} – ${a.title} (${a.url})`);
  else if (ex.expires < today) errors.push(`Exception for ${a.id} (${a.package}) expired on ${ex.expires}: re-check it, then fix, extend or remove it`);
  else console.log(`::notice title=Audit exception::${a.id} (${a.package}) allowed until ${ex.expires}: ${ex.reason}`);
}
for (const ex of exceptions) {
  if (!advisories.has(ex.id)) console.log(`::warning title=Stale audit exception::${ex.id} (${ex.package}) is no longer reported: remove it from .audit-allowlist.json`);
}

const counts = [...advisories.values()].reduce((c, a) => ({ ...c, [a.severity]: (c[a.severity] ?? 0) + 1 }), {});
console.log(`Advisories: ${JSON.stringify(counts)}`);
if (errors.length) {
  for (const e of errors) console.log(`::error title=Dependency audit::${e}`);
  process.exit(1);
}
console.log('✔ No unaccepted high or critical advisories');
