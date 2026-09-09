# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site of analysis pages for the game *Terra Invicta*, built by Node scripts that read the
game's own template data. No framework, no package.json, no dependencies — plain CommonJS, plain
HTML, `node:test`. d3 is loaded from a CDN inside the drives page only.

## Commands

```sh
make            # build both pages (only rebuilds when inputs change)
make -B         # force rebuild
make test       # node --test — runs every *.test.js
node --test drives/best-drives.test.js   # one file
make clean
```

Build scripts also run standalone as CLIs printing JSON:
`node drives/research-costs.js <dir>`, `node drives/best-drives.js <dir>`.

## Build pipeline

Each page is `X.template.html` + a build script → generated `X.html`, committed. The script reads
game JSON, computes everything, and string-replaces one placeholder with a JSON blob
(`__DRIVES__`, `__BEST_DRIVES__`, `__BLOCS__`); the template's inline `<script>` renders it. Builds
throw if a placeholder survives. `index.html` is a hand-written tab shell that lazily iframes the
two generated pages.

Never edit `drives/fuel-efficiency-thrust.html` or `unifications/unifications.html` — edit the
`.template.html` and rebuild.

## Game data (`templates/`)

Gitignored, copied from the game install. **Read `docs/templates/registry.md` before opening
anything under `templates/`** — 192 files, and the registry says which one holds what. Then read
`registry-base.md` plus *one* of `registry-2003.md` / `registry-broken-earth.md`; the two addons
are mutually exclusive scenarios. `docs/templates/templates.md` explains the layering rules
(whole-record replacement by `dataName`, parallel prefixed records with `referenceAlias`,
`scenarioTags` filtering, suffixed l10n keys).

We target the **broken_earth** scenario (`PostApoc` / `BrokenEarth` tags — the defaults hardcoded
in `templates.js` and `loadNationNames`).

`templates.js` at the repo root is the only place that knows the layout: `loadTemplates(root,
file)` merges `base/Templates/<file>` under `broken_earth/Templates/<file>` by `dataName` and
drops records tagged for another scenario, except for the four parallel-record templates
(region, nation, army, bilateral) which come from the addon alone. `layers(root, kind)` gives the
base+addon directory pair, which is how `loadNationNames` finds both l10n files.

## Domain logic worth knowing

- `drives/research-costs.js` — `researchClosure` is the core: total cost of a set of roots counts
  shared prereqs **once**, so always pass all roots together rather than summing sticker prices.
  A negative `researchCost` means unresearchable and propagates as `null`.
- `drives/propulsion.js` — a drive is only half a package: `req power` (GW, string with commas)
  is drawn from a power plant of the class named in `requiredPowerPlant` (`Any_General` = any),
  and that plant's mass is `req power × specificPower_tGW`, capped by its `maxOutput_GW`. It picks
  the cheapest-to-research viable plant, but `totalResearchCost` stays the drive's own closure:
  the plant and radiator are a mass reference, and players fly whatever they happen to have. Open-cycle
  drives (`req power` 0) carry their own reactor via `flatMass_tons` / `specificPower_kgMW`.
  Waste heat is `(1 - plant efficiency) × req power` for anything not `cooling: "Open"`, rejected
  by Dusty Plasma radiators at `1000 / specificPower_2s_KWkg` tons per GW. Both formulas were
  checked against the game's ship builder (Helicon x6: 286 t reactor, and 521.8 t of Tin Droplet radiator when `RADIATOR` was set to that).
  Propellant is not precomputed: the template's inline script applies the rocket equation to the
  hull mass and Δv typed into the page, so those two inputs stay client-side. Tanks and hull are not
  modelled.
- `drives/best-drives.js` — Pareto frontier over (exhaust velocity, thrust) inside research-cost
  brackets. Each bracket tags its `best` (most jet power) and, when that drive is impractical, the
  `bestUsable` — computed from its *own* Pareto frontier over practical drives, because the strong
  drive dominates it on both axes and would otherwise hide it. Practicality comes from
  `propulsion.js`: rare materials per tank (`MATERIAL_RARITY`, a judgement call — antimatter 500,
  fissiles 1, noble metals 0.5, everything else free) times the tanks a 5000 t / 10 km/s reference
  mission burns, against `PRACTICAL_LIMIT`. Only the Pion Torch fails it. alien drives are excluded upstream in `build-chart.js` because they are loot.
- `unifications/unifications.js` — the whole world model. `buildWorld` turns `Claim` bilaterals
  into nations/regions/claims; `unify`/`topBlocs`/`plan` compute which nations can merge into
  mega-nations and in what order. `loadWorld` is the single place that knows which files make a
  world — keep the CLI and the build script going through it.

## Workflow

Trunk-based: commit each completed chunk of work directly to `main`. Rebuild the affected pages
and commit the generated HTML alongside the source change so the site stays consistent.
