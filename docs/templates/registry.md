# Template registry — index

192 files under `templates/`. **Do not scan them.** Look up what you need here, then open
only the two or three files that actually hold it.

## Read one of these, never all three

A run targets **exactly one scenario**. The registry is split so you only load what that
scenario needs:

| You are working on | Read |
|---|---|
| Base game / 2022 start | [`registry-base.md`](registry-base.md) |
| 2003 (Dark Skies) scenario | `registry-base.md` + [`registry-2003.md`](registry-2003.md) |
| Broken Earth scenario | `registry-base.md` + [`registry-broken-earth.md`](registry-broken-earth.md) |

`2003` and `broken_earth` are mutually exclusive scenarios — they never load together, so
there is no reason to read both registries in one session. Base is always required: the
addons ship 15–20 files against base's 60, and everything they do not ship comes from base
unchanged.

## Layout

```
templates/
  base/          60 JSON + 72 l10n   full game
  2003/          20 JSON + 12 l10n   Dark Skies "2003" scenario
  broken_earth/  15 JSON + 11 l10n   Dark Skies "Broken Earth" scenario
    Templates/*.json   records, one file per template type
    l10n/*.en          display strings
```

## How an addon layers onto base

Two distinct mechanisms — the registries mark which one each file uses.

**1. Replace by `dataName`.** The addon record has the *same* `dataName` as a base record and
replaces it **whole** — no field-by-field merge, so it drops any field the base record had.
Used by `TIFactionTemplate`, `TIProjectTemplate`, `TITechTemplate`, `TISpaceBodyTemplate`,
`TIMissionTemplate`, `TIOrgTemplate`, `TIGlobalConfig`, and others.

**2. Parallel prefixed records.** The addon record has a *new* prefixed `dataName`
(`2003_DZA`, `1962_Czechia`) and does not touch the base record at all. Used by
`TIRegionTemplate`, `TINationTemplate`, `TIArmyTemplate`, `TIBilateralTemplate`. The scenario
picks which set is live — see the manifest below. Two links point back at base:

- `referenceAlias` — the base `dataName` this record stands in for, for cross-references.
- `localizationAlias` — the `dataName` whose l10n keys to use.

## Selection: `TIMetaTemplate` is the manifest

The addon's `TIMetaTemplate.json` holds the scenario root record plus one record per template
type listing, by `dataName`, **exactly which records the scenario loads**. If you need to know
whether a record is live in a scenario, this is the authority, not a guess from the prefix.

The scenario root record also carries:

| field | broken_earth | 2003 |
|---|---|---|
| `dataName` | `BrokenEarthScenario` | `2003Scenario` |
| `scenarioTags` | `PostApoc` | `Millennium`, `NotPostApoc` |
| `scenarioPrefix` | `1962_` | `2003_` |
| `scenarioLocalizationPostfix` | `.BrokenEarth` | `.2003` |
| `requiredDLC` | `DarkSkies` | `DarkSkies` |
| `templatesToUseDefaultLocalization` | `TINationTemplate`, `TIRegionTemplate`, `TIArmyTemplate` | same |

## Naming markers

Content belonging to a scenario is identifiable by name alone — `templates/base/` contains no
`BrokenEarth`, `1962_`, `2003_` or `BSBE_` strings at all.

| Scenario | `dataName` markers | l10n suffix | tag |
|---|---|---|---|
| Broken Earth | `1962_`, `BSBE_`, `BrokenEarth` | `.BrokenEarth` | `PostApoc` |
| 2003 | `2003_`, `2003Scenario` | `.2003`, `.2003Scenario` | `Millennium` |

**`BS_` means Dark Skies DLC, not a specific scenario** — 21 `BS_` `dataName`s appear verbatim
in both addons. Only `BSBE_` is Broken-Earth-specific.

`scenarioTags` on any record limits it to one scenario; drop records whose tags exclude your
target. **Untagged means every scenario.** Base's own tag is `NotPostApoc`.

## l10n

Key format `TIxTemplate.<field>.<dataName>=<value>`, plus `UI.<Screen>.<key>=` in the `UI*.en`
files. Merge base first, addon last; addon lines win.

- A **scenario suffix** beats the plain key when that scenario is targeted:
  `TIRegionTemplate.displayName.Czechia.BrokenEarth=Brno` beats `...displayName.Czechia=`.
  Suffixes seen: `.BrokenEarth`, `.2003`, `.2003Scenario`. Other scenarios' suffixes are ignored.
- Keys are written against the **base** `dataName`. A prefixed record resolves through its
  `localizationAlias` — `1962_Czechia` looks up `Czechia`. Never look up `1962_Czechia`.
- `//` line comments and blank lines appear in `.en` files; skip them.

## Gotchas

- **9 JSON files are not strict JSON** — they contain `//` comments and/or trailing commas, so
  `JSON.parse` throws on them: `TIGlobalConfig`, `TIMetaTemplate` (base + broken_earth),
  `TIMapGroupVisualizerTemplate`, `TIPlayerTemplate`, `TISpaceFleetTemplate`,
  `TISpaceShipTemplate`, `TITimeEventTemplate`. Strip comments and trailing commas first.
- `broken_earth/TIBilateralTemplate.json` has 2918 records but only 2910 distinct `dataName`s —
  duplicates exist; last one wins.
- Column names are not always sanitised: `TIOrbitTemplate` has keys with spaces
  (`builder name`, `friendly name`, `barycenter hill radius`), `TIDriveTemplate` has `req power`,
  `TISpaceBodyTemplate` has `Hill Radius in km`. Quote them.
- Records are disabled in place with `disable: true` rather than deleted. Filter on it.
- `base/Templates/DONOTDELETE.txt` is a placeholder, not data.

## Consumers in this repo

`drives/build-chart.js` and `unifications/build-unifications.js` take one flat template
directory and `JSON.parse` it directly — they do not walk `base` + addon and will throw on the
9 dirty files. The base+addon layering currently lives only in `loadProjects` / `loadNationNames`.
