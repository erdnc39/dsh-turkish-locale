# dsh-tr-locale

Language pack plugin for the DeepSeek Harness (DSH) web GUI: it adds **Türkçe**
to the Web GUI language catalog and centrally carries the `tr` dictionaries for
every first-party UI namespace plus the profile's third-party plugins, so the
whole interface can be switched to Turkish from one place.

## What it does

The plugin is a pure browser bundle (the host half intentionally has no
behavior) that runs once per page load:

- It registers the language definition `tr` (label `Türkçe`, fallback `en`)
  into the shared locale catalog through `ctx.locale.addLanguage`, which makes
  the language selectable in **Settings → General → Language** (and lets a
  Turkish browser auto-select it through navigator matching).
- It registers one `tr` dictionary per covered locale namespace (single-locale
  untyped `ctx.locale.register(ns, 'tr', dict)`), contributing the third
  language alongside each package's own `zh`/`en` registrations without
  touching those packages.
- Dictionary lookup resolves per key through the SDK fallback chain
  `ns → common → en → key`: a namespace or key this pack does not cover shows
  English, never Chinese.
- The plugin owns no settings and renders no UI of its own.

### Covered namespaces

58 namespaces / ~2770 keys, covering the shell (`common`, `settings.locale`),
every first-party UI surface (`chat`, `conversation`, `settings.*`,
`sidebar*`, `pluginManager`, `trajectory`, `workspace`, `schedule.*`,
`voice-input`, …) and the profile's third-party plugins
(`settings.ourFreeModel`).

## Install

Requires DSH 0.2.0-rc.1 or later. From a repository checkout:

```sh
dsh plugin --profile desktop add <path-to-this-package>
```

or install it through the Web sidebar's Plugins page / the `plugin_manager`
tool with this package directory as the spec. The bundle is selected
automatically on installation. Reload the page after installing; the language
appears under **Settings → General → Language**.

## Configuration

None: the plugin has no settings keys and no settings card. Choosing the
language happens in the official locale surface (**Settings → General →
Language**).

## Known limitations

- Copy that is captured once at registration time outside the slot render path
  (some registry-held command descriptions) keeps its registered language
  until re-registration; slot-rendered copy follows switches live.
- Electron shell chrome (window menus, native dialogs) is not covered; this
  pack localizes the web GUI.
- When a source package adds or changes an `en` key, the matching `tr` key
  must be mirrored here; placeholders (`{count}`, `{time}`, …) are shared with
  `en` and must be reused verbatim.

## License

MIT.
