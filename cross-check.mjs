// Cross-batch terminology consistency check.
// For every English source string that appears in more than one place, collect
// the Turkish values it received. Flag English strings mapped to 2+ different
// Turkish renderings (case-insensitive) — a review list for terminology drift.
// Usage: node cross-check.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const enDir = join(root, 'i18n-work', 'en');
const trDir = join(root, 'i18n-work', 'tr');

// Map batch id -> en dicts (originals and halves).
const enById = new Map();
for (const f of readdirSync(enDir)) {
  const m = /^batch-(\d+[a-z]?)\.json$/.exec(f);
  if (!m) continue;
  enById.set(m[1], JSON.parse(readFileSync(join(enDir, f), 'utf8')).dicts);
}

const pairs = new Map(); // enValue -> Map(trValue -> [where...])
let checked = 0;
for (const f of readdirSync(trDir)) {
  const m = /^batch-(\d+[a-z]?)\.json$/.exec(f);
  if (!m) continue;
  const id = m[1];
  const en = enById.get(id);
  if (!en) { console.warn(`no en source for ${id}`); continue; }
  const tr = JSON.parse(readFileSync(join(trDir, f), 'utf8')).dicts;
  for (const [ns, enDict] of Object.entries(en)) {
    const trDict = tr[ns];
    if (!trDict) continue;
    for (const [k, ev] of Object.entries(enDict)) {
      const tv = trDict[k];
      if (typeof tv !== 'string' || ev === '' || tv === '') continue;
      checked++;
      if (!pairs.has(ev)) pairs.set(ev, new Map());
      const inner = pairs.get(ev);
      if (!inner.has(tv)) inner.set(tv, []);
      inner.get(tv).push(`${id}:${ns}.${k}`);
    }
  }
}

const conflicts = [];
for (const [ev, inner] of pairs) {
  if (inner.size < 2) continue;
  // Ignore pure case/whitespace differences — those are legitimate casing
  // adaptations (sentence vs title case).
  const distinct = new Map();
  for (const tv of inner.keys()) {
    const key = tv.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
    if (!distinct.has(key)) distinct.set(key, []);
    distinct.get(key).push(tv);
  }
  if (distinct.size < 2) continue;
  conflicts.push({ ev, inner });
}

console.log(`checked ${checked} key occurrences, ${pairs.size} distinct English strings`);
console.log(`conflicts (same English, different Turkish): ${conflicts.length}`);

// Machine-readable report for programmatic fixing.
const jsonOut = join(root, 'cross-check-report.json');
writeFileSync(jsonOut, JSON.stringify(
  conflicts.map((c) => ({
    en: c.ev,
    variants: [...c.inner.entries()].map(([tv, where]) => ({ tr: tv, where })),
  })),
  null, 1,
));
console.log(`json report: ${jsonOut}`);

for (const c of conflicts.slice(0, 50)) {
  console.log(`\nEN: ${JSON.stringify(c.ev.length > 90 ? c.ev.slice(0, 90) + '…' : c.ev)}`);
  for (const [tv, where] of c.inner) {
    console.log(`  -> ${JSON.stringify(tv)}   (${where.slice(0, 3).join(', ')}${where.length > 3 ? `, +${where.length - 3}` : ''})`);
  }
}
if (conflicts.length > 50) console.log(`\n... and ${conflicts.length - 50} more`);
