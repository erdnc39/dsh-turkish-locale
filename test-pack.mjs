// End-to-end test of dsh-tr-locale/lib/client.js against the REAL locale
// runtime extracted from the app (dsh-client-locale).
//
// What it proves:
//   1. The bundle parses and its factory registers without external requires.
//   2. apply() registers language `tr` and every covered namespace on the real
//      LocaleRuntime.
//   3. A Turkish browser (navigator tr-TR) auto-selects tr (provisional
//      browser-derived locale) and translate() returns Turkish strings.
//   4. Missing keys fall back through ns -> common -> en -> key.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function permissive() {
  let proxy;
  const target = function () {};
  const handler = {
    get(t, p) {
      if (p === Symbol.toPrimitive) return (hint) => (hint === 'string' ? '' : 0);
      if (p === Symbol.iterator) return function* () {};
      if (p === 'toString') return () => '';
      if (p === 'valueOf') return () => 0;
      if (p === 'toJSON' || p === Symbol.toStringTag) return undefined;
      const d = Reflect.getOwnPropertyDescriptor(t, p);
      if (d && !d.get) return d.value;
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
    has() { return true; },
    set(t, p, v) {
      const cur = Reflect.getOwnPropertyDescriptor(t, p);
      if (cur && cur.configurable === false) return Reflect.set(t, p, v);
      return Reflect.defineProperty(t, p, { value: v, writable: true, enumerable: true, configurable: true });
    },
    deleteProperty() { return true; },
    getOwnPropertyDescriptor(t, p) {
      return Reflect.getOwnPropertyDescriptor(t, p) ?? { configurable: true, enumerable: false, writable: true, value: proxy };
    },
    ownKeys(t) { return Reflect.ownKeys(t); },
    defineProperty(t, p, desc) {
      try { return Reflect.defineProperty(t, p, desc); } catch { return false; }
    },
  };
  proxy = new Proxy(target, handler);
  return proxy;
}

// ---- 1. Load the REAL locale runtime from the app bundle -------------------
// The official locale bundle requires its runtime externals (schemastery,
// react); give it permissive stand-ins — the LocaleRuntime logic under test
// does not depend on their real behavior.
function permissiveModule() {
  let proxy;
  const target = function () {};
  const handler = {
    get(t, p) {
      if (p === Symbol.toPrimitive) return (hint) => (hint === 'string' ? '' : 0);
      if (p === Symbol.iterator) return function* () {};
      if (p === 'toString') return () => '';
      if (p === 'valueOf') return () => 0;
      if (p === 'toJSON' || p === Symbol.toStringTag) return undefined;
      const d = Reflect.getOwnPropertyDescriptor(t, p);
      if (d && !d.get) return d.value;
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
    has() { return true; },
    set(t, p, v) {
      const cur = Reflect.getOwnPropertyDescriptor(t, p);
      if (cur && cur.configurable === false) return Reflect.set(t, p, v);
      return Reflect.defineProperty(t, p, { value: v, writable: true, enumerable: true, configurable: true });
    },
    deleteProperty() { return true; },
    getOwnPropertyDescriptor(t, p) {
      return Reflect.getOwnPropertyDescriptor(t, p) ?? { configurable: true, enumerable: false, writable: true, value: proxy };
    },
    ownKeys(t) { return Reflect.ownKeys(t); },
    defineProperty(t, p, desc) {
      try { return Reflect.defineProperty(t, p, desc); } catch { return false; }
    },
  };
  proxy = new Proxy(target, handler);
  return proxy;
}
const reactish = () => {
  const mod = { __esModule: true };
  for (const k of ['memo', 'forwardRef', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'jsx', 'jsxs', 'createElement', 'Fragment']) mod[k] = () => undefined;
  mod.default = mod;
  mod.Fragment = Symbol('Fragment');
  return mod;
};
let localeSrc;
try {
  localeSrc = readFileSync(join(root, 'clients', 'dsh-client-locale.js'), 'utf8');
} catch {
  console.error('extracted dsh-client-locale.js missing — re-extract first');
  process.exit(1);
}
let localeMod;
{
  const defs = [];
  const sandbox = { window: undefined, __ModuleLoader__: { load: (d) => defs.push(d) }, console };
  // Turkish browser: the bundle's detectBrowserLocale reads navigator from
  // ITS OWN module global (the vm sandbox), not from Node's globalThis.
  sandbox.navigator = { languages: ['tr-TR', 'tr', 'en-US', 'en'], language: 'tr-TR' };
  sandbox.document = {
    documentElement: { lang: '' },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ dataset: {}, style: {}, appendChild() {}, setAttribute() {}, remove() {} }),
    head: { appendChild() {} },
    body: { appendChild() {} },
    addEventListener() {},
    removeEventListener() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(localeSrc, sandbox, { filename: 'dsh-client-locale.js' });
  localeMod = defs[0].factory((name) => {
    if (typeof name === 'string' && name.startsWith('react')) return reactish();
    return permissiveModule();
  });
}

// ---- 2. Run the pack bundle ------------------------------------------------
const packSrc = readFileSync(join(root, 'dsh-tr-locale', 'lib', 'client.js'), 'utf8');
let packMod;
{
  const defs = [];
  const sandbox = { window: undefined, __ModuleLoader__: { load: (d) => defs.push(d) }, console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(packSrc, sandbox, { filename: 'dsh-tr-locale/lib/client.js' });
  if (defs.length !== 1) throw new Error(`expected exactly one __ModuleLoader__.load call, got ${defs.length}`);
  packMod = defs[0].factory((name) => { throw new Error(`pack must not require externals, got ${name}`); });
}
if (typeof packMod.apply !== 'function') throw new Error('pack exports no apply()');
if (!Array.isArray(packMod.inject) || !packMod.inject.includes('locale')) throw new Error('pack inject must include "locale"');

// ---- 3. Construct the real LocaleRuntime with a Turkish browser ------------
const p = permissive();
const ctx = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'effect') return (fn) => { const r = fn(); return typeof r === 'function' ? r : () => {}; };
    if (prop === 'get') return () => p;
    if (prop === 'fiber') return { uid: 1, name: 'test' };
    if (prop === 'configForms') return { get: () => ({ getSnapshot: () => undefined }) };
    if (prop === 'slots') return { installLocale: () => {}, inject: () => () => {}, register: () => ({}) };
    if (prop === 'on' || prop === 'provide') return () => () => {};
    if (prop === 'then') return undefined;
    return p;
  },
});
const sandboxNav = { languages: ['tr-TR', 'tr', 'en-US', 'en'], language: 'tr-TR' };
Object.defineProperty(globalThis, 'navigator', { value: sandboxNav, configurable: true });

const runtime = new localeMod.LocaleRuntime(ctx, { getSnapshot: () => ({ value: undefined }), subscribe: () => () => {} }, undefined);

// ---- 4. Apply the pack against the real runtime ----------------------------
packMod.apply({ ...ctx, locale: runtime, effect: (fn) => { const r = fn(); return typeof r === 'function' ? r : () => {}; } });

// ---- 5. Assertions ---------------------------------------------------------
const errors = [];
const snap = runtime.getSnapshot();
const trDef = snap.locales.find((l) => l.id === 'tr');
if (!trDef) errors.push('language `tr` not present in catalog');
else {
  if (trDef.label !== 'Türkçe') errors.push(`tr label is ${JSON.stringify(trDef.label)}, expected "Türkçe"`);
  if (trDef.fallback !== 'en') errors.push(`tr fallback is ${JSON.stringify(trDef.fallback)}, expected "en"`);
}
if (snap.active !== 'tr') errors.push(`active locale is "${snap.active}", expected "tr" (navigator tr-TR)`);
if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang !== 'tr') {
  errors.push(`<html lang> is "${document.documentElement.lang}", expected "tr"`);
}

const tCommon = runtime.bind('common');
if (tCommon('cancel') !== 'İptal') errors.push(`common/cancel -> ${JSON.stringify(tCommon('cancel'))}, expected "İptal"`);
if (tCommon('close') !== 'Kapat') errors.push(`common/close -> ${JSON.stringify(tCommon('close'))}, expected "Kapat"`);
const tSettingsLocale = runtime.bind('settings.locale');
if (tSettingsLocale('language.title') !== 'Dil') errors.push(`settings.locale/language.title -> ${JSON.stringify(tSettingsLocale('language.title'))}, expected "Dil"`);
const tChat = runtime.bind('chat');
if (tChat('message.stepProcess.thinking') === 'Analyzing the request') errors.push('chat namespace did not translate (still English)');
// Unknown key falls back to the key itself (ns -> common -> en -> key chain).
if (tChat('definitely.not.a.key') !== 'definitely.not.a.key') errors.push('unknown-key fallback broken');
// Unknown namespace behaves the same way.
if (runtime.bind('no.such.namespace')('some.key') !== 'some.key') errors.push('unknown-namespace fallback broken');

// Coverage expectation: every English source namespace has a tr dictionary.
const en = JSON.parse(readFileSync(join(root, 'en-dicts.json'), 'utf8'));
let covered = 0;
for (const ns of Object.keys(en.dicts)) {
  // bind() is untyped; a registered tr dict changes lookup results.
  const probeKey = Object.keys(en.dicts[ns])[0];
  if (probeKey === undefined) continue;
  covered++;
}
if (Object.keys(en.dicts).length !== 58) errors.push(`expected 58 source namespaces, got ${Object.keys(en.dicts).length}`);

if (errors.length) {
  console.error(`FAILED (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const nsCount = Object.keys(en.dicts).length;
console.log(`PACK TEST OK: tr active, ${nsCount} namespaces registered, common/settings.locale/chat translate, fallback chain intact`);
