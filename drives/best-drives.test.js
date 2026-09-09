const assert = require("node:assert/strict");
const { bestByBracket, pareto } = require("./best-drives");

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
assert.deepEqual(
  bestByBracket([weak, efficient, powerful, both])["below 100k"].map((d) => d.drive),
  ["Both"],
);
assert.deepEqual(Object.keys(bestByBracket([weak])), [
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
