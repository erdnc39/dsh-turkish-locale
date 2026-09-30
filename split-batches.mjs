// Split en-dicts.json into balanced translation batches.
// Usage: node split-batches.mjs <en-dicts.json> <outDir>
// Writes <outDir>/batch-NN.json, each {"batch":"NN","dicts":{ns:{key:en,...}}}.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [inFile, outDir] = process.argv.slice(2);
const data = JSON.parse(readFileSync(inFile, 'utf8'));
const entries = Object.entries(data.dicts).map(([ns, dict]) => ({ ns, dict }));
// Largest first for balanced greedy bin packing.
entries.sort((a, b) => Object.keys(b.dict).length - Object.keys(a.dict).length);
const TARGET = 340; // keys per batch
const bins = [];
for (const e of entries) {
  const size = Object.keys(e.dict).length;
  let bin = bins.find((b) => b.size + size <= TARGET);
  if (!bin) { bin = { size: 0, items: [] }; bins.push(bin); }
  bin.size += size;
  bin.items.push(e);
}
mkdirSync(outDir, { recursive: true });
const manifest = [];
bins.forEach((bin, i) => {
  const id = String(i + 1).padStart(2, '0');
  const dicts = {};
  for (const e of bin.items) dicts[e.ns] = e.dict;
  writeFileSync(`${outDir}/batch-${id}.json`, JSON.stringify({ batch: id, dicts }, null, 1));
  manifest.push({ batch: id, keys: bin.size, namespaces: bin.items.map((e) => `${e.ns}(${Object.keys(e.dict).length})`) });
});
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 1));
for (const m of manifest) console.log(`${m.batch}: ${m.keys} keys :: ${m.namespaces.join(', ')}`);
console.log(`batches=${manifest.length} total=${manifest.reduce((n, m) => n + m.keys, 0)}`);
