#!/usr/bin/env node

const path = require("node:path");
const { loadPropulsion } = require("./propulsion");

// What a drive is worth for a given ship: nothing at all if the trip would need more propellant
// than the ship could plausibly carry — a chemical rocket keeps its place on the frontier forever
// because nothing beats its thrust, but wanting 24 times its own mass in propellant settles it.
// Otherwise acceptance is acceleration on a log scale, credited only between the
// point it becomes usable at all and the point where more of it stops buying anything, minus what
// the trip costs in months of production on the same scale. Injected verbatim into the page, which
// re-runs it against whatever hull and Δv you type in — this is the only copy of the formula.
function driveScore({ accel_ms2, supplyMonths, propellantRatio }) {
  const USABLE = 0.02; // m/s^2 — tiny but flyable, the reference point
  const GOOD = 0.1; // more acceleration than this is pleasant, not valuable
  const DEAD = 0.002; // below this the drive cannot usefully move the ship at all
  const TANKAGE = 3; // tons of propellant per ton of ship before the design is a joke
  if (!(accel_ms2 >= DEAD) || !(supplyMonths > 0)) return null;
  if (propellantRatio > TANKAGE) return null;
  return Math.log10(Math.min(accel_ms2, GOOD) / USABLE) - Math.log10(supplyMonths);
}

// Scores this close say the same thing — the difference is a few tons of water — so the faster
// ship wins rather than whichever rounded a hair cheaper. Injected into the page alongside the
// score it uses.
function pickBest(candidates) {
  const TIE = 0.05;
  const scored = candidates
    .map((c) => ({ ...c, score: driveScore(c) }))
    .filter((c) => c.score !== null);
  if (!scored.length) return null;
  const top = Math.max(...scored.map((c) => c.score));
  return scored
    .filter((c) => c.score >= top - TIE)
    .sort((a, b) => b.accel_ms2 - a.accel_ms2)[0];
}

// Every 100k while drives are still cheap, then one bracket for the endgame: only three drives
// cost more than 1.2M, and without a cut up there the Pion Torch dominates the whole tail on both
// axes and hides drives like the Advanced Antimatter Plasma Core Torch that you would fly first.
const CAPS = [
  100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 1_200_000,
];

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
  // The frontier is what a bracket offers; which of them you would actually fly depends on the
  // ship you are flying, so that verdict is the page's to make.
  const summarize = (items) => {
    const frontier = pareto(items);
    const best = frontier.reduce((top, d) => (!top || power(d) > power(top) ? d : top), null);
    return frontier
      .sort((a, b) => a.totalResearchCost - b.totalResearchCost)
      .map((drive) => ({
        drive: drive.friendlyName.replace(/ x\d+$/, ""),
        researchCost: drive.totalResearchCost,
        fuelEfficiency_kps: drive.EV_kps,
        thrust_N: drive.thrust_N,
        supplyMonths: drive.supplyMonths,
        best: drive === best,
      }));
  };

  // Brackets are cumulative — "below 300k" is everything you could have researched by then.
  return [
    ...CAPS.map((cap) => ({ label: `below ${cap / 1000}k`, min: 0, max: cap })),
    { label: `${CAPS.at(-1) / 1000}k and above`, min: CAPS.at(-1), max: Infinity },
  ].map((bracket) => ({
    ...bracket,
    drives: summarize(
      usable.filter((d) => d.totalResearchCost >= bracket.min && d.totalResearchCost < bracket.max),
    ),
  }));
}

function main() {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  const drives = loadPropulsion(directory);
  process.stdout.write(`${JSON.stringify(bestByBracket(drives), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { bestByBracket, driveScore, largestVariants, pareto, pickBest };
