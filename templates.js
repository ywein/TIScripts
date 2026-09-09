// Templates ship as `base/` plus one addon directory; we target broken_earth.
// One place that knows the layering, so every script reads the same game.

const fs = require("node:fs");
const path = require("node:path");

const ADDON = "broken_earth";
const SCENARIO_TAG = "PostApoc";

// Regions, nations, armies and bilaterals are NOT merged: the addon ships a parallel set under
// prefixed dataNames (1962_COD) and its manifest loads only those, so the base set is not in
// this game at all. Everything else layers base -> addon.
const ADDON_ONLY = new Set([
  "TIRegionTemplate.json",
  "TINationTemplate.json",
  "TIArmyTemplate.json",
  "TIBilateralTemplate.json",
]);

// Existing "<root>/<layer>/<kind>" directories, base first.
function layers(root, kind) {
  return [path.join(root, "base", kind), path.join(root, ADDON, kind)].filter((d) => fs.existsSync(d));
}

// An addon record REPLACES the base one whole, never field-by-field: it drops prereqs the base
// had. Records tagged for a different scenario are not in this game.
function loadTemplates(root, file, scenario = SCENARIO_TAG) {
  const dirs = ADDON_ONLY.has(file) ? [path.join(root, ADDON, "Templates")] : layers(root, "Templates");
  const byName = new Map();
  for (const dir of dirs) {
    const at = path.join(dir, file);
    if (!fs.existsSync(at)) continue;
    for (const record of JSON.parse(fs.readFileSync(at, "utf8"))) {
      if (record.scenarioTags && !record.scenarioTags.includes(scenario)) continue;
      byName.set(record.dataName, record);
    }
  }
  if (!byName.size) throw new Error(`No ${file} records under ${root}`);
  return [...byName.values()];
}

module.exports = { loadTemplates, layers, ADDON, SCENARIO_TAG };
