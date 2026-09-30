// Stage 2: rebuild app.asar with the three patched shell files.
//
// The asar layout is: [u32 4][u32 8+jsonLen+pad][u32 4+jsonLen+pad][u32
// jsonLen][json][pad] then file data addressed by offsets relative to the
// data base. Patching files of different sizes shifts every later offset, so
// the whole archive is rewritten: header offsets recomputed in physical order,
// integrity hashes refreshed for the replaced files, then the swap happens
// through File.Replace (atomic with a .bak backup).
//
// Usage: node rebuild-asar.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const asarPath = 'C:\\Users\\erdinc\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';

const MODS = [
  { rel: 'lib/main.js', patch: 'electron-main.js.patched' },
  { rel: 'lib/preload-app.cjs', patch: 'lib_preload-app.cjs.patched' },
  { rel: 'lib/preload-welcome.cjs', patch: 'scan_lib_preload-welcome.cjs.patched' },
];

// ---- read original ---------------------------------------------------------
const original = readFileSync(asarPath);
const u32 = (o) => original.readUInt32LE(o);
if (u32(0) !== 4) throw new Error(`unexpected asar framing: ${u32(0)}`);
const jsonLen = u32(12);
const pad = (4 - (jsonLen % 4)) % 4;
const jsonStart = 16;
const base = jsonStart + jsonLen + pad;
const header = JSON.parse(original.subarray(jsonStart, jsonStart + jsonLen).toString('utf8'));
console.log(`original: ${original.length} bytes, json=${jsonLen}, base=${base}`);

// ---- collect file entries in physical order --------------------------------
const entries = [];
function walk(node, path) {
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) {
      walk(child, path ? `${path}/${name}` : name);
    }
  } else if (node.unpacked) {
    // lives in app.asar.unpacked — referenced only, no bytes in this archive.
    unpacked.push(path);
  } else if (node.offset !== undefined) {
    entries.push({ path, node, oldOffset: Number(node.offset), size: Number(node.size) });
  } else {
    throw new Error(`entry without offset: ${path}`);
  }
}
const unpacked = [];
walk(header, '');
entries.sort((a, b) => a.oldOffset - b.oldOffset);
for (let i = 1; i < entries.length; i++) {
  const prev = entries[i - 1];
  const end = prev.oldOffset + prev.size;
  if (end !== entries[i].oldOffset) throw new Error(`non-contiguous archive at ${entries[i].path} (${end} != ${entries[i].oldOffset})`);
}
const archiveEnd = entries.at(-1).oldOffset + entries.at(-1).size;
if (base + archiveEnd !== original.length) throw new Error(`unexpected trailing bytes: base+end=${base + archiveEnd}, file=${original.length}`);
console.log(`entries: ${entries.length} packed + ${unpacked.length} unpacked, archive data: ${archiveEnd} bytes`);

// ---- apply modifications ---------------------------------------------------
const modByRel = new Map(MODS.map((m) => [m.rel, m]));
let modifiedCount = 0;
for (const e of entries) {
  const mod = modByRel.get(e.path);
  if (!mod) continue;
  const content = readFileSync(join(root, mod.patch));
  e.newContent = content;
  e.size = content.length;
  e.node.size = content.length;
  if (e.node.integrity) {
    if (e.node.integrity.algorithm !== 'SHA256') throw new Error(`${e.path}: unexpected integrity algorithm`);
    const blockSize = e.node.integrity.blockSize ?? 4194304;
    const blocks = [];
    for (let o = 0; o < content.length; o += blockSize) {
      blocks.push(createHash('sha256').update(content.subarray(o, o + blockSize)).digest('hex'));
    }
    if (blocks.length !== 1) throw new Error(`${e.path}: multi-block integrity semantics unverified (${blocks.length} blocks)`);
    e.node.integrity.hash = blocks[0];
    e.node.integrity.blocks = blocks;
  }
  console.log(`modified ${e.path}: ${e.size} -> ${content.length} bytes${e.node.integrity ? ', integrity refreshed' : ''}`);
  modifiedCount++;
}
if (modifiedCount !== MODS.length) throw new Error(`expected ${MODS.length} modifications, applied ${modifiedCount}`);

// ---- recompute offsets -----------------------------------------------------
let running = 0;
for (const e of entries) {
  e.newOffset = running;
  e.node.offset = String(running);
  running += e.node.size;
}
const newJson = Buffer.from(JSON.stringify(header), 'utf8');
const newPad = (4 - (newJson.length % 4)) % 4;
const newBase = 16 + newJson.length + newPad;
console.log(`new header json=${newJson.length}, base=${newBase}, data=${running}`);

// ---- assemble the new archive ---------------------------------------------
const head = Buffer.alloc(16 + newJson.length + newPad);
head.writeUInt32LE(4, 0);
head.writeUInt32LE(8 + newJson.length + newPad, 4);
head.writeUInt32LE(4 + newJson.length + newPad, 8);
head.writeUInt32LE(newJson.length, 12);
newJson.copy(head, 16);
const outPath = join(dirname(asarPath), 'app.asar.new');
const out = Buffer.alloc(head.length + running);
head.copy(out, 0);
let pos = head.length;
for (const e of entries) {
  const content = e.newContent ?? original.subarray(base + e.oldOffset, base + e.oldOffset + e.size);
  content.copy(out, pos);
  pos += e.newContent ? e.newContent.length : e.size;
  if (pos - head.length !== e.newOffset + e.size) throw new Error(`assembly mismatch at ${e.path}`);
}
if (out.length !== pos) throw new Error(`assembled size mismatch: ${out.length} != ${pos}`);
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} bytes)`);

// ---- sanity: reparse the new archive --------------------------------------
const probe = readFileSync(outPath);
const pJsonLen = probe.readUInt32LE(12);
const pPad = (4 - (pJsonLen % 4)) % 4;
const pHeader = JSON.parse(probe.subarray(16, 16 + pJsonLen).toString('utf8'));
const pEntries = [];
(function walk2(node, path) {
  if (node.files) for (const [n, c] of Object.entries(node.files)) walk2(c, path ? `${path}/${n}` : n);
  else if (node.offset !== undefined) pEntries.push({ path, node });
})(pHeader, '');
let bad = 0;
for (const e of pEntries) {
  const off = 16 + pJsonLen + pPad + Number(e.node.offset);
  const bytes = probe.subarray(off, off + Number(e.node.size));
  const mod = modByRel.get(e.path);
  if (mod) {
    const expect = readFileSync(join(root, mod.patch));
    if (!bytes.equals(expect)) { console.error(`VERIFY FAIL: ${e.path} content mismatch`); bad++; }
  }
}
if (bad) process.exit(1);
console.log(`verify OK: ${pEntries.length} entries, all modified files byte-identical`);

// ---- swap (atomic replace with backup) -------------------------------------
const testPath = join(dirname(asarPath), '.dsh-asar-write-test');
try {
  writeFileSync(testPath, 'ok');
  unlinkSync(testPath);
} catch (e) {
  console.error(`TARGET DIRECTORY NOT WRITABLE: ${e.message}`);
  process.exit(2);
}
console.log('directory writable; ready to swap (run with --swap)');
if (!process.argv.includes('--swap')) process.exit(0);

const backupPath = join(dirname(asarPath), 'app.asar.bak');
const fs = await import('node:fs');
if (existsSync(backupPath)) fs.unlinkSync(backupPath);
fs.cpSync(asarPath, backupPath); // keep the untouched original as rollback
// fs.rename replaces an existing destination on Windows (MOVEFILE_REPLACE_EXISTING).
fs.renameSync(outPath, asarPath);
console.log(`SWAPPED. original backed up at ${backupPath}`);
