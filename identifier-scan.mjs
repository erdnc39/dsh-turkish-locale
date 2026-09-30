// Heuristic: flag values that look like code identifiers in the English source
// (file names, flags, locale codes, mime types, css-ish) but whose Turkish
// value differs — those are candidates for accidental "translation of code".
// Usage: node identifier-scan.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const enDir = join(root, 'i18n-work', 'en');
const trDir = join(root, 'i18n-work', 'tr');

const codeLike = (s) => {
  if (!/^[A-Za-z0-9_./:@+-]+$/.test(s)) return false;
  // Must contain a signal of "not prose": dot-suffix, slash, underscore,
  // version-ish, camelCase, or all-lowercase single token with no spaces.
  return /[./:_]/.test(s) || /^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(s) || /^\d/.test(s);
};

const flagged = [];
for (const f of readdirSync(trDir)) {
  const m = /^batch-(\d+[a-z]?)\.json$/.exec(f);
  if (!m) continue;
  const en = JSON.parse(readFileSync(join(enDir, `batch-${m[1]}.json`), 'utf8')).dicts;
  const tr = JSON.parse(readFileSync(join(trDir, f), 'utf8')).dicts;
  for (const [ns, enDict] of Object.entries(en)) {
    const trDict = tr[ns] ?? {};
    for (const [k, ev] of Object.entries(enDict)) {
      const tv = trDict[k];
      if (typeof tv !== 'string' || tv === ev) continue;
      if (codeLike(ev)) flagged.push(`${m[1]}:${ns}.${k}  EN=${JSON.stringify(ev)}  TR=${JSON.stringify(tv)}`);
    }
  }
}
console.log(`code-like English values translated: ${flagged.length}`);
for (const x of flagged) console.log('  ' + x);
