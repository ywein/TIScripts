#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { bestByBracket, driveScore, largestVariants, pickBest } = require("./best-drives");
const { loadPropulsion } = require("./propulsion");

const templates = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
const drives = loadPropulsion(templates);
// Alien drives are loot, not a research target: they only ever arrive from captured hulls.
const isAlien = (drive) => drive.requiredProjectName.startsWith("Project_Alien");
const chartData = largestVariants(drives)
  .filter((drive) => !isAlien(drive) && drive.EV_kps > 0 && drive.thrust_N > 0)
  .map((drive) => ({
    n: drive.friendlyName.replace(/ x\d+$/, ""),
    c: drive.driveClassification,
    e: drive.EV_kps,
    t: drive.thrust_N,
    r: drive.totalResearchCost,
    i: drive.researchItems,
    p: drive.propellant,
    f: drive.perTankPropellantMaterials,
    m: drive.mass_tons,
    dm: drive.driveMass_tons,
    w: drive.power_GW,
    pl: drive.powerPlant,
    pm: drive.plantMass_tons,
    rm: drive.radiatorMass_tons,
    q: drive.wasteHeat_GW,
    rd: drive.radiator,
    sb: drive.tankSupplyMonths,
  }));
const helicon = drives.find((drive) => drive.friendlyName === "Helicon Drive x6");
if (!helicon) throw new Error("Helicon Drive x6 not found");
// The brackets and their frontiers are fixed; the page decides which drive in each one you would
// actually fly, because that depends on the ship and Δv typed into it.
const brackets = bestByBracket(drives.filter((drive) => !isAlien(drive))).map((bracket) => ({
  label: bracket.label,
  min: bracket.min,
  max: bracket.max === Infinity ? null : bracket.max,
  drives: bracket.drives.map((item) => ({
    n: item.drive,
    r: item.researchCost,
    best: item.best,
    strong:
      item.drive !== "Helicon Drive" &&
      item.fuelEfficiency_kps >= helicon.EV_kps &&
      item.thrust_N >= helicon.thrust_N,
  })),
}));
const template = fs.readFileSync(path.join(__dirname, "fuel-efficiency-thrust.template.html"), "utf8");
const output = template
  .replace("__DRIVES__", JSON.stringify(chartData))
  .replace("__BRACKETS__", JSON.stringify(brackets))
  .replace("__SCORE__", driveScore.toString())
  .replace("__PICK__", pickBest.toString());

if (["__DRIVES__", "__BRACKETS__", "__SCORE__", "__PICK__"].some((mark) => output.includes(mark))) {
  throw new Error("Chart template placeholders were not replaced");
}
fs.writeFileSync(path.join(__dirname, "fuel-efficiency-thrust.html"), output);
