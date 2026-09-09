#!/usr/bin/env node

const path = require("node:path");
const { loadPropulsion } = require("./propulsion");

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
  // Jet power ranks a frontier that is otherwise two-dimensional: it is what the drive does with
  // the propellant, before you ask what the propellant costs to buy.
  const power = (drive) => Number(String(drive.thrustRating_GW ?? 0).replaceAll(",", "")) || 0;
  const summarize = (items) => {
    const strongest = (list) => list.reduce((best, d) => (!best || power(d) > power(best) ? d : best), null);
    const frontier = pareto(items);
    const best = strongest(frontier);
    // The best drive you would actually fly: the strongest one whose propellant you can afford to
    // keep buying. It gets its own frontier, because a drive that is better on paper hides it —
    // the Pion Torch dominates the Protium Converter Torch on both axes and bankrupts you.
    const usable = strongest(pareto(items.filter((d) => d.practical !== false)));
    const listed = usable && !frontier.includes(usable) ? [...frontier, usable] : frontier;
    return listed
      .sort((a, b) => a.totalResearchCost - b.totalResearchCost)
      .map((drive) => ({
        drive: drive.friendlyName.replace(/ x\d+$/, ""),
        researchCost: drive.totalResearchCost,
        fuelEfficiency_kps: drive.EV_kps,
        thrust_N: drive.thrust_N,
        supplyBill: drive.supplyBill,
        best: drive === best,
        bestUsable: drive === usable && usable !== best,
      }));
  };

  return Object.fromEntries([
    ...CAPS.map((cap) => [`below ${cap / 1000}k`, summarize(usable.filter((d) => d.totalResearchCost < cap))]),
    ["800k and above", summarize(usable.filter((d) => d.totalResearchCost >= 800_000))],
  ]);
}

function main() {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  const drives = loadPropulsion(directory);
  process.stdout.write(`${JSON.stringify(bestByBracket(drives), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { bestByBracket, largestVariants, pareto };
