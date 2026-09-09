#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { calculateResearchCosts } = require("./research-costs");
const { bestByBracket, largestVariants } = require("./best-drives");
const { loadTemplates } = require("../templates");

const templates = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
const load = (name) => loadTemplates(templates, name);
const drives = calculateResearchCosts(
  load("TIDriveTemplate.json"),
  load("TIProjectTemplate.json"),
  load("TITechTemplate.json"),
);
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
  }));
const helicon = drives.find((drive) => drive.friendlyName === "Helicon Drive x6");
if (!helicon) throw new Error("Helicon Drive x6 not found");
const escape = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const brackets = Object.entries(bestByBracket(drives.filter((drive) => !isAlien(drive))))
  .map(
    ([label, items]) =>
      `<section><h4>${escape(label)}</h4><ul>${items
        .map(
          (item) => {
            const name = escape(item.drive);
            const betterThanHelicon =
              item.drive !== "Helicon Drive" &&
              item.fuelEfficiency_kps >= helicon.EV_kps &&
              item.thrust_N >= helicon.thrust_N;
            return `<li data-drive="${name}">${betterThanHelicon ? `<strong>${name}</strong>` : `<span>${name}</span>`}<small>${item.researchCost.toLocaleString("en-US")} RP</small></li>`;
          },
        )
        .join("")}</ul></section>`,
  )
  .join("");
const best = `<section class="best" aria-labelledby="best-title"><h3 id="best-title">Best drives by research bracket</h3><p>Pareto-optimal for fuel efficiency and thrust · bold drives meet or exceed Helicon in both</p><div class="brackets">${brackets}</div></section>`;
const template = fs.readFileSync(path.join(__dirname, "fuel-efficiency-thrust.template.html"), "utf8");
const output = template
  .replace("__DRIVES__", JSON.stringify(chartData))
  .replace("__BEST_DRIVES__", best);

if (output.includes("__DRIVES__") || output.includes("__BEST_DRIVES__")) {
  throw new Error("Chart template placeholders were not replaced");
}
fs.writeFileSync(path.join(__dirname, "fuel-efficiency-thrust.html"), output);
