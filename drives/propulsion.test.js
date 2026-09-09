const assert = require("node:assert/strict");
const { propulsionPackages, loadPropulsion } = require("./propulsion");
const TEMPLATES = require("node:path").join(__dirname, "..", "templates");

const plants = [
  { dataName: "small", friendlyName: "Small", powerPlantClass: "Fission", maxOutput_GW: 1, specificPower_tGW: 40, efficiency: 0.6 },
  { dataName: "big", friendlyName: "Big", powerPlantClass: "Fission", maxOutput_GW: 10, specificPower_tGW: 4, efficiency: 0.75, requiredProjectName: "plant" },
  { dataName: "other", friendlyName: "Other", powerPlantClass: "Fusion", maxOutput_GW: 99, specificPower_tGW: 1, efficiency: 0.9 },
];
const projects = [
  { dataName: "drive", researchCost: 10, prereqs: ["shared"] },
  { dataName: "plant", researchCost: 20, prereqs: ["shared"] },
];
const techs = [{ dataName: "shared", researchCost: 5 }];
const radiators = [
  { dataName: "DustyPlasma", friendlyName: "Dusty", specificPower_2s_KWkg: 8 },
];
const drive = (fields) => ({
  requiredProjectName: "drive",
  requiredPowerPlant: "Fission",
  cooling: "Closed",
  ...fields,
});

const [big, flat, tiny] = propulsionPackages(
  [
    drive({ "req power": "2.000" }), // over Small's cap, so only Big can carry it
    drive({ "req power": 0, flatMass_tons: 50, cooling: "Open" }), // open cycle: no plant at all
    drive({ "req power": "0.500", specificPower_kgMW: 10, thrustRating_GW: "1.000" }),
  ],
  plants,
  projects,
  techs,
  radiators,
);

assert.equal(big.powerPlant, "Big");
assert.equal(big.plantMass_tons, 8); // 2 GW x 4 t/GW
assert.equal(big.wasteHeat_GW, 0.5); // (1 - 0.75) x 2 GW
assert.equal(big.radiatorMass_tons, 62.5); // 0.5 GW at 8 kW/kg
assert.equal(big.mass_tons, 70.5);
assert.equal(big.totalResearchCost, 15); // the drive alone: reactor and radiator are reference only
assert.equal(flat.powerPlant, null);
assert.equal(flat.mass_tons, 50);
assert.equal(flat.radiator, null, "open cycle radiates through the nozzle");
assert.equal(flat.totalResearchCost, 15);
assert.equal(tiny.powerPlant, "Small"); // cheaper to research than Big, and it fits
assert.equal(tiny.mass_tons, 55); // 10 t drive + 20 t reactor + 25 t radiator

// A drive never draws on a power plant class it does not accept.
const [strict] = propulsionPackages(
  [drive({ "req power": "50.000" })],
  plants,
  projects,
  techs,
  radiators,
);
assert.equal(strict.mass_tons, null);

// Real data: the Helicon needs a reactor, and it is the reactor that weighs something.
const helicon = loadPropulsion(TEMPLATES).find((d) => d.friendlyName === "Helicon Drive x6");
assert.equal(helicon.driveMass_tons, 0);
assert.ok(helicon.plantMass_tons > 100, "reactor mass dominates an electric drive");
assert.equal(helicon.radiator, "Dusty Plasma Radiator"); // the l10n name, not the JSON friendlyName
assert.ok(helicon.radiatorMass_tons > 100, "and the radiator is a big chunk again");
assert.ok(helicon.totalResearchCost > 0);
