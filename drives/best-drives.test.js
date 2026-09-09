const assert = require("node:assert/strict");
const { bestByBracket, driveScore, pareto, pickBest } = require("./best-drives");

const drive = (name, cost, efficiency, thrust) => ({
  friendlyName: `${name} x1`,
  totalResearchCost: cost,
  EV_kps: efficiency,
  thrust_N: thrust,
  thrusters: 1,
});
const weak = drive("Weak", 10_000, 1, 1);
const efficient = drive("Efficient", 20_000, 3, 1);
const powerful = drive("Powerful", 40_000, 1, 3);
const both = drive("Both", 90_000, 4, 4);

assert.deepEqual(pareto([weak, efficient, powerful]), [efficient, powerful]);
const bracket = (drives, label = "below 100k") =>
  bestByBracket(drives).find((b) => b.label === label).drives;

assert.deepEqual(bracket([weak, efficient, powerful, both]).map((d) => d.drive), ["Both"]);
const labels = bestByBracket([weak]).map((b) => b.label);
assert.equal(labels[0], "below 100k");
assert.equal(labels.at(-1), "2000k and above"); // the tail bracket follows the last cap
assert.equal(new Set(labels).size, labels.length);

// The strongest drive in a bracket is the one that does the most with its propellant, whatever
// that propellant costs — the frontier is ranked on jet power alone.
const torch = (name, cost, efficiency, thrust) => ({
  ...drive(name, cost, efficiency, thrust),
  thrustRating_GW: (efficiency * thrust) / 2,
});
assert.deepEqual(
  bracket([torch("Meek", 10_000, 12, 6), torch("Mighty", 20_000, 10, 10)]).map((d) => [d.drive, d.best]),
  [
    ["Meek", false],
    ["Mighty", true],
  ],
);

// Acceleration is worth having up to the point it stops mattering, and a trip you cannot supply
// is worth nothing — so a tenth of the acceleration has to come with a tenth of the bill.
const score = (accel_ms2, supplyMonths) => driveScore({ accel_ms2, supplyMonths });
assert.equal(score(0.004, 0.01), null, "cannot move the ship at all");
assert.ok(
  Math.abs(score(0.1, 1) - score(0.02, 0.2)) < 1e-12,
  "a fifth the acceleration for a fifth the bill",
);
assert.ok(score(1, 1) === score(0.1, 1), "acceleration past 0.1 buys nothing");
assert.ok(score(0.05, 0.1) > score(0.05, 1), "cheaper to run is better");
assert.ok(score(0.05, 0.5) > score(0.01, 0.5), "faster is better");

// Two drives that both cost a tank of water are the same answer; the one that accelerates twice
// as hard should not lose to a rounding difference in propellant.
assert.equal(
  pickBest([
    { n: "Sluggish", accel_ms2: 1.2, supplyMonths: 0.02 },
    { n: "Brisk", accel_ms2: 2.34, supplyMonths: 0.0215 },
  ]).n,
  "Brisk",
);
// A genuinely cheaper drive still wins, tolerance or not.
assert.equal(
  pickBest([
    { n: "Thirsty", accel_ms2: 2, supplyMonths: 1 },
    { n: "Frugal", accel_ms2: 0.05, supplyMonths: 0.05 },
  ]).n,
  "Frugal",
);
assert.equal(pickBest([{ n: "Stranded", accel_ms2: 0.001, supplyMonths: 0.01 }]), null);
