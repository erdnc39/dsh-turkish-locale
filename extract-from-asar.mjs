// Extract a file from the installed DeepSeek Harness app.asar by its archive
// path (e.g. dsh/node_modules/@deepseek-ai/dsh-client-locale/lib/client.js).
// The archive framing is derived from the file itself: the header carries
// [u32 4][u32 pickle2-total][u32 payload][u32 jsonLen] then the JSON tree whose
// per-file offsets are relative to the data base that follows it.
//
// Usage:
//   node extract-from-asar.mjs <archive-relative-path> [outPath]
//   node extract-from-asar.mjs --list <substring>        # matching archive paths
import { readFileSync, writeFileSync } from 'node:fs';

const asarPath = 'C:\\Users\\erdinc\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';
const fh = readFileSync(asarPath);
if (fh.readUInt32LE(0) !== 4) throw new Error('unexpected asar framing');
const jsonLen = fh.readUInt32LE(12);
const pad = (4 - (jsonLen % 4)) % 4;
const base = 16 + jsonLen + pad;
const header = JSON.parse(fh.subarray(16, 16 + jsonLen).toString('utf8'));

if (process.argv[2] === '--list') {
  const needle = process.argv[3] ?? '';
  const hits = [];
  (function walk(node, path) {
    if (node.files) for (const [n, c] of Object.entries(node.files)) walk(c, path ? `${path}/${n}` : n);
    else if (node.offset !== undefined && path.includes(needle)) hits.push(`${path}  (${node.size} bytes)`);
  })(header, '');
  console.log(hits.join('\n'));
  process.exit(0);
}

const rel = process.argv[2];
if (!rel) { console.error('usage: node extract-from-asar.mjs <path> [out]'); process.exit(1); }
let node = header;
for (const part of rel.split('/')) {
  node = node.files?.[part];
  if (!node) { console.error(`not found in archive: ${rel} (at ${part})`); process.exit(1); }
}
if (node.offset === undefined) { console.error(`unpacked entry (no bytes in archive): ${rel}`); process.exit(1); }
const content = fh.subarray(base + Number(node.offset), base + Number(node.offset) + Number(node.size));
const out = process.argv[3] ?? rel.split('/').at(-1);
writeFileSync(out, content);
console.log(`extracted ${rel} -> ${out} (${node.size} bytes)`);
