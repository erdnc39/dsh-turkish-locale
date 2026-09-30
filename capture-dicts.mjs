// Capture the `en` locale dictionaries every DSH client bundle registers.
//
// Runs each extracted lib/client.js in an isolated vm context with a permissive
// DOM/service mock, invokes its exported apply(ctx) with a spy ctx whose
// ctx.locale.register / addLanguage calls are recorded, and writes the
// collected { namespace -> en dictionary } map as JSON.
import vm from 'node:vm';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const clientsDir = process.argv[2];
const extraFiles = process.argv.slice(3);
const outFile = process.argv[3] && process.argv[3].startsWith('-') ? process.argv[4] : process.argv[3];
const out = process.argv[process.argv.indexOf('--out') + 1];

function permissive() {
  let proxy;
  const target = function () {};
  const handler = {
    get(t, p) {
      if (p === Symbol.toPrimitive) return (hint) => (hint === 'string' ? '' : 0);
      if (p === Symbol.iterator) return function* () {};
      if (p === 'toString') return () => '';
      if (p === 'valueOf') return () => 0;
      if (p === 'toJSON' || p === Symbol.toStringTag || p === Symbol.hasInstance) return undefined;
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
      const d = Reflect.getOwnPropertyDescriptor(t, p);
      if (d) return d;
      return { configurable: true, enumerable: false, writable: true, value: proxy };
    },
    ownKeys(t) { return Reflect.ownKeys(t); },
    defineProperty(t, p, desc) {
      try { return Reflect.defineProperty(t, p, desc); } catch { return false; }
    },
  };
  proxy = new Proxy(target, handler);
  return proxy;
}

function makeSandbox(record) {
  const defs = [];
  const sandbox = {};
  const p = permissive();
  Object.assign(sandbox, {
    __ModuleLoader__: { load: (def) => defs.push(def) },
    navigator: { languages: ['en-US', 'en'], language: 'en-US', userAgent: 'Mozilla/5.0 capture', platform: 'Win32', maxTouchPoints: 0 },
    location: { href: 'http://127.0.0.1:19387/', origin: 'http://127.0.0.1:19387', protocol: 'http:', host: '127.0.0.1:19387', hostname: '127.0.0.1', port: '19387', pathname: '/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 },
    document: p,
    getComputedStyle: () => p,
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    queueMicrotask: () => {},
    fetch: () => new Promise(() => {}),
    WebSocket: function () { return p; },
    Event: function () {},
    EventTarget: function () {},
    CustomEvent: function () {},
    HTMLElement: function () {},
    Element: function () {},
    Node: function () {},
    ResizeObserver: function () { this.observe = () => {}; this.unobserve = () => {}; this.disconnect = () => {}; },
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
    IntersectionObserver: function () { this.observe = () => {}; this.unobserve = () => {}; this.disconnect = () => {}; },
    customElements: { define() {}, get: () => undefined, whenDefined: () => new Promise(() => {}) },
    history: { pushState() {}, replaceState() {}, back() {}, go() {}, forward() {} },
    devicePixelRatio: 1,
    screen: { width: 1920, height: 1080 },
    alert: () => {},
    confirm: () => true,
    prompt: () => '',
    process: { env: { NODE_ENV: 'production' }, platform: 'browser', nextTick: (fn) => { try { fn(); } catch {} }, cwd: () => '/' },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    crypto: globalThis.crypto,
    TextEncoder, TextDecoder, URL, URLSearchParams, AbortController, AbortSignal, structuredClone,
    console,
    performance: globalThis.performance,
    setTimeoutOuter: setTimeout,
    __record: record,
    __defs: defs,
  });
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function makeCtx(record) {
  const p = permissive();
  const locale = {
    register(ns, a, b) {
      try {
        if (typeof a === 'string') {
          if (a === 'en' && b && typeof b === 'object') record.dicts[ns] = { ...(record.dicts[ns] ?? {}), ...b };
          if (typeof a === 'string') record.registrations.push({ ns, locale: a });
        } else if (a && typeof a === 'object') {
          for (const [loc, dict] of Object.entries(a)) {
            if (loc === 'en' && dict && typeof dict === 'object') record.dicts[ns] = { ...(record.dicts[ns] ?? {}), ...dict };
            record.registrations.push({ ns, locale: loc });
          }
        }
      } catch {}
      return () => {};
    },
    addLanguage(lang) { record.languages.push(lang); return () => {}; },
    getSnapshot: () => ({ active: 'en', locales: [], revision: 1 }),
    getLocale: () => ({ active: 'en', locales: [], revision: 1 }),
    subscribe: () => () => {},
    setLocale: () => {},
    bind: () => (key) => key,
    resolveText: (t) => t,
  };
  const ctx = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'locale') return locale;
      if (prop === 'effect') return (fn) => { try { fn(); } catch {} return () => {}; };
      if (prop === 'provide' || prop === 'on' || prop === 'emit') return () => () => {};
      if (prop === 'get') return () => p;
      if (prop === 'fiber') return { uid: 1, name: 'capture' };
      if (prop === 'config') return {};
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'then') return undefined;
      return p;
    },
  });
  return ctx;
}

// Real (copyable) React stubs: bundles compiled from ESM wrap `require("react")`
// in __toESM, which copies own enumerable properties onto a plain object — a
// permissive proxy exposes none, so named imports (memo, useState, ...) arrive
// undefined and top-level `memo(...)` calls throw. Provide a plain object with
// every commonly used export as a callable no-op.
const REACT_EXPORTS = [
  'memo', 'forwardRef', 'lazy', 'createElement', 'cloneElement', 'createContext',
  'createRef', 'isValidElement', 'use', 'startTransition',
  'useState', 'useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useRef',
  'useMemo', 'useCallback', 'useContext', 'useReducer', 'useImperativeHandle',
  'useId', 'useSyncExternalStore', 'useTransition', 'useDeferredValue', 'useDebugValue',
  'useOptimistic', 'useActionState', 'useFormStatus',
];
const reactModule = { __esModule: true };
for (const k of REACT_EXPORTS) reactModule[k] = () => undefined;
reactModule.Fragment = Symbol('Fragment');
reactModule.StrictMode = 'StrictMode';
reactModule.Suspense = 'Suspense';
reactModule.default = reactModule;
reactModule.version = '18.0.0';
const reactClass = class {};
reactClass.prototype.isReactComponent = {};
reactModule.Component = reactClass;
reactModule.PureComponent = reactClass;
const jsxRuntime = {
  __esModule: true,
  jsx: () => undefined,
  jsxs: () => undefined,
  jsxDEV: () => undefined,
  Fragment: Symbol('Fragment'),
};
reactModule.jsx = jsxRuntime.jsx;
reactModule.jsxs = jsxRuntime.jsxs;
function reactStub(name) {
  if (name === 'react') return reactModule;
  if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return jsxRuntime;
  if (name === 'react-dom' || name === 'react-dom/client') return { __esModule: true, default: {} };
  return undefined;
}

const files = readdirSync(clientsDir).filter((f) => f.endsWith('.js'));
const report = { dicts: {}, languages: [], registrations: [], errors: [] };

process.on('unhandledRejection', (err) => {
  report.errors.push({ file: '(async)', stage: 'unhandledRejection', error: String(err && err.message || err) });
});
process.on('uncaughtException', (err) => {
  report.errors.push({ file: '(async)', stage: 'uncaughtException', error: String(err && err.message || err) });
});

for (const file of files) {
  const src = readFileSync(join(clientsDir, file), 'utf8');
  const record = { dicts: {}, languages: [], registrations: [] };
  const sandbox = makeSandbox(record);
  const ctxObj = vm.createContext(sandbox);
  try {
    vm.runInContext(src, ctxObj, { filename: file, timeout: 5000 });
  } catch (e) {
    report.errors.push({ file, stage: 'factory', error: String(e && e.message || e) });
    continue;
  }
  const defs = sandbox.__defs;
  for (const def of defs) {
    if (typeof def.factory !== 'function') continue;
    let mod;
    try {
      mod = def.factory((name) => reactStub(name) ?? permissive());
    } catch (e) {
      report.errors.push({ file, stage: 'factory-run', error: String(e && e.message || e) });
      continue;
    }
    if (!mod || typeof mod.apply !== 'function') continue;
    const ctx = makeCtx(record);
    try {
      const r = mod.apply(ctx);
      if (r && typeof r.then === 'function') {
        // give async apply a short window to reach its register calls
        Promise.race([r.catch(() => {}), new Promise((res) => setTimeout(res, 120))]);
      }
    } catch (e) {
      report.errors.push({ file, stage: 'apply', error: String(e && e.message || e) });
    }
  }
  for (const [ns, dict] of Object.entries(record.dicts)) {
    report.dicts[ns] = { ...(report.dicts[ns] ?? {}), ...dict };
  }
  report.languages.push(...record.languages);
  report.registrations.push(...record.registrations.map((r) => ({ ...r, file })));
}

writeFileSync(out, JSON.stringify(report, null, 1));
const nsCount = Object.keys(report.dicts).length;
const keyCount = Object.values(report.dicts).reduce((n, d) => n + Object.keys(d).length, 0);
console.log(`files=${files.length} namespaces=${nsCount} enKeys=${keyCount} errors=${report.errors.length}`);
if (report.errors.length) console.log(JSON.stringify(report.errors.slice(0, 12), null, 1));
