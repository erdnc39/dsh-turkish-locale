// Split failed translation batches into smaller halves so each subagent write
// stays small. Usage: node split-failed.mjs
// Reads i18n-work/en/batch-<id>.json for the ids below and writes
// i18n-work/en/batch-<id>a.json + batch-<id>b.json (single-namespace batches
// are split at the key level; multi-namespace batches at the namespace level).
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const enDir = join(root, 'i18n-work', 'en');

const SPLITS = {
  '01': null, // single namespace (conversation) -> split keys in half
  '03': ['pluginManager'],            // rest -> 03b
  '04': ['schedule.manager'],         // rest -> 04b
  '06': ['settings.ourFreeModel'],    // rest -> 06b
  '07': [                             // first group -> 07a, rest -> 07b
    'settings.agentPreset', 'common', 'settings.pluginInventory', 'subagent', 'settings',
  ],
};

for (const [id, firstGroup] of Object.entries(SPLITS)) {
  const src = JSON.parse(readFileSync(join(enDir, `batch-${id}.json`), 'utf8'));
  const nsList = Object.keys(src.dicts);
  let a; let b;
  if (firstGroup === null) {
    // Split the single namespace's keys in half, preserving source order.
    const ns = nsList[0];
    const keys = Object.keys(src.dicts[ns]);
    const cut = Math.ceil(keys.length / 2);
    const part = (list) => {
      const d = {};
      for (const k of list) d[k] = src.dicts[ns][k];
      return { [ns]: d };
    };
    a = part(keys.slice(0, cut));
    b = part(keys.slice(cut));
  } else {
    a = {};
    b = {};
    for (const ns of nsList) {
      (firstGroup.includes(ns) ? a : b)[ns] = src.dicts[ns];
    }
    if (!Object.keys(b).length) throw new Error(`${id}: empty second half`);
  }
  writeFileSync(join(enDir, `batch-${id}a.json`), JSON.stringify({ batch: `${id}a`, dicts: a }, null, 1));
  writeFileSync(join(enDir, `batch-${id}b.json`), JSON.stringify({ batch: `${id}b`, dicts: b }, null, 1));
  const size = (o) => Object.values(o).reduce((n, d) => n + Object.keys(d).length, 0);
  console.log(`${id}: a=${size(a)} keys (${Object.keys(a).length} ns) b=${size(b)} keys (${Object.keys(b).length} ns)`);
}
console.log('original en batches retained as reference (no tr/batch-<id>.json will exist for them)');
