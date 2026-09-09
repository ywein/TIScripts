# TIScripts

Static analysis pages for the game *Terra Invicta*, generated from the game's own template data.
No framework, no dependencies — plain Node (CommonJS) and plain HTML.

- **Drives** — exhaust velocity vs thrust for every drive, with the research cost to get there.
- **Unifications** — which nations can merge into mega-nations, and in what order.

`index.html` is the shell; open it in a browser after building.

## Game data

The `templates/` directory is **not committed** — it is game assets. Copy it out of your
Terra Invicta install (under `TerraInvicta_Data/StreamingAssets`, base game plus the
`broken_earth` from `dark skyes` dlc, which is the scenario these pages target) so it looks like this:

```
templates/
  base/Templates/*.json      base/l10n/*.en
  broken_earth/Templates/*.json   broken_earth/l10n/*.en
```

## Build

```sh
make        # rebuild the pages whose inputs changed
make -B     # force
make test   # node --test
make clean
```

Make points at `./templates` by default; override with `make TEMPLATES=/path/to/templates`.

Generated HTML is committed, so a change to a build script means rebuilding and committing the
page alongside it. Never edit `drives/fuel-efficiency-thrust.html` or
`unifications/unifications.html` by hand — edit the matching `.template.html`.

The build scripts also run standalone as CLIs printing JSON:

```sh
node drives/research-costs.js templates
node drives/best-drives.js templates
```

## Layout

```
templates.js          the layering rules: base merged under the addon, by dataName
drives/               research costs, propulsion maths, Pareto frontier, chart build
unifications/         world model, bloc planning, page build
docs/templates/       what lives in which of the game's 192 template files — read this first
```
