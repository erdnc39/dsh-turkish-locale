// Assemble dsh-tr-locale/lib/client.js from the validated tr batch files.
// Usage: node build-client.mjs
// Reads i18n-work/tr/batch-*.json, cross-checks against en-dicts.json for
// full coverage (same namespaces, same keys, placeholder parity), then writes
// dsh-tr-locale/lib/client.js in the ModuleLoader bundle format.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(root, 'en-dicts.json'), 'utf8'));
const trDir = join(root, 'i18n-work', 'tr');
const files = readdirSync(trDir).filter((f) => /^batch-\d+[a-z]?\.json$/.test(f)).sort();

const tr = {};
const seen = {}; // ns -> Set of keys, to catch cross-file key collisions
for (const f of files) {
  const batch = JSON.parse(readFileSync(join(trDir, f), 'utf8'));
  for (const [ns, dict] of Object.entries(batch.dicts)) {
    if (!tr[ns]) {
      tr[ns] = { ...dict };
      seen[ns] = new Set(Object.keys(dict));
      continue;
    }
    // Split halves may share one namespace; overlapping keys are a bug.
    for (const k of Object.keys(dict)) {
      if (seen[ns].has(k)) throw new Error(`duplicate key ${ns}.${k} (from ${f})`);
      seen[ns].add(k);
    }
    Object.assign(tr[ns], dict);
  }
}

// Coverage + hygiene checks against the English source.
const errors = [];
const ph = (s) => (s.match(/\{[^{}]*\}/g) ?? []).sort();
let total = 0;
for (const [ns, enDict] of Object.entries(en.dicts)) {
  const trDict = tr[ns];
  if (!trDict) { errors.push(`missing namespace ${ns}`); continue; }
  for (const [k, ev] of Object.entries(enDict)) {
    total++;
    const tv = trDict[k];
    if (typeof tv !== 'string') { errors.push(`${ns}.${k}: missing or non-string`); continue; }
    if ((ev === '') !== (tv === '')) { errors.push(`${ns}.${k}: empty mismatch`); continue; }
    if (JSON.stringify(ph(ev)) !== JSON.stringify(ph(tv))) {
      errors.push(`${ns}.${k}: placeholder mismatch`);
    }
  }
  for (const k of Object.keys(trDict)) {
    if (!(k in enDict)) errors.push(`${ns}: extra key ${k}`);
  }
}
for (const ns of Object.keys(tr)) if (!en.dicts[ns]) errors.push(`extra namespace ${ns}`);
if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const e of errors.slice(0, 80)) console.error('  - ' + e);
  process.exit(1);
}

// Stable namespace order: sorted for deterministic output.
const ordered = {};
for (const ns of Object.keys(tr).sort()) ordered[ns] = tr[ns];
const dictLiteral = JSON.stringify(ordered, null, '\t')
  .split('\n')
  .map((line, i) => (i === 0 ? line : '\t\t' + line))
  .join('\n');

const bundle = `window.__ModuleLoader__.load({
	id: "dsh-tr-locale",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/tr/index.ts
		/**
		* Aggregator for the tr dictionaries: one entry per locale namespace the
		* pack covers (first-party UI namespaces plus profile plugins). Missing
		* namespaces or keys resolve through the SDK fallback chain ns -> common
		* -> en -> key, so an untranslated key shows English, never Chinese.
		*/
		/** tr dictionaries keyed by the locale namespace each source package registers. */
		const trDictionaries = ${dictLiteral};
		//#endregion
		//#region src/client/index.ts
		/** The language this pack adds: id, self-described label, English fallback. */
		const TR_LANGUAGE = {
			id: "tr",
			label: "Türkçe",
			fallback: "en"
		};
		/** Services required by the browser half. */
		const inject = ["locale"];
		/**
		* Register the tr language and every covered namespace's tr dictionary.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				const disposers = [];
				try {
					disposers.push(ctx.locale.addLanguage(TR_LANGUAGE));
				} catch {}
				for (const [ns, dict] of Object.entries(trDictionaries)) try {
					disposers.push(ctx.locale.register(ns, TR_LANGUAGE.id, dict));
				} catch {}
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "dsh-tr-locale: tr language pack");
		}
		//#endregion
		exports.TR_LANGUAGE = TR_LANGUAGE;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
`;

const out = join(root, 'dsh-tr-locale', 'lib', 'client.js');
writeFileSync(out, bundle);
const nsCount = Object.keys(tr).length;
console.log(`wrote ${out}`);
console.log(`namespaces=${nsCount} keys=${total} bytes=${Buffer.byteLength(bundle)}`);
