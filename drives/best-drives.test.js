const assert = require("node:assert/strict");
const { bestByBracket, driveScore, pareto } = require("./best-drives");

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
assert.deepEqual(bestByBracket([weak]).map((b) => b.label), [
  "below 100k",
  "below 200k",
  "below 300k",
  "below 400k",
  "below 500k",
  "below 600k",
  "below 700k",
  "below 800k",
  "800k and above",
]);

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
