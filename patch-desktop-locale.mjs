// Stage 1: patch the three Electron shell files that own the desktop locale
// tables (caption menubar + main-process popups + welcome frame) to support tr.
//
// Reads the extracted copies in the workspace, validates desktop-tr.json
// against each file's en table, injects `const tr = {...}`, makes
// resolveDesktopLocale tr-aware, and (main only) teaches the startup resolver
// the tr preference/OS language. Writes *.patched next to the originals.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const enDict = JSON.parse(readFileSync(join(root, 'desktop-en.json'), 'utf8'));
const trDict = JSON.parse(readFileSync(join(root, 'desktop-tr.json'), 'utf8'));

// ---- validate the translation against the canonical en table ---------------
const enKeys = Object.keys(enDict);
const missing = enKeys.filter((k) => !(k in trDict));
const extra = Object.keys(trDict).filter((k) => !(k in enDict));
const ph = (s) => (s.match(/\{[^{}]*\}/g) ?? []).sort();
const badPh = [];
for (const k of enKeys) {
  if (!(k in trDict)) continue;
  if (typeof trDict[k] !== 'string') badPh.push(`${k}: not a string`);
  else if ((enDict[k] === '') !== (trDict[k] === '')) badPh.push(`${k}: empty mismatch`);
  else if (JSON.stringify(ph(enDict[k])) !== JSON.stringify(ph(trDict[k]))) badPh.push(`${k}: placeholder ${JSON.stringify(ph(enDict[k]))} vs ${JSON.stringify(ph(trDict[k]))}`);
}
if (missing.length || badPh.length) {
  console.error(`missing: ${missing.join(', ') || '(none)'}`);
  for (const b of badPh) console.error('  ' + b);
  process.exit(1);
}
console.log(`translation OK: ${enKeys.length} keys${extra.length ? ` (+${extra.length} extra ignored)` : ''}`);

// ---- helpers ---------------------------------------------------------------
function extractEnTable(text) {
  const marker = 'const en = {';
  const at = text.indexOf(marker);
  if (at < 0) throw new Error('en table not found');
  const start = at + marker.length - 1;
  let depth = 0;
  let state = 'code';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (state === 'code') {
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return { start, close: i }; }
      else if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'template';
      else if (c === '/' && n === '/') state = 'line';
      else if (c === '/' && n === '*') { state = 'block'; i++; }
    } else if (state === 'single') { if (c === '\\') i++; else if (c === "'") state = 'code'; }
    else if (state === 'double') { if (c === '\\') i++; else if (c === '"') state = 'code'; }
    else if (state === 'template') { if (c === '\\') i++; else if (c === '`') state = 'code'; }
    else if (state === 'line') { if (c === '\n') state = 'code'; }
    else if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i++; } }
  }
  throw new Error('unterminated en table');
}

function extractFunction(text, signature) {
  const at = text.indexOf(signature);
  if (at < 0) throw new Error(`function not found: ${signature}`);
  const start = text.indexOf('{', at);
  let depth = 0;
  let state = 'code';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (state === 'code') {
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return { start: at, end: i + 1 }; }
      else if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'template';
      else if (c === '/' && n === '/') state = 'line';
      else if (c === '/' && n === '*') { state = 'block'; i++; }
    } else if (state === 'single') { if (c === '\\') i++; else if (c === "'") state = 'code'; }
    else if (state === 'double') { if (c === '\\') i++; else if (c === '"') state = 'code'; }
    else if (state === 'template') { if (c === '\\') i++; else if (c === '`') state = 'code'; }
    else if (state === 'line') { if (c === '\n') state = 'code'; }
    else if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i++; } }
  }
  throw new Error(`unterminated function: ${signature}`);
}

const trLiteral = (() => {
  const entries = enKeys.map((k) => {
    const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    return `\t${key}: ${JSON.stringify(trDict[k])}`;
  });
  return `const tr = {\n${entries.join(',\n')}\n};`;
})();

const resolveOld = `function resolveDesktopLocale(locale) {
\treturn locale.toLowerCase().startsWith("zh") ? {
\t\tid: "zh-CN",
\t\tmessages: zh
\t} : {
\t\tid: "en",
\t\tmessages: en
\t};
}`;
const resolveNew = `function resolveDesktopLocale(locale) {
\tconst lower = locale.toLowerCase();
\tif (lower.startsWith("zh")) return {
\t\tid: "zh-CN",
\t\tmessages: zh
\t};
\tif (lower.startsWith("tr")) return {
\t\tid: "tr",
\t\tmessages: tr
\t};
\treturn {
\t\tid: "en",
\t\tmessages: en
\t};
}`;

// ---- patch each file -------------------------------------------------------
const TARGETS = [
  { src: 'electron-main.js', startup: true },
  { src: 'lib_preload-app.cjs', startup: false },
  { src: 'scan_lib_preload-welcome.cjs', startup: false },
];

for (const t of TARGETS) {
  let text = readFileSync(join(root, t.src), 'utf8');

  // 0. this file's own en table must be fully covered by the translation.
  const fileTable = extractEnTable(text);
  const fileEn = vm.runInNewContext(`(${text.slice(fileTable.start, fileTable.close + 1)})`, {}, { timeout: 2000 });
  const fileKeys = Object.keys(fileEn);
  const uncovered = fileKeys.filter((k) => !(k in trDict));
  const extraInFile = fileKeys.filter((k) => k in trDict && typeof fileEn[k] === 'string' && typeof trDict[k] === 'string'
    && ((fileEn[k] === '') !== (trDict[k] === '') || JSON.stringify(ph(fileEn[k])) !== JSON.stringify(ph(trDict[k]))));
  if (uncovered.length || extraInFile.length) {
    console.error(`${t.src}: uncovered keys: ${uncovered.join(', ') || '(none)'}`);
    for (const k of extraInFile) console.error(`  placeholder/empty mismatch vs canonical: ${k}`);
    process.exit(1);
  }
  console.log(`${t.src}: en table covered (${fileKeys.length} keys)`);

  // 1. inject the tr table right after the en table's closing semicolon.
  const table = fileTable;
  const semi = text.indexOf(';', table.close);
  if (semi !== table.close + 1 && text.slice(table.close + 1, semi).trim() !== '') throw new Error(`${t.src}: unexpected text after en table`);
  const insertAt = semi + 1;
  text = `${text.slice(0, insertAt)}\n${trLiteral}${text.slice(insertAt)}`;

  // 2. tr-aware resolveDesktopLocale (exact old body required).
  if (!text.includes(resolveOld)) throw new Error(`${t.src}: resolveDesktopLocale body differs from expected source`);
  text = text.replace(resolveOld, resolveNew);

  // 3. main only: accept the tr preference and tr OS language at startup.
  if (t.startup) {
    const condPref = 'if (selected === "zh" || selected === "en") return resolveDesktopLocale(selected);';
    const condLang = 'if (primary === "zh" || primary === "en") return resolveDesktopLocale(primary);';
    if (!text.includes(condPref) || !text.includes(condLang)) throw new Error('main: startup locale conditions not found');
    text = text
      .replace(condPref, 'if (selected === "zh" || selected === "en" || selected === "tr") return resolveDesktopLocale(selected);')
      .replace(condLang, 'if (primary === "zh" || primary === "en" || primary === "tr") return resolveDesktopLocale(primary);');
  }

  const out = join(root, `${t.src}.patched`);
  writeFileSync(out, text);
  console.log(`patched ${t.src} -> ${t.src}.patched (${text.length} chars)`);
}
console.log('stage 1 complete');
