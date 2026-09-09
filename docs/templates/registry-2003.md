# `templates/2003/` — 2003 scenario

**Read with [`registry-base.md`](registry-base.md), never with `registry-broken-earth.md`.**
2003 and Broken Earth are alternative scenarios; a run loads one or the other. See
[`registry.md`](registry.md) for the merge rules.

Early-2000s start, alien crash in 2003. Dark Skies DLC. 20 JSON files, 12 l10n files —
everything not listed here comes from `base` unchanged.

- Scenario record: `2003Scenario` in `TIMetaTemplate.json`
- `scenarioTags`: **`Millennium`** (and `NotPostApoc`) — keep base `NotPostApoc` records, drop `PostApoc` ones
- `dataName` prefix: **`2003_`**
- l10n suffix: **`.2003`** (`.2003Scenario` on two meta keys)

## How to recognise 2003 content

| Marker | Where it appears | Example |
|---|---|---|
| `2003_` prefix on `dataName` | regions, nations, armies, bilaterals, start time | `2003_DZA`, `2003_Czechia`, `Alliance2003_AUS2003_JPN` |
| `2003Scenario` / `2003_*` | the 7 `TIMetaTemplate` manifest records | `2003Scenario`, `2003_Nations` |
| `.2003` l10n key suffix (`.2003Scenario` on meta) | 18 of 415 addon l10n keys | `TIFactionTemplate.CampaignStart.ResistCouncil.2003=` |
| `"scenarioTags": ["Millennium"]` | records gated to this scenario | — |

**`BS_` alone is not a 2003 marker.** It means Dark Skies DLC generally and appears in both
addons — 21 `BS_` `dataName`s exist verbatim in *both* `2003/` and `broken_earth/`. Match on
`2003_` or the `Millennium` tag; `BSBE_` is Broken Earth's, not this scenario's.

## Files

`R` = replaces the base record with the same `dataName`. `N` = new parallel record, base
record untouched.

| File | Recs | Size | R / N | Notes |
|---|---|---|---|---|
| `TIMetaTemplate` | 7 | 17K | 7 N | **Start here.** Scenario root + manifests for StartTime / Regions / Nations / Armies / Habs / RepeatingEvents. Reuses base `ModernOrgTemplates` and `StandardCouncilors`. |
| `TIBilateralTemplate` | 2673 | 479K | 2673 N | 2003 relations. 1715 records carry `projectUnlockName` — this is where unification prereqs live. |
| `TIRegionTemplate` | 363 | 387K | 363 N | `2003_*` with `referenceAlias`/`localizationAlias` back to base names. |
| `TINationTemplate` | 295 | 273K | 295 N | `2003_*`. |
| `TINarrativeEventTemplate` | 39 | 255K | 22 R / 17 N | 38 of 39 tagged `Millennium`. |
| `TIProjectTemplate` | 182 | 122K | 152 R / 30 N | Largest addon override set — reprices/regates most of the early tree. All 182 tagged `Millennium`. `Project_BS_*` are new. |
| `TIFactionTemplate` | 8 | 48K | 8 R | All 8 factions replaced whole. |
| `TIEffectTemplate` | 102 | 40K | 102 N | `Effect_BS_*`; 49 carry `localizationAlias`. |
| `TIObjectiveTemplate` | 19 | 22K | 13 R / 6 N | `BS_Research*_<Faction>` chains. |
| `TISpaceBodyTemplate` | 17 | 20K | 17 R | Sol + a few bodies; adds `alternativeEffectToExplore`. |
| `TITechTemplate` | 44 | 17K | 41 R / 3 N | Reprices most early techs. New: `BS_DemocratizationofSpace`, `BS_ExascaleComputing`, `BS_DigitalSociety`. |
| `TIArmyTemplate` | 22 | 5K | 22 N | `2003_*` — only the major powers. |
| `TIMissionTemplate` | 2 | 4K | 2 R | `AssumeControl`, `BuildFacility`. |
| `TIOrgTemplate` | 2 | 2K | 2 R | `SubmitSpecial`, `SubmitAdministration`. |
| `TIStartTimeTemplate` | 1 | 2K | 1 N | `2003Start`. |
| `TIHabModuleTemplate` | 1 | 1K | 1 R | `AlienWormholeFacility`. |
| `TIHabTemplate` | 2 | 1K | 2 R | `AlienHQ`, `AlienHQStation`. |
| `TITimeEventTemplate` | 1 | 1K | 1 R | `CouncilorMissionUpdate`. |
| `TITraitTemplate` | 1 | 1K | 1 N | `Chosen`. |
| `TIPriorityPresetTemplate` | 1 | <1K | 1 R | `Alien`. |

No `TIGlobalConfig` override here — base config applies unmodified (unlike Broken Earth).

## l10n (12 files)

| File | Keys | Suffixed |
|---|---|---|
| `TINarrativeEventTemplate.en` | 227 | 0 |
| `TIProjectTemplate.en` | 69 | 0 |
| `TIEffectTemplate.en` | 71 | 0 |
| `TITechTemplate.en` | 12 | 0 |
| `TIObjectiveTemplate.en` | 9 | 0 |
| `TIFactionTemplate.en` | 8 | 8 × `.2003` |
| `TIMetaTemplate.en` | 6 | 2 × `.2003Scenario` |
| `TINationTemplate.en` | 4 | 4 × `.2003` |
| `UINotifications.en` | 4 | 4 × `.2003` |
| `TIHabModuleTemplate.en` | 2 | 0 |
| `TITraitTemplate.en` | 2 | 0 |
| `UIScience.en` | 1 | 0 |

There is **no** `2003/l10n/TIRegionTemplate.en` — unlike Broken Earth, 2003 does not rename
regions; `2003_Czechia` resolves through `localizationAlias` to the plain base string.
