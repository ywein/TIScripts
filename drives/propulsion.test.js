const assert = require("node:assert/strict");
const { propulsionPackages, loadPropulsion } = require("./propulsion");
const TEMPLATES = require("node:path").join(__dirname, "..", "templates");

const plants = [
  { dataName: "small", friendlyName: "Small", powerPlantClass: "Fission", maxOutput_GW: 1, specificPower_tGW: 40 },
  { dataName: "big", friendlyName: "Big", powerPlantClass: "Fission", maxOutput_GW: 10, specificPower_tGW: 4, requiredProjectName: "plant" },
  { dataName: "other", friendlyName: "Other", powerPlantClass: "Fusion", maxOutput_GW: 99, specificPower_tGW: 1 },
];
const projects = [
  { dataName: "drive", researchCost: 10, prereqs: ["shared"] },
  { dataName: "plant", researchCost: 20, prereqs: ["shared"] },
];
const techs = [{ dataName: "shared", researchCost: 5 }];
const drive = (fields) => ({ requiredProjectName: "drive", requiredPowerPlant: "Fission", ...fields });

const [big, flat, tiny] = propulsionPackages(
  [
    drive({ "req power": "2.000" }), // over Small's cap, so only Big can carry it
    drive({ "req power": 0, flatMass_tons: 50 }), // open cycle: no plant at all
    drive({ "req power": "0.500", specificPower_kgMW: 10, thrustRating_GW: "1.000" }),
  ],
  plants,
  projects,
  techs,
);

assert.equal(big.powerPlant, "Big");
assert.equal(big.mass_tons, 8); // 2 GW x 4 t/GW
assert.equal(big.totalResearchCost, 35); // drive + plant, shared prereq once
assert.equal(flat.powerPlant, null);
assert.equal(flat.mass_tons, 50);
assert.equal(flat.totalResearchCost, 15);
assert.equal(tiny.powerPlant, "Small"); // cheaper to research than Big, and it fits
assert.equal(tiny.mass_tons, 30); // 10 t drive + 0.5 GW x 40 t/GW

// A drive never draws on a power plant class it does not accept.
const [strict] = propulsionPackages([drive({ "req power": "50.000" })], plants, projects, techs);
assert.equal(strict.mass_tons, null);

// Real data: the Helicon needs a reactor, and it is the reactor that weighs something.
const helicon = loadPropulsion(TEMPLATES).find((d) => d.friendlyName === "Helicon Drive x6");
assert.equal(helicon.driveMass_tons, 0);
assert.ok(helicon.mass_tons > 100, "reactor mass dominates an electric drive");
assert.ok(helicon.totalResearchCost > 0);
