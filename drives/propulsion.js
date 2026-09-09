#!/usr/bin/env node

const path = require("node:path");
const { researchClosure } = require("./research-costs");
const { loadTemplates } = require("../templates");

// "req power" and "thrustRating_GW" arrive as strings with thousands separators.
const num = (value) => Number(String(value ?? 0).replaceAll(",", "")) || 0;
const isAlien = (item) => (item.requiredProjectName || "").startsWith("Project_Alien");

// Drive mass is the flat hull mass plus a per-jet-watt term; open-cycle drives (chemical,
// saltwater) carry their whole reactor this way and need no power plant at all.
const driveMass = (drive) =>
  num(drive.flatMass_tons) + num(drive.specificPower_kgMW) * num(drive.thrustRating_GW);

// A power plant is sized to the drive's draw, so its mass is that draw times its specific
// mass — but it cannot be sized past maxOutput_GW, and its class must be the one the drive
// demands ("Any_General" takes whichever class is cheapest).
const viablePlants = (plants, drive) => {
  const power = num(drive["req power"]);
  const wanted = drive.requiredPowerPlant;
  return plants.filter(
    (plant) =>
      !isAlien(plant) &&
      (wanted === "Any_General" || plant.powerPlantClass === wanted) &&
      plant.maxOutput_GW >= power,
  );
};

// Every drive+plant pairing, priced as one research closure so prereqs the drive and the
// reactor share are paid for once.
function propulsionPackages(drives, plants, projects, techs) {
  return drives.map((drive) => {
    const power = num(drive["req power"]);
    const mass = driveMass(drive);
    const price = (roots) => {
      const { items, cost } = researchClosure(projects, techs, roots);
      return cost.some((c) => c < 0)
        ? null
        : { researchCost: cost.reduce((sum, c) => sum + c, 0), researchItems: items.size };
    };
    const base = price([drive.requiredProjectName]);
    const options = (power > 0 ? viablePlants(plants, drive) : [])
      .map((plant) => {
        const cost = price([drive.requiredProjectName, plant.requiredProjectName].filter(Boolean));
        return cost && { plant, plantMass_tons: power * plant.specificPower_tGW, ...cost };
      })
      .filter(Boolean);
    // The reactor you would actually pair with the drive: the one that costs least to reach,
    // breaking ties on mass. Chasing a lighter reactor is a separate research decision.
    const pick = options.sort(
      (a, b) => a.researchCost - b.researchCost || a.plantMass_tons - b.plantMass_tons,
    )[0];
    return {
      ...drive,
      driveMass_tons: mass,
      power_GW: power,
      powerPlant: pick ? pick.plant.friendlyName : null,
      plantMass_tons: pick ? pick.plantMass_tons : 0,
      mass_tons: pick ? mass + pick.plantMass_tons : power > 0 ? null : mass,
      totalResearchCost: pick ? pick.researchCost : base && base.researchCost,
      researchItems: pick ? pick.researchItems : base ? base.researchItems : 0,
    };
  });
}

const loadPropulsion = (directory) => {
  const load = (name) => loadTemplates(directory, name);
  return propulsionPackages(
    load("TIDriveTemplate.json"),
    load("TIPowerPlantTemplate.json"),
    load("TIProjectTemplate.json"),
    load("TITechTemplate.json"),
  );
};

function main() {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  process.stdout.write(`${JSON.stringify(loadPropulsion(directory), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { propulsionPackages, loadPropulsion, driveMass, viablePlants };
