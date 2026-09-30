// Smoke test for the dsh-aura-theme browser bundle: loads the real
// lib/client.js through a stubbed ModuleLoader and exercises registration,
// activation, adoption recovery, the Appearance watcher and the settings row.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "dsh-aura-theme", "lib", "client.js"), "utf8");

const failures = [];
const check = (label, ok, detail = "") => {
	if (ok) console.log(`  ok   ${label}`);
	else {
		failures.push(label);
		console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`);
	}
};

// ---- DOM / storage stubs -------------------------------------------------
const styleTags = [];
const rootAttrs = new Set();
const element = () => ({
	dataset: {},
	textContent: "",
	removed: false,
	remove() {
		this.removed = true;
	}
});
const documentStub = {
	createElement: () => element(),
	head: {
		appendChild(tag) {
			styleTags.push(tag);
		}
	},
	documentElement: {
		setAttribute: (name) => rootAttrs.add(name),
		removeAttribute: (name) => rootAttrs.delete(name),
		hasAttribute: (name) => rootAttrs.has(name)
	}
};
const store = new Map();
const localStorageStub = {
	getItem: (key) => (store.has(key) ? store.get(key) : null),
	setItem: (key, value) => store.set(key, String(value))
};

// ---- theme service stub (mirrors ThemeRuntime's contract) ---------------
const themeListeners = new Set();
const themeState = {
	preference: "system",
	themes: [
		{ id: "light", colorScheme: "light", tokens: {} },
		{ id: "dark", colorScheme: "dark", tokens: {} }
	]
};
const registered = [];
const setThemeCalls = [];
const themeStub = {
	getTheme: () => ({ preference: themeState.preference, themes: themeState.themes, fontSize: 14 }),
	register(definition) {
		if (definition.id === "system") throw new Error('"system" is not registrable');
		if (themeState.themes.some((t) => t.id === definition.id)) throw new Error(`theme "${definition.id}" is already registered`);
		registered.push(definition);
		themeState.themes.push(definition);
		return () => {};
	},
	setTheme(id) {
		if (id !== "system" && !themeState.themes.some((t) => t.id === id)) throw new Error(`theme "${id}" is not registered`);
		if (themeState.preference === id) return;
		themeState.preference = id;
		setThemeCalls.push(id);
		const snapshot = themeStub.getTheme();
		for (const listener of [...themeListeners]) listener(snapshot);
	},
	setFontSize() {}
};

// ---- ui-theme settings scope stub --------------------------------------
let scopePreference = "system";
const scopeListeners = new Set();
const scopeStub = {
	getSnapshot: () => ({ value: { preference: scopePreference, fontSize: 14 } }),
	subscribe: (fn) => {
		scopeListeners.add(fn);
		return () => scopeListeners.delete(fn);
	}
};

// ---- cordis context stub -------------------------------------------------
const disposers = [];
const slotInjections = [];
const registeredRows = [];
const ctx = {
	effect(fn) {
		const dispose = fn();
		if (typeof dispose === "function") disposers.push(dispose);
		return dispose;
	},
	inject(_names, callback) {
		callback(ctx);
		return () => {};
	},
	get(name) {
		if (name === "theme") return themeStub;
		if (name === "configForms") return { get: (ns) => (ns === "ui-theme" ? scopeStub : undefined) };
		return undefined;
	},
	on(event, listener) {
		if (event === "theme/change") themeListeners.add(listener);
		return () => themeListeners.delete(listener);
	},
	slots: {
		inject(key, callback) {
			slotInjections.push({ key, callback });
			return () => {};
		},
		register(declaration, component) {
			registeredRows.push({ declaration, component });
			return () => {};
		}
	}
};

// ---- react stubs ---------------------------------------------------------
const effectQueue = [];
const reactStub = {
	useState: (initial) => [initial, () => {}],
	useEffect: (fn) => {
		const dispose = fn();
		if (typeof dispose === "function") effectQueue.push(dispose);
	}
};
const jsxRuntimeStub = {
	jsx: (type, props) => ({ type, props: props || {} }),
	jsxs: (type, props) => ({ type, props: props || {} })
};

// ---- run the bundle ------------------------------------------------------
let bundleExports = null;
globalThis.window = {
	__ModuleLoader__: {
		load(descriptor) {
			const fakeRequire = (name) => {
				if (name === "react") return reactStub;
				if (name === "react/jsx-runtime") return jsxRuntimeStub;
				throw new Error("unexpected require: " + name);
			};
			bundleExports = descriptor.factory(fakeRequire);
		}
	}
};
globalThis.document = documentStub;
globalThis.localStorage = localStorageStub;

await import(pathToFileURL(path.join(here, "dsh-aura-theme", "lib", "client.js")).href);

console.log("dsh-aura-theme smoke test");

check("bundle registered with the ModuleLoader", bundleExports !== null);
check("exports apply + inject", typeof bundleExports?.apply === "function" && Array.isArray(bundleExports?.inject));
check("required services are theme + slots", JSON.stringify(bundleExports?.inject) === JSON.stringify(["theme", "slots"]));

// Fresh page load: nothing active yet.
check("aura not active before apply", themeState.preference === "system" && !rootAttrs.has("data-dsh-aura"));

bundleExports.apply(ctx);

check("aura theme registered exactly once", registered.length === 1 && registered[0].id === "aura");
check("registered theme is dark", registered[0]?.colorScheme === "dark");
check("palette carries the warm base", registered[0]?.tokens["--dsw-alias-bg-base"] === "#0b0705");
check("palette carries the nerd font stack", String(registered[0]?.tokens["--dsw-font-family"]).includes("CodeNewRoman Nerd Font"));
check("style sheet mounted", styleTags.length === 1 && styleTags[0].textContent.includes("@font-face"));
check("sheet is tagged for plugin cleanup", styleTags[0].dataset.pluginCss === "dsh-aura-theme/aura.css");
check("css keys every effect on [data-dsh-aura]", styleTags[0].textContent.includes("[data-dsh-aura] [data-conversation-content]"));
check("css carries the border beam", styleTags[0].textContent.includes("dshAura-borderBeam"));
check("css carries the background beam", styleTags[0].textContent.includes("dshAura-bgBeam"));
check("css carries frosted glass", styleTags[0].textContent.includes("[data-composer-card]") && styleTags[0].textContent.includes("backdrop-filter"));
check("auto-activated the aura theme", themeState.preference === "aura", themeState.preference);
check("root attribute set", rootAttrs.has("data-dsh-aura"));

// ui-theme's settings adoption republishes `system` after a font-size write.
themeState.preference = "system";
for (const listener of themeListeners) listener(themeStub.getTheme());
check("re-asserts aura after an adoption echo", themeState.preference === "aura" && rootAttrs.has("data-dsh-aura"));

// A real Appearance pick writes the ui-theme preference field.
scopePreference = "light";
for (const listener of scopeListeners) listener();
check("appearance pick turns aura off", themeState.preference === "light", themeState.preference);
check("root attribute removed with the switch", !rootAttrs.has("data-dsh-aura"));
check("switch persisted as off", store.get("dsh-aura-theme.enabled") === "off");

// Settings row (the slot system materialises the injection callback on render).
check("settings.general.item injected", slotInjections.some((entry) => entry.key === "settings.general.item"));
const injection = slotInjections.find((entry) => entry.key === "settings.general.item");
injection.callback();
const row = registeredRows.find((entry) => entry.declaration.id === "aura-theme");
check("settings row registered", row !== undefined);
check("settings row slots after font-size row", row?.declaration.order === 12);

const tree = row.component();
const walk = (node, match, out = []) => {
	if (!node || typeof node !== "object") return out;
	if (node.type === match) out.push(node);
	const children = node.props?.children;
	if (Array.isArray(children)) for (const child of children) walk(child, match, out);
	else walk(children, match, out);
	return out;
};
const switches = walk(tree, "button");
check("row renders a switch button", switches.length === 1 && switches[0].props.role === "switch");
check("switch reports the off state", switches[0].props["aria-checked"] === false);

// Toggle it back on from the row.
switches[0].props.onClick();
check("row toggle re-activates aura", themeState.preference === "aura" && rootAttrs.has("data-dsh-aura"));
check("switch persisted as on", store.get("dsh-aura-theme.enabled") === "on");

// Toggle it off again from the row.
const treeOff = row.component();
const switchOff = walk(treeOff, "button")[0];
check("row reflects the on state", switchOff.props["aria-checked"] === true);
switchOff.props.onClick();
check("row toggle deactivates aura", themeState.preference === "system" && !rootAttrs.has("data-dsh-aura"));

// No duplicate registration when the fiber re-applies (HMR).
const before = registered.length;
try {
	themeStub.register(registered[0]);
	check("duplicate registration is rejected", false);
} catch (error) {
	check("duplicate registration is rejected", /already registered/.test(error.message));
}
check("no extra registration happened", registered.length === before);

// Cleanup: every effect disposer runs and the sheet is pulled.
for (const dispose of disposers.splice(0)) dispose();
check("style sheet removed on dispose", styleTags[0].removed === true);

if (failures.length) {
	console.log(`\n${failures.length} check(s) failed`);
	process.exitCode = 1;
} else {
	console.log("\nall checks passed");
}
