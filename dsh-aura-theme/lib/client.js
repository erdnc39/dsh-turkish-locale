window.__ModuleLoader__.load({
	id: "dsh-aura-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");

		//#region identity
		/** Package / bundle id (matches package.json `name`). */
		const PLUGIN_ID = "dsh-aura-theme";
		/** Registry id of the theme this plugin registers with ui-theme. */
		const THEME_ID = "aura";
		/** Color scheme carried by the Aura theme; the palette is built for it. */
		const THEME_COLOR_SCHEME = "dark";
		/** Root attribute the stylesheet keys every Aura rule on. */
		const AURA_ATTRIBUTE = "data-dsh-aura";
		/** Durable switch state (localStorage key; absent means "on"). */
		const ENABLED_STORAGE_KEY = "dsh-aura-theme.enabled";
		/** Settings namespace owned by ui-theme (read-only watch target). */
		const UI_THEME_SETTINGS = "ui-theme";
		/** Font family the whole Aura palette renders with. */
		const AURA_FONT = "CodeNewRoman Nerd Font";
		//#endregion

		//#region palette
		/**
		* Warm orange-on-black stack used for body copy and for code. The two
		* woff2 sources are a jsDelivr mirror first and Raw GitHub second (the
		* upstream catalog documents Raw GitHub as the supported fallback); a
		* locally installed copy always wins, so an offline machine still gets
		* the font when the user has it.
		*/
		const AURA_FONT_STACK = '"' + AURA_FONT + '", ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace';
		const AURA_CODE_STACK = '"' + AURA_FONT + '", "SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", monospace';

		/**
		* Alias-layer overrides registered as the `aura` theme. Values are plain
		* CSS values (the registry's registered-theme contract), picked for the
		* theme's `colorScheme`; the ui-layout ThemePresenter writes them onto
		* `body` as custom properties and retracts them when the theme changes.
		*/
		const AURA_TOKENS = {
			/* --- canvas: warm near-black, layered upward ------------------- */
			"--dsw-alias-bg-base": "#0b0705",
			"--dsw-alias-bg-layer-1": "#150f09",
			"--dsw-alias-bg-layer-2": "#1d150d",
			"--dsw-alias-bg-layer-3": "#261c11",
			"--dsw-alias-bg-overlay": "#1a130bf5",
			"--dsw-alias-bg-module-platform": "#1b140c",
			"--dsw-alias-bg-skeleton": "#2a1e1280",

			/* --- borders: every hairline carries a little ember ------------ */
			"--dsw-alias-border-l1": "#ff8a1f1f",
			"--dsw-alias-border-l2": "#ff8a1f33",
			"--dsw-alias-border-l3": "#ff8a1f4d",
			"--dsw-alias-border-l4": "#ffb06666",

			/* --- labels: warm paper, never pure grey ----------------------- */
			"--dsw-alias-label-primary": "#f8ede2",
			"--dsw-alias-label-secondary": "#dcc9b5",
			"--dsw-alias-label-tertiary": "#ab947d",
			"--dsw-alias-label-caption": "#83705c",
			"--dsw-alias-label-dimmed": "#655342",

			/* --- brand / primary actions ---------------------------------- */
			"--dsw-alias-brand-primary": "#ff8a1f",
			"--dsw-alias-brand-primary-invert": "#160d05",
			"--dsw-alias-button-primary-fill": "#ff8a1f",
			"--dsw-alias-button-primary-hover": "#ffa149",
			"--dsw-alias-button-primary-dimmed": "#ff8a1f33",
			"--dsw-alias-button-floating-fill": "#1e160d",
			"--dsw-alias-button-floating-hover": "#2b2013",
			"--dsw-alias-button-elevated-fill": "#1e160d",
			"--dsw-alias-state-business-primary": "#ff9a3c",
			"--dsw-alias-state-business-tertiary": "#ff8a1f1f",
			"--dsw-alias-link": "#ff9d47",
			"--dsw-alias-interactive-bg-hover": "#ff8a1f1f",
			"--dsw-alias-interactive-bg-hover-solid": "#261c11",
			"--dsw-alias-interactive-bg-active": "#ff8a1f33",

			/* --- markdown / code ----------------------------------------- */
			"--dsw-alias-markdown-code-block": "#120c07",
			"--dsw-alias-markdown-inline-code": "#2c1d0d",
			"--dsw-alias-markdown-code-segment-selected": "#ff8a1f3d",
			"--dsw-alias-markdown-code-segment-unselected": "#ffffff0a",

			/* --- states ---------------------------------------------------- */
			"--dsw-alias-state-warn-primary": "#ffa149",
			"--dsw-alias-state-warn-secondary": "#ff8a1f33",
			"--dsw-alias-state-error-primary": "#ff6b4a",
			"--dsw-alias-state-error-secondary": "#ff6b4a33",
			"--dsw-alias-state-success-primary": "#63d6a0",
			"--dsw-alias-state-success-secondary": "#63d6a033",
			"--dsw-alias-state-idle-primary": "#a58e75",

			/* --- glass surfaces (menus, sidebar, cards) --------------------- */
			"--dsw-specific-sidebar-fill": "#100b07eb",
			"--dsw-specific-menu": "#17110bf2",
			"--dsw-alias-toast-bg": "#1d150df5",
			"--dsw-alias-toast-label": "#f8ede2",
			"--dsw-alias-tooltip-bg": "#221909f7",
			"--dsw-alias-menu-group-header-fill": "#241a10",
			"--dsw-menu-backdrop-filter": "blur(26px) saturate(165%)",

			/* --- scrollbars ------------------------------------------------ */
			"--dsw-alias-scrollbar-bg-l1": "#4a3520",
			"--dsw-alias-scrollbar-bg-l2": "#3a2917",
			"--dsw-alias-scrollbar-hover-l1": "#ff8a1f80",
			"--dsw-alias-scrollbar-hover-l2": "#ff8a1fa6",

			/* --- typography ------------------------------------------------ */
			"--dsw-font-family": AURA_FONT_STACK,
			"--ds-font-family-code": AURA_CODE_STACK
		};
		//#endregion

		//#region styles
		const PLUGIN_STYLE_TAG = PLUGIN_ID + "/aura.css";
		const AURA_CSS = `
/* ============================================================
   AURA · CodeNewRoman Nerd Font
   Remote sources: jsDelivr mirror first, Raw GitHub second.
   Both faces are skipped when a local copy exists.
   ============================================================ */
@font-face{
	font-family:"${AURA_FONT}";
	font-style:normal;
	font-weight:400;
	font-display:swap;
	src:local("${AURA_FONT} Regular"),local("${AURA_FONT}"),local("CodeNewRomanNerdFont-Regular"),
		url("https://cdn.jsdelivr.net/gh/Nick2bad4u/nerd-fonts-woff2@main/fonts/woff2/CodeNewRoman/CodeNewRomanNerdFont-Regular.woff2") format("woff2"),
		url("https://raw.githubusercontent.com/Nick2bad4u/nerd-fonts-woff2/main/fonts/woff2/CodeNewRoman/CodeNewRomanNerdFont-Regular.woff2") format("woff2");
}
@font-face{
	font-family:"${AURA_FONT}";
	font-style:normal;
	font-weight:700;
	font-display:swap;
	src:local("${AURA_FONT} Bold"),local("CodeNewRomanNerdFont-Bold"),
		url("https://cdn.jsdelivr.net/gh/Nick2bad4u/nerd-fonts-woff2@main/fonts/woff2/CodeNewRoman/CodeNewRomanNerdFont-Bold.woff2") format("woff2"),
		url("https://raw.githubusercontent.com/Nick2bad4u/nerd-fonts-woff2/main/fonts/woff2/CodeNewRoman/CodeNewRomanNerdFont-Bold.woff2") format("woff2");
}

/* ============================================================
   Animatable beam angle (registered custom property, Chromium+)
   ============================================================ */
@property --dsh-aura-beam-angle{
	syntax:"<angle>";
	inherits:false;
	initial-value:0deg;
}
[data-dsh-aura]{
	--dsh-aura-orange:#ff8a1f;
	--dsh-aura-ember:#ff6b2c;
	--dsh-aura-gold:#ffc06a;
	--dsh-aura-ink:#0b0705;
}

/* ============================================================
   1 · CHAT WINDOW — travelling border beam
   An inset conic ring masked to a 1.6px stroke and rotated by an
   animated registered angle. It lives in the 10px gutter, so it
   never crosses message text, the scrollbar or the composer.
   ============================================================ */
[data-dsh-aura] [data-conversation-content]{
	--dsh-aura-ring-inset:10px;
	box-shadow:inset 0 0 0 .5px rgba(255,138,31,.14);
}
[data-dsh-aura] [data-conversation-content]::before{
	content:"";
	position:absolute;
	inset:var(--dsh-aura-ring-inset);
	box-sizing:border-box;
	border-radius:18px;
	padding:1.6px;
	background:conic-gradient(from var(--dsh-aura-beam-angle),
		rgba(255,138,31,0) 0turn,
		rgba(255,138,31,0) .56turn,
		rgba(255,107,44,.18) .65turn,
		rgba(255,192,106,.95) .75turn,
		rgba(255,107,44,.85) .82turn,
		rgba(255,138,31,0) .93turn,
		rgba(255,138,31,0) 1turn);
	-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
	mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
	-webkit-mask-composite:xor;
	mask-composite:exclude;
	filter:drop-shadow(0 0 6px rgba(255,138,31,.45));
	pointer-events:none;
	animation:dshAura-borderBeam 6.5s linear infinite;
}
@keyframes dshAura-borderBeam{
	to{--dsh-aura-beam-angle:360deg}
}

/* ============================================================
   2 · CHAT WINDOW — sweeping background beam
   Painted as background layers of the scroller itself, so the beam
   always sits behind messages and never steals a stacking context.
   ============================================================ */
[data-dsh-aura] [data-conversation-scroll]{
	background-image:
		radial-gradient(120% 42% at 50% 0%,rgba(255,138,31,.10),rgba(255,138,31,0) 68%),
		linear-gradient(112deg,
			rgba(255,138,31,0) 40%,
			rgba(255,140,50,.07) 46%,
			rgba(255,200,130,.13) 50%,
			rgba(255,140,50,.07) 54%,
			rgba(255,138,31,0) 60%);
	background-repeat:no-repeat,no-repeat;
	background-size:100% 100%,300% 100%;
	background-position:0 0,0% 0;
	animation:dshAura-bgBeam 12s ease-in-out infinite;
}
@keyframes dshAura-bgBeam{
	0%{background-position:0 0,0% 0}
	50%{background-position:0 0,100% 0}
	100%{background-position:0 0,0% 0}
}

/* ============================================================
   3 · FROSTED GLASS — composer card floating over the beam
   ============================================================ */
[data-dsh-aura] [data-composer-card]{
	background:linear-gradient(180deg,rgba(30,21,13,.78),rgba(18,12,7,.84));
	-webkit-backdrop-filter:blur(20px) saturate(160%);
	backdrop-filter:blur(20px) saturate(160%);
	border:1px solid rgba(255,138,31,.22);
	box-shadow:
		0 18px 44px -22px rgba(255,110,20,.55),
		inset 0 1px 0 rgba(255,255,255,.06);
}

/* ---- frosted glass: sidebar column ---- */
[data-dsh-aura] [data-slot="sidebar"] > *{
	-webkit-backdrop-filter:blur(24px) saturate(150%);
	backdrop-filter:blur(24px) saturate(150%);
}

/* ---- frosted glass: floating menu material ---- */
[data-dsh-aura] [data-menu-material]{
	-webkit-backdrop-filter:blur(26px) saturate(170%);
	backdrop-filter:blur(26px) saturate(170%);
}

/* ============================================================
   4 · WARM SYNTAX (shiki) — the base sheet declares these on
   :root / body[data-ds-dark-theme]; this selector outranks both.
   ============================================================ */
[data-dsh-aura] body{
	--shiki-token-constant:#ffb066;
	--shiki-token-string:#ffd08a;
	--shiki-token-comment:#9a8672;
	--shiki-token-keyword:#ff8a4c;
	--shiki-token-parameter:#ffa149;
	--shiki-token-function:#ffbe6b;
	--shiki-token-string-expression:#ffd08a;
	--shiki-token-punctuation:#c9b39c;
	--shiki-token-link:#ff9d47;
	--shiki-foreground:#f8ede2;
}

/* ---- warm text selection everywhere ---- */
[data-dsh-aura] ::selection{
	background:rgba(255,138,31,.32);
	color:#fff6ec;
}

/* ============================================================
   5 · SETTINGS → GENERAL · Aura toggle row
   Static (non-hashed) class names owned by this plugin.
   ============================================================ */
.dshAura_row{
	border-bottom:.5px solid var(--dsw-alias-border-l2);
	align-items:center;
	gap:8px;
	padding:16px 0;
	display:flex;
}
.dshAura_rowText{
	flex-direction:column;
	flex:1;
	gap:4px;
	min-width:0;
	padding-right:48px;
	display:flex;
}
.dshAura_title{
	color:var(--dsw-alias-label-primary);
	font-size:14px;
	font-weight:400;
	line-height:22px;
}
.dshAura_desc{
	color:var(--dsw-alias-label-tertiary);
	font-size:12px;
	font-weight:400;
	line-height:18px;
}
.dshAura_control{
	align-items:center;
	gap:10px;
	display:inline-flex;
}
.dshAura_state{
	color:var(--dsw-alias-label-secondary);
	font-size:12px;
	line-height:18px;
	min-width:46px;
	text-align:right;
}
.dshAura_switch{
	position:relative;
	box-sizing:border-box;
	width:44px;
	height:26px;
	padding:0;
	border-radius:999px;
	border:.5px solid var(--dsw-alias-border-l3);
	background:var(--dsw-alias-bg-module-platform);
	cursor:pointer;
	transition:background-color .16s var(--ds-ease-in-out),border-color .16s var(--ds-ease-in-out);
}
.dshAura_switchOn{
	background:linear-gradient(180deg,#ff9a3c,#ff7a12);
	border-color:#ffb066;
}
.dshAura_knob{
	position:absolute;
	top:2px;
	left:2px;
	width:20px;
	height:20px;
	border-radius:50%;
	background:#f6ece2;
	box-shadow:0 1px 3px rgba(0,0,0,.45);
	transition:transform .16s var(--ds-ease-in-out);
}
.dshAura_switchOn .dshAura_knob{
	transform:translateX(18px);
}
.dshAura_switch:focus-visible{
	outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));
	outline-offset:2px;
}

/* ============================================================
   6 · MOTION SAFETY
   ============================================================ */
@media (prefers-reduced-motion:reduce){
	[data-dsh-aura] [data-conversation-content]::before{
		animation:none;
		background:conic-gradient(from 210deg,
			rgba(255,138,31,0) 0turn,
			rgba(255,138,31,0) .6turn,
			rgba(255,192,106,.7) .75turn,
			rgba(255,138,31,0) .9turn,
			rgba(255,138,31,0) 1turn);
	}
	[data-dsh-aura] [data-conversation-scroll]{
		animation:none;
	}
}
`;
		//#endregion

		//#region state
		/** In-page switch state; localStorage keeps it across reloads. */
		const aura = {
			enabled: readEnabled(),
			listeners: new Set()
		};
		/** Live theme service handle (set once ui-theme answers the inject). */
		let themeService = null;
		/** Stops re-assert spam when the theme could not be registered. */
		let reassertBlocked = false;

		function readEnabled() {
			try {
				const raw = localStorage.getItem(ENABLED_STORAGE_KEY);
				return raw === null ? true : raw !== "off";
			} catch (error) {
				return true;
			}
		}
		function persistEnabled(value) {
			try {
				localStorage.setItem(ENABLED_STORAGE_KEY, value ? "on" : "off");
			} catch (error) {}
		}
		/** @returns disposer for one settings-row subscriber. */
		function subscribeAura(listener) {
			aura.listeners.add(listener);
			return () => {
				aura.listeners.delete(listener);
			};
		}
		function notifyAura() {
			for (const listener of [...aura.listeners]) {
				try {
					listener(aura.enabled);
				} catch (error) {}
			}
		}
		function setAuraEnabled(value) {
			if (aura.enabled === value) return;
			aura.enabled = value;
			persistEnabled(value);
			notifyAura();
		}
		/** Mirror the active theme onto the root attribute the stylesheet keys on. */
		function setAuraAttribute(active) {
			if (typeof document === "undefined") return;
			const root = document.documentElement;
			if (active) root.setAttribute(AURA_ATTRIBUTE, "");
			else root.removeAttribute(AURA_ATTRIBUTE);
		}
		function setThemePreference(id) {
			if (!themeService) return;
			try {
				themeService.setTheme(id);
			} catch (error) {
				reassertBlocked = true;
				console.warn("[" + PLUGIN_ID + "] " + (error && error.message ? error.message : error));
			}
		}
		/**
		* Keep the document and the preference in step with the snapshot:
		* toggle the root attribute, and — while the switch is on — pull the
		* preference back to `aura` whenever ui-theme's settings adoption
		* dropped it (font-size writes publish a `system` snapshot).
		*/
		function applySnapshot(snapshot) {
			if (!snapshot) return;
			const active = snapshot.preference === THEME_ID;
			setAuraAttribute(active);
			if (aura.enabled && !active && !reassertBlocked) setThemePreference(THEME_ID);
		}
		/** Settings-row click: flip the switch and follow it with the preference. */
		function toggleAura() {
			setAuraEnabled(!aura.enabled);
			if (aura.enabled) {
				reassertBlocked = false;
				setThemePreference(THEME_ID);
			} else {
				setThemePreference("system");
			}
		}
		//#endregion

		//#region settings row
		/**
		* Settings -> General row: a switch that owns the Aura preference.
		* Plain React local state fed by the plugin's own emitter, so the row
		* needs no store, no locale namespace and no slot-inject contract.
		* @returns the row element tree.
		*/
		function AuraThemeRow() {
			const [enabled, setEnabled] = react.useState(aura.enabled);
			react.useEffect(() => subscribeAura(setEnabled), []);
			return react_jsx_runtime.jsxs("div", {
				className: "dshAura_row",
				children: [react_jsx_runtime.jsxs("div", {
					className: "dshAura_rowText",
					children: [react_jsx_runtime.jsx("div", {
						className: "dshAura_title",
						children: "Aura Teması"
					}), react_jsx_runtime.jsx("div", {
						className: "dshAura_desc",
						children: "Buzlu cam · turuncu–siyah sıcak palet · sohbet ışın efektleri · CodeNewRoman Nerd Font"
					})]
				}), react_jsx_runtime.jsxs("div", {
					className: "dshAura_control",
					children: [react_jsx_runtime.jsx("span", {
						className: "dshAura_state",
						children: enabled ? "Açık" : "Kapalı"
					}), react_jsx_runtime.jsx("button", {
						type: "button",
						role: "switch",
						"aria-checked": enabled,
						"aria-label": "Aura teması",
						className: "dshAura_switch" + (enabled ? " dshAura_switchOn" : ""),
						onClick: toggleAura,
						children: react_jsx_runtime.jsx("span", { className: "dshAura_knob" })
					})]
				})]
			});
		}
		//#endregion

		//#region styles
		/**
		* Mount the Aura sheet for exactly the owning plugin lifetime. Every
		* effect rule is scoped by [data-dsh-aura]; only the @font-face rules
		* are global, and they load on first use.
		* @param ctx - owning client context.
		*/
		function installAuraStyles(ctx) {
			if (typeof document === "undefined") return;
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = PLUGIN_ID;
				tag.dataset.pluginCss = PLUGIN_STYLE_TAG;
				tag.textContent = AURA_CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, PLUGIN_ID + ": stylesheet");
		}
		//#endregion

		//#region plugin
		/** Required services: the theme registry and the slot system. */
		const inject = ["theme", "slots"];

		/**
		* Client plugin body: mount the sheet, register the `aura` theme,
		* follow `theme/change`, watch ui-theme's preference writes so an
		* explicit Light/Dark/System pick leaves Aura behind, and add the
		* Settings -> General toggle row.
		* @param ctx - client cordis context.
		*/
		function apply(ctx) {
			installAuraStyles(ctx);

			ctx.inject(["theme"], (tctx) => {
				const theme = tctx.get("theme");
				themeService = theme;

				tctx.effect(() => {
					if (theme.getTheme().themes.some((entry) => entry.id === THEME_ID)) return;
					theme.register({
						id: THEME_ID,
						colorScheme: THEME_COLOR_SCHEME,
						tokens: AURA_TOKENS
					});
				}, PLUGIN_ID + ": register aura theme");

				let alive = true;
				const off = tctx.on("theme/change", (snapshot) => {
					if (alive) applySnapshot(snapshot);
				});
				applySnapshot(theme.getTheme());
				tctx.effect(() => () => {
					alive = false;
					try {
						off();
					} catch (error) {}
				}, PLUGIN_ID + ": theme/change listener");
			});

			/*
			* ui-theme persists only built-in preferences, so adopt() can fold
			* the preference back while the switch is on (any font-size write
			* republishes). Watch the same settings scope to tell those adoption
			* echoes apart from a real Light/Dark/System pick in Appearance: only
			* a changed preference field turns Aura off, and the preference then
			* follows the pick so both records agree.
			*/
			ctx.inject(["configForms"], (cctx) => {
				cctx.effect(() => {
					let scope;
					try {
						scope = cctx.get("configForms").get(UI_THEME_SETTINGS);
					} catch (error) {
						return;
					}
					if (!scope || typeof scope.subscribe !== "function") return;
					const readPreference = () => {
						const value = scope.getSnapshot() ? scope.getSnapshot().value : undefined;
						return value && typeof value === "object" ? value.preference : undefined;
					};
					let last = readPreference();
					return scope.subscribe(() => {
						const current = readPreference();
						if (current === last || current === undefined) return;
						last = current;
						setAuraEnabled(false);
						setAuraAttribute(false);
						setThemePreference(current);
					});
				}, PLUGIN_ID + ": appearance preference watcher");
			});

			ctx.effect(() => ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "aura-theme",
				order: 12
			}, AuraThemeRow)), PLUGIN_ID + ": settings row");
		}
		//#endregion

		exports.AURA_ATTRIBUTE = AURA_ATTRIBUTE;
		exports.AURA_TOKENS = AURA_TOKENS;
		exports.THEME_ID = THEME_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
