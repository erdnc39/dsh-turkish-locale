// Statically extract `en` dictionary object literals for the namespaces whose
// apply() path never reaches ctx.locale.register under the capture harness:
//   - dsh-client-locale      -> common (en$1), settings.locale (en)
//   - dsh-client-ui-theme    -> settings.theme (en)
//   - voice-input            -> voice-input (en)
//   - settings-account       -> settings.account (en)
// Each entry names the file, the line of `const <ident> = {`, and the target
// namespace. The literal is brace-matched (string/comment aware) and evaluated,
// then merged into the main en-dicts.json.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const [clientsDir, inFile, outFile] = process.argv.slice(2);

const ENTRIES = [
  { file: 'dsh-client-locale.js', line: 975, ns: 'common' },
  { file: 'dsh-client-locale.js', line: 1024, ns: 'settings.locale' },
  { file: 'dsh-client-ui-theme.js', line: 1210, ns: 'settings.theme' },
  { file: 'dsh-experimental-client-ui-voice-input.js', line: 5273, ns: 'voice-input' },
  { file: 'dsh-client-ui-settings-account.js', line: 2757, ns: 'settings.account' },
];

function extractLiteral(text, startIdx) {
  // startIdx points at the first `{`.
  let depth = 0;
  let i = startIdx;
  let state = 'code'; // code | single | double | template | line-comment | block-comment
  for (; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    switch (state) {
      case 'code':
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
        else if (c === "'") state = 'single';
        else if (c === '"') state = 'double';
        else if (c === '`') state = 'template';
        else if (c === '/' && next === '/') state = 'line-comment';
        else if (c === '/' && next === '*') { state = 'block-comment'; i++; }
        else if (c === '/' && depth > 0) {
          // possible regex literal — skip it conservatively
          let j = i + 1;
          let inClass = false;
          for (; j < text.length; j++) {
            const d = text[j];
            if (d === '\\') { j++; continue; }
            if (d === '[') inClass = true;
            else if (d === ']') inClass = false;
            else if (d === '/' && !inClass) break;
            else if (d === '\n') break;
          }
          i = j;
        }
        break;
      case 'single': if (c === '\\') i++; else if (c === "'") state = 'code'; break;
      case 'double': if (c === '\\') i++; else if (c === '"') state = 'code'; break;
      case 'template': if (c === '\\') i++; else if (c === '`') state = 'code'; break;
      case 'line-comment': if (c === '\n') state = 'code'; break;
      case 'block-comment': if (c === '*' && next === '/') { state = 'code'; i++; } break;
    }
  }
  throw new Error('unterminated literal');
}

const report = JSON.parse(readFileSync(inFile, 'utf8'));
for (const entry of ENTRIES) {
  const text = readFileSync(`${clientsDir}/${entry.file}`, 'utf8');
  const lines = text.split('\n');
  const decl = lines[entry.line - 1];
  const braceAt = decl.indexOf('{');
  if (braceAt < 0) throw new Error(`${entry.file}:${entry.line} has no '{': ${decl}`);
  // absolute index of that brace within text
  let abs = 0;
  for (let l = 0; l < entry.line - 1; l++) abs += lines[l].length + 1;
  const literal = extractLiteral(text, abs + braceAt);
  const dict = vm.runInNewContext(`(${literal})`, { Object }, { timeout: 2000 });
  report.dicts[entry.ns] = { ...(report.dicts[entry.ns] ?? {}), ...dict };
  console.log(`${entry.ns}: +${Object.keys(dict).length} keys (from ${entry.file}:${entry.line})`);
}

writeFileSync(outFile, JSON.stringify(report, null, 1));
const nsCount = Object.keys(report.dicts).length;
const keyCount = Object.values(report.dicts).reduce((n, d) => n + Object.keys(d).length, 0);
console.log(`TOTAL namespaces=${nsCount} enKeys=${keyCount}`);
