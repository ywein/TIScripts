const assert = require("node:assert/strict");
const { calculateResearchCosts, loadProjects } = require("./research-costs");
const TEMPLATES = require("node:path").join(__dirname, "..", "templates");

const [drive] = calculateResearchCosts(
  [{ requiredProjectName: "drive" }],
  [
    { dataName: "drive", researchCost: 10, prereqs: ["shared", "part"] },
    { dataName: "part", researchCost: 20, prereqs: ["shared"] },
  ],
  [{ dataName: "shared", researchCost: 5 }],
);

assert.equal(drive.totalResearchCost, 35, "shared prerequisites count once");
assert.equal(drive.researchItems, 3);

// The 1962 overlay replaces base records whole and removes wrong-scenario ones entirely.
const merged = new Map(loadProjects(TEMPLATES).map((p) => [p.dataName, p]));
const rau = merged.get("Project_RegionalAfricanUnions");
assert.equal(rau.researchCost, 1500); // overlay price, not the base 2500
assert.deepEqual(rau.prereqs, ["Project_EastAfricanFederation"]); // base also required UnityMovements
assert.equal(merged.has("Project_EndofAmerica"), false); // tagged NotPostApoc
assert.equal(merged.get("Project_BSBE_LiberatingAmerica").researchCost, 20000); // overlay-only
