#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { calculateResearchCosts } = require("./research-costs");

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

function bestByBracket(drives) {
  const usable = drives.filter(
    (drive) =>
      drive.thrusters === 1 &&
      drive.EV_kps > 0 &&
      drive.thrust_N > 0 &&
      Number.isFinite(drive.totalResearchCost),
  );
  const summarize = (items) =>
    pareto(items)
      .sort((a, b) => a.totalResearchCost - b.totalResearchCost)
      .map(({ friendlyName, totalResearchCost, EV_kps, thrust_N }) => ({
        drive: friendlyName.replace(/ x1$/, ""),
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
  const directory = path.resolve(process.argv[2] || ".");
  const load = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
  const drives = calculateResearchCosts(
    load("TIDriveTemplate.json"),
    load("TIProjectTemplate.json"),
    load("TITechTemplate.json"),
  );
  process.stdout.write(`${JSON.stringify(bestByBracket(drives), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { bestByBracket, pareto };
