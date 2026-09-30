import { writeFile } from 'node:fs/promises';

const url = process.argv[2];
const out = process.argv[3];
const res = await fetch(url, { headers: { 'user-agent': 'dsh-turkish-locale-setup' } });
if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(out, buf);
console.log(`OK ${out} ${buf.length} bytes`);
