// Validate one translated batch against its English source.
// Usage: node validate-batch.mjs <batchId e.g. 03>
// Compares i18n-work/en/batch-<id>.json with i18n-work/tr/batch-<id>.json.
// Exit 0 when the translation is complete and safe; exit 1 with a checklist.
import { readFileSync, existsSync } from 'node:fs';

const id = process.argv[2];
const base = new URL('./i18n-work/', import.meta.url);
const enPath = new URL(`en/batch-${id}.json`, base);
const trPath = new URL(`tr/batch-${id}.json`, base);

if (!existsSync(trPath)) {
  console.error(`MISSING ${trPath.pathname}`);
  process.exit(1);
}
let en;
let tr;
try {
  en = JSON.parse(readFileSync(enPath, 'utf8'));
} catch (e) {
  console.error(`SOURCE READ FAILED: ${e.message}`);
  process.exit(1);
}
try {
  tr = JSON.parse(readFileSync(trPath, 'utf8'));
} catch (e) {
  console.error(`TR JSON INVALID: ${e.message}`);
  process.exit(1);
}

const errors = [];
const ph = (s) => (s.match(/\{[^{}]*\}/g) ?? []).sort();
const enNs = Object.keys(en.dicts);
const trNs = Object.keys(tr.dicts ?? {});
for (const ns of enNs) {
  if (!trNs.includes(ns)) { errors.push(`missing namespace: ${ns}`); continue; }
  const enKeys = Object.keys(en.dicts[ns]);
  const trDict = tr.dicts[ns];
  for (const k of enKeys) {
    if (!(k in trDict)) { errors.push(`${ns}: missing key "${k}"`); continue; }
    const ev = en.dicts[ns][k];
    const tv = trDict[k];
    if (typeof tv !== 'string') { errors.push(`${ns}.${k}: value is ${typeof tv}, must be string`); continue; }
    if (ev === '' && tv !== '') { errors.push(`${ns}.${k}: must stay empty`); continue; }
    if (ev !== '' && tv === '') { errors.push(`${ns}.${k}: empty translation`); continue; }
    const eph = ph(ev);
    const tph = ph(tv);
    if (JSON.stringify(eph) !== JSON.stringify(tph)) {
      errors.push(`${ns}.${k}: placeholder mismatch en=${JSON.stringify(eph)} tr=${JSON.stringify(tph)}`);
    }
  }
  for (const k of Object.keys(trDict)) {
    if (!enKeys.includes(k)) errors.push(`${ns}: extra key "${k}" not in source`);
  }
}
for (const ns of trNs) if (!enNs.includes(ns)) errors.push(`extra namespace: ${ns}`);

if (errors.length) {
  console.error(`BATCH ${id}: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 60)) console.error('  - ' + e);
  if (errors.length > 60) console.error(`  ... and ${errors.length - 60} more`);
  process.exit(1);
}
const total = enNs.reduce((n, ns) => n + Object.keys(en.dicts[ns]).length, 0);
console.log(`BATCH ${id}: OK (${enNs.length} namespaces, ${total} keys)`);
