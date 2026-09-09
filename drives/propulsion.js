#!/usr/bin/env node

const path = require("node:path");
const { researchClosure } = require("./research-costs");
const { loadTemplates } = require("../templates");

// "req power" and "thrustRating_GW" arrive as strings with thousands separators.
const num = (value) => Number(String(value ?? 0).replaceAll(",", "")) || 0;
// One reference radiator for every drive so the numbers compare. Dusty Plasma rejects 18 kW/kg,
// which is what keeps the high-end drives from drowning in radiator mass.
const RADIATOR = "DustyPlasma";

// What a tank of propellant actually costs you, counting only the materials you are ever short
// of. Water, volatiles and metals are abundant enough to be free at this resolution; the weights
// below are a judgement call about relative scarcity, not something the templates state.
const MATERIAL_RARITY = { antimatter: 500, fissiles: 1, nobleMetals: 0.5 };
// The reference mission the supply bill is quoted for — the page's own defaults.
const REFERENCE_SHIP = { hull_tons: 5000, deltaV_kps: 10 };
// Above this, a drive is a museum piece: the Pion Torch bills 25,000 against 360 for the next
// worst drive in the game, so anything in the hundreds is still something you can fly.
const PRACTICAL_LIMIT = 1000;
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

// Rare materials per 100 t tank, weighted by how much it hurts to spend them.
const tankSupplyCost = (drive) =>
  Object.entries(drive.perTankPropellantMaterials || {}).reduce(
    (sum, [material, share]) => sum + share * 100 * (MATERIAL_RARITY[material] || 0),
    0,
  );

// Tanks come in 100 t units, so the bill for a mission is a whole number of them. Mirrors the
// rocket equation the chart runs client-side against whatever hull and Δv you type in.
const referenceTanks = (drive, mass_tons) =>
  drive.EV_kps > 0
    ? Math.ceil(
        ((REFERENCE_SHIP.hull_tons + mass_tons) *
          (Math.exp(REFERENCE_SHIP.deltaV_kps / drive.EV_kps) - 1)) /
          100,
      )
    : 0;

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
        // Only used to rank the plants against each other — see below, research cost is the
        // drive's alone.
        const cost = price([drive.requiredProjectName, plant.requiredProjectName].filter(Boolean));
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
    // Its research, like the radiator's, stays out of the price: both are only a reference, and
    // any given player will be flying whatever reactor and radiator they happen to have.
    const packMass = (option) => option.plantMass_tons + option.radiatorMass_tons;
    const pick = options.sort(
      (a, b) => a.researchCost - b.researchCost || packMass(a) - packMass(b),
    )[0];
    const perTank = tankSupplyCost(drive);
    const tanks = pick || power === 0 ? referenceTanks(drive, mass + (pick ? packMass(pick) : 0)) : 0;
    return {
      ...drive,
      driveMass_tons: mass,
      tankSupplyCost: perTank,
      referenceTanks: tanks,
      supplyBill: perTank * tanks,
      practical: perTank * tanks <= PRACTICAL_LIMIT,
      power_GW: power,
      powerPlant: pick ? pick.plant.friendlyName : null,
      plantMass_tons: pick ? pick.plantMass_tons : 0,
      wasteHeat_GW: pick ? pick.heat_GW : 0,
      radiator: pick && pick.heat_GW > 0 ? radiator.friendlyName : null,
      radiatorMass_tons: pick ? pick.radiatorMass_tons : 0,
      mass_tons: pick ? mass + packMass(pick) : power > 0 ? null : mass,
      totalResearchCost: base && base.researchCost,
      researchItems: base ? base.researchItems : 0,
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
module.exports = {
  propulsionPackages,
  loadPropulsion,
  driveMass,
  viablePlants,
  wasteHeat_GW,
  tankSupplyCost,
  MATERIAL_RARITY,
  PRACTICAL_LIMIT,
  REFERENCE_SHIP,
};
