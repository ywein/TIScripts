# `templates/broken_earth/` — Broken Earth scenario

**Read with [`registry-base.md`](registry-base.md), never with `registry-2003.md`.** Broken
Earth and 2003 are alternative scenarios; a run loads one or the other. See
[`registry.md`](registry.md) for the merge rules.

Alt-history 1962 post-apocalyptic start. Dark Skies DLC. 15 JSON files, 11 l10n files —
everything not listed here comes from `base` unchanged.

- Scenario record: `BrokenEarthScenario` in `TIMetaTemplate.json`
- `scenarioTags`: **`PostApoc`** — drop base records tagged `NotPostApoc`
- `dataName` prefix: **`1962_`**
- l10n suffix: **`.BrokenEarth`**

## How to recognise Broken Earth content

Nothing in `templates/base/` contains the string `BrokenEarth` or `1962_` — every marker below
is exclusive to this scenario, so grepping for one is a reliable filter.

| Marker | Where it appears | Example |
|---|---|---|
| `1962_` prefix on `dataName` | regions, nations, armies, bilaterals, start time — 741 records | `1962_Czechia`, `1962_ACE`, `Claim1962_SAU1962_Oman` |
| `BSBE_` in `dataName` | projects, effects, techs — the new Broken Earth content | `Project_BSBE_PlayingFromBehind_Resist`, `Effect_BSBE_NuclearAversion100`, `BSBE_ANewSpaceRace` |
| `BrokenEarth` prefix on `dataName` | the 7 `TIMetaTemplate` manifest records | `BrokenEarthScenario`, `BrokenEarthNations` |
| `.BrokenEarth` l10n key suffix | 321 of 637 addon l10n keys | `TIRegionTemplate.displayName.Czechia.BrokenEarth=Brno` |
| `"scenarioTags": ["PostApoc"]` | records gated to this scenario | — |

**`BS_` alone is not a Broken Earth marker.** It means Dark Skies DLC generally and appears in
both addons — 21 `BS_` `dataName`s exist verbatim in *both* `2003/` and `broken_earth/`
(`Effect_BS_EnergyScienceBonusA`, `Effect_BS_LifeSciencePenalty`, …). Only `BSBE_` is
Broken-Earth-specific. Match on `1962_`, `BSBE_`, `BrokenEarth`, or the `PostApoc` tag.

## Files

`R` = replaces the base record with the same `dataName`. `N` = new parallel record, base
record untouched.

| File | Recs | Size | R / N | Notes |
|---|---|---|---|---|
| `TIMetaTemplate` | 7 | 26K | 7 N | **Start here.** Scenario root + manifests for StartTime / Habs / Regions / Nations / Armies / Orgs. **dirty JSON** |
| `TIBilateralTemplate` | 2918 | 515K | 2910 N | 1962 claims/wars/alliances. 8 duplicate `dataName`s. Heavy on `hostileClaim` (854) — a contested map. |
| `TIRegionTemplate` | 363 | 398K | 363 N | `1962_*`; every record carries `referenceAlias`/`localizationAlias` back to the base name. Adds `mining`, `oilResource`, `coreEco` on all records. |
| `TINationTemplate` | 298 | 321K | 298 N | `1962_*`. Full stat block per nation (no partial rows, unlike base). |
| `TINarrativeEventTemplate` | 28 | 181K | 7 R / 21 N | Replaces `event_SecurityCouncil`, `event_LocalVolunteers`, `event_SurpriseBenefactor`, `event_SpaceMogul`, `event_PaperTiger`, `event_LogisticsBottleneck`, `dummy`. |
| `TISpaceBodyTemplate` | 74 | 87K | 74 R | Re-states Sol + inner bodies. Adds `alternativeEffectToExplore`. One record is tagged `Millennium`, not `PostApoc` — leaks from the 2003 set; filter by tag, not by file. |
| `TIFactionTemplate` | 8 | 47K | 8 R | All 8 factions replaced whole, for the 1962 framing. |
| `TIProjectTemplate` | 51 | 32K | 35 R / 16 N | New `Project_BSBE_*` line (`PlayingFromBehind`, nuclear reconstruction). 22 use `requiresNation`. |
| `TIArmyTemplate` | 79 | 19K | 79 N | `1962_*` armies. One record has a stray `FIELD8` key. |
| `TIOrgTemplate` | 12 | 11K | 11 R / 1 N | Cold-war-era intelligence orgs + faction space groups. |
| `TITechTemplate` | 9 | 4K | 8 R / 1 N | Reprices early space techs; adds `BSBE_ANewSpaceRace`. |
| `TIEffectTemplate` | 70 | 26K | 70 N | `Effect_BSBE_*` / `Effect_BS_*`. 39 carry `localizationAlias`. |
| `TIGlobalConfig` | 1 | 6K | 1 R | **Replaces the base config whole** — it only sets ~25 combat/occupation/IP fields, so every other base knob is dropped. Check this before assuming a base default applies. **dirty JSON** |
| `TIMissionTemplate` | 1 | 2K | 1 R | `AssumeControl`. |
| `TIStartTimeTemplate` | 1 | 2K | 1 N | `1962_Start`. |

Note there is **no** `TIObjectiveTemplate.json` here even though `l10n/TIObjectiveTemplate.en`
exists — the objective text is overridden, the objective records are not.

## l10n (11 files)

| File | Keys | Suffixed `.BrokenEarth` |
|---|---|---|
| `TINarrativeEventTemplate.en` | 254 | 0 |
| `TINationTemplate.en` | 168 | 168 |
| `TIRegionTemplate.en` | 120 | 120 |
| `TIProjectTemplate.en` | 45 | 2 |
| `TIOrgTemplate.en` | 19 | 19 |
| `TIEffectTemplate.en` | 10 | 0 |
| `TIFactionTemplate.en` | 7 | 7 |
| `UINotifications.en` | 7 | 5 |
| `TITechTemplate.en` | 4 | 0 |
| `UIStartScreen.en` | 4 | 0 |
| `TIObjectiveTemplate.en` | 1 | 1 |

Nation and region keys are written against the **base** `dataName` with a `.BrokenEarth`
suffix (`TIRegionTemplate.displayName.Czechia.BrokenEarth=Brno`). Resolve `1962_Czechia` via
its `localizationAlias`, not its `dataName`.
