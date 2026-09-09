# Template layout

> **Per-file contents live in the [template registry](registry.md)** — read that instead of
> scanning `templates/`. Index: [`registry.md`](registry.md), then
> [`registry-base.md`](registry-base.md) plus *one* of
> [`registry-2003.md`](registry-2003.md) / [`registry-broken-earth.md`](registry-broken-earth.md).

```
templates/
  base/          # base game — the full set
  broken_earth/  # addon — overrides only
  2003/          # addon — overrides only
    Templates/*.json   # data
    l10n/*.en          # display strings
```

## The rule

A run targets **one addon**. Read `base` first, then the addon on top; the addon wins.

1. Merge `Templates/*.json` per file, keyed on `dataName`. An addon record **replaces the base
   record whole** — no field-by-field merge, so it drops prereqs the base record had. A
   `dataName` only the addon has is a new record; a file only `base` has is used as-is.
   Regions, nations, armies and bilaterals do *not* work this way: the addon ships parallel
   records under a prefixed `dataName` (`2003_DZA`, `1962_Czechia`) that point back at the base
   record via `referenceAlias` / `localizationAlias`. The addon's `TIMetaTemplate.json` lists,
   per template type, exactly which `dataName`s the scenario loads — that manifest is the
   authority on which set is live.
2. Merge `l10n/*.en` per key (`TIxTemplate.field.Code=value`), addon lines last.
3. Then apply the two in-file overrides described below.

## In-file overrides

**`scenarioTags`** on a record limits it to one scenario. Drop any record whose tags do not
include the scenario you target. Tag per addon:

| addon | scenario tag |
|---|---|
| base (no addon) | `NotPostApoc` |
| `broken_earth` | `PostApoc` |
| `2003` | `Millennium` |

An untagged record is in every scenario.

**Suffixed l10n keys** — `displayName.COD.BrokenEarth=Grand Basin` beats plain
`displayName.COD=Congo` when that scenario is targeted. Keys are always written against the
**base** `dataName`, so a prefixed record resolves through its `localizationAlias`. Suffix per addon: `BrokenEarth`,
`2003` / `2003Scenario`. A suffix for another scenario is ignored.

## Status

We target `broken_earth`. Every script reads through `templates.js` (`loadTemplates` / `layers`),
which implements the rules above; the manifest in the addon's `TIMetaTemplate.json` is not read —
for the four parallel-record templates it lists exactly the addon file's own records (plus `ALN`,
which we skip as an omni-nation anyway), so taking the addon file whole is the same set.
