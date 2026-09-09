#!/usr/bin/env node

const path = require("node:path");
const { calculateResearchCosts } = require("./research-costs");
const { loadTemplates } = require("../templates");

const CAPS = [100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000];

function pareto(drives) {
  return drives.filter(
    (drive) =>
      !drives.some(
        (other) =>
          other !== drive &&
          other.EV_kps >= drive.EV_kps &&
          other.thrust_N >= drive.thrust_N &&
          (other.EV_kps > drive.EV_kps || other.thrust_N > drive.thrust_N),
      ),
  );
}

// The x6 variant is what anyone actually builds; Orion-type drives only come as x1.
function largestVariants(drives) {
  const best = new Map();
  for (const drive of drives) {
    const name = drive.friendlyName.replace(/ x\d+$/, "");
    const previous = best.get(name);
    if (!previous || drive.thrusters > previous.thrusters) best.set(name, drive);
  }
  return [...best.values()];
}

function bestByBracket(drives) {
  const usable = largestVariants(drives).filter(
    (drive) =>
      drive.EV_kps > 0 &&
      drive.thrust_N > 0 &&
      Number.isFinite(drive.totalResearchCost),
  );
  const summarize = (items) =>
    pareto(items)
      .sort((a, b) => a.totalResearchCost - b.totalResearchCost)
      .map(({ friendlyName, totalResearchCost, EV_kps, thrust_N }) => ({
        drive: friendlyName.replace(/ x\d+$/, ""),
        researchCost: totalResearchCost,
        fuelEfficiency_kps: EV_kps,
        thrust_N,
      }));

  return Object.fromEntries([
    ...CAPS.map((cap) => [`below ${cap / 1000}k`, summarize(usable.filter((d) => d.totalResearchCost < cap))]),
    ["800k and above", summarize(usable.filter((d) => d.totalResearchCost >= 800_000))],
  ]);
}

function main() {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  const load = (name) => loadTemplates(directory, name);
  const drives = calculateResearchCosts(
    load("TIDriveTemplate.json"),
    load("TIProjectTemplate.json"),
    load("TITechTemplate.json"),
  );
  process.stdout.write(`${JSON.stringify(bestByBracket(drives), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { bestByBracket, largestVariants, pareto };
