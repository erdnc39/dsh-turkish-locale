// Extract the `const en = {...}` message table from a file and compare tables
// across electron-main.js and lib_preload-app.cjs.
// Usage: node compare-desktop-tables.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));

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
      else if (c === '}') { depth--; if (depth === 0) return { literal: text.slice(start, i + 1), end: i + 1, start }; }
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

const mainText = readFileSync(join(root, 'electron-main.js'), 'utf8');
const preloadText = readFileSync(join(root, 'lib_preload-app.cjs'), 'utf8');
const mainTable = extractEnTable(mainText);
const preloadTable = extractEnTable(preloadText);
const parse = (lit) => vm.runInNewContext(`(${lit})`, {}, { timeout: 2000 });
const mainEn = parse(mainTable.literal);
const preloadEn = parse(preloadTable.literal);

const mainKeys = Object.keys(mainEn);
const preloadKeys = Object.keys(preloadEn);
const onlyMain = mainKeys.filter((k) => !(k in preloadEn));
const onlyPreload = preloadKeys.filter((k) => !(k in mainEn));
const differing = mainKeys.filter((k) => k in preloadEn && mainEn[k] !== preloadEn[k]);

console.log(`main:    ${mainKeys.length} keys`);
console.log(`preload: ${preloadKeys.length} keys`);
console.log(`only in main:    ${onlyMain.length ? onlyMain.join(', ') : '(none)'}`);
console.log(`only in preload: ${onlyPreload.length ? onlyPreload.join(', ') : '(none)'}`);
console.log(`value differences: ${differing.length ? differing.join(', ') : '(none)'}`);

// Dump the main table as flat JSON for translation.
writeFileSync(join(root, 'desktop-en.json'), JSON.stringify(mainEn, null, 1));
console.log(`wrote desktop-en.json (${mainKeys.length} keys)`);
