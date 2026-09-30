// Merge en-dicts-3rd.json into en-dicts.json and print a per-namespace sanity
// summary (key counts, non-string values, empty strings).
import { readFileSync, writeFileSync } from 'node:fs';

const [main, third, out] = process.argv.slice(2);
const a = JSON.parse(readFileSync(main, 'utf8'));
const b = JSON.parse(readFileSync(third, 'utf8'));
for (const [ns, dict] of Object.entries(b.dicts)) {
  a.dicts[ns] = { ...(a.dicts[ns] ?? {}), ...dict };
}
a.languages.push(...(b.languages ?? []));
a.registrations.push(...(b.registrations ?? []));
a.errors.push(...(b.errors ?? []));
writeFileSync(out, JSON.stringify(a, null, 1));

let total = 0;
const issues = [];
for (const [ns, dict] of Object.entries(a.dicts)) {
  const keys = Object.keys(dict);
  total += keys.length;
  for (const k of keys) {
    const v = dict[k];
    if (typeof v !== 'string') issues.push(`${ns}.${k}: non-string ${JSON.stringify(v)}`);
    else if (v.length === 0) issues.push(`${ns}.${k}: empty`);
    else if (/[{}]/.test(v) && !/\{[a-zA-Z0-9_]+\}/.test(v)) issues.push(`${ns}.${k}: suspicious braces "${v}"`);
  }
}
console.log(`namespaces=${Object.keys(a.dicts).length} totalKeys=${total}`);
console.log(`third-party namespaces: ${Object.keys(b.dicts).join(', ')}`);
console.log(`issues=${issues.length}`);
for (const i of issues.slice(0, 40)) console.log('  ' + i);
