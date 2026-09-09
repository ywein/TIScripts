#!/usr/bin/env node

const path = require("node:path");
const { researchClosure } = require("./research-costs");
const { loadTemplates } = require("../templates");

// "req power" and "thrustRating_GW" arrive as strings with thousands separators.
const num = (value) => Number(String(value ?? 0).replaceAll(",", "")) || 0;
// A mid-tier droplet radiator, used as the reference for every drive so the numbers compare.
const RADIATOR = "TinDroplet";
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

// Open-cycle drives throw their waste heat out of the nozzle. Everything else has to radiate
// what the reactor does not turn into power.
// "Calc" cooling behaves as closed-cycle: checked against the game's ship builder, where a
// Helicon Drive x6 on a Solid Core Fission Reactor IV reports 286 t of reactor and 521.8 t of
// Tin Droplet radiator, against 286.18 t and 521.68 t here.
const wasteHeat_GW = (drive, plant) =>
  drive.cooling === "Open" ? 0 : (1 - plant.efficiency) * num(drive["req power"]);

// Radiators are rated in kW rejected per kg, so tons per GW is 1000 / that.
const radiatorMass = (heat_GW, radiator) => (heat_GW * 1000) / radiator.specificPower_2s_KWkg;

// Every drive+plant pairing, priced as one research closure so prereqs the drive, the reactor
// and the radiator share are paid for once.
function propulsionPackages(drives, plants, projects, techs, radiators = []) {
  return drives.map((drive) => {
    const power = num(drive["req power"]);
    const mass = driveMass(drive);
    const price = (roots) => {
      const { items, cost } = researchClosure(projects, techs, roots);
      return cost.some((c) => c < 0)
        ? null
        : { researchCost: cost.reduce((sum, c) => sum + c, 0), researchItems: items.size };
    };
    const radiator = radiators.find((item) => item.dataName === RADIATOR);
    const base = price([drive.requiredProjectName]);
    const options = (power > 0 ? viablePlants(plants, drive) : [])
      .map((plant) => {
        const heat = radiator ? wasteHeat_GW(drive, plant) : 0;
        const cost = price(
          [
            drive.requiredProjectName,
            plant.requiredProjectName,
            heat > 0 && radiator.requiredProjectName,
          ].filter(Boolean),
        );
        return (
          cost && {
            plant,
            plantMass_tons: power * plant.specificPower_tGW,
            heat_GW: heat,
            radiatorMass_tons: heat > 0 ? radiatorMass(heat, radiator) : 0,
            ...cost,
          }
        );
      })
      .filter(Boolean);
    // The reactor you would actually pair with the drive: the one that costs least to reach,
    // breaking ties on mass — a more efficient plant also drags fewer radiators along.
    const packMass = (option) => option.plantMass_tons + option.radiatorMass_tons;
    const pick = options.sort(
      (a, b) => a.researchCost - b.researchCost || packMass(a) - packMass(b),
    )[0];
    return {
      ...drive,
      driveMass_tons: mass,
      power_GW: power,
      powerPlant: pick ? pick.plant.friendlyName : null,
      plantMass_tons: pick ? pick.plantMass_tons : 0,
      wasteHeat_GW: pick ? pick.heat_GW : 0,
      radiator: pick && pick.heat_GW > 0 ? radiator.friendlyName : null,
      radiatorMass_tons: pick ? pick.radiatorMass_tons : 0,
      mass_tons: pick ? mass + packMass(pick) : power > 0 ? null : mass,
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
    load("TIRadiatorTemplate.json"),
  );
};

function main() {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  process.stdout.write(`${JSON.stringify(loadPropulsion(directory), null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { propulsionPackages, loadPropulsion, driveMass, viablePlants, wasteHeat_GW };
