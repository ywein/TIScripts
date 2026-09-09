#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { researchClosure } = require("../drives/research-costs");
const { loadTemplates } = require("../templates");
const { loadWorld, unify, topBlocs, latentStarts, plan, risks, population, holdings, region, short, name } = require("./unifications");

const templates = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
const projectTemplates = loadTemplates(templates, "TIProjectTemplate.json");
const techTemplates = loadTemplates(templates, "TITechTemplate.json");
const projectTemplate = new Map(projectTemplates.map((p) => [p.dataName, p]));
// A handful of claim unlocks (the BSBE set) have no entry in the project tree: they arrive from
// events, not research, so they carry no price and cannot be planned for.
const pname = (id) =>
  short(projectTemplate.get(id)?.friendlyName || id.replace(/^Project_(BSBE_)?/, "").replace(/([a-z])([A-Z])/g, "$1 $2"));
const world = loadWorld(templates);

// Prereqs are shared, so a bloc's research bill is the closure of all its projects at once,
// not the sum of their sticker prices. A negative cost marks something you cannot research.
function researchBill(projects) {
  const researchable = projects.filter((p) => projectTemplate.has(p));
  const unresearchable = projects.filter((p) => !projectTemplate.has(p)).map(pname).sort();
  // No researchable projects but some unlocks needed is not "free" — it is "cannot be planned".
  if (!researchable.length) return { rp: projects.length ? null : 0, items: 0, unresearchable };
  const { items, cost } = researchClosure(projectTemplates, techTemplates, researchable);
  return {
    rp: cost.some((c) => c < 0) ? null : cost.reduce((a, b) => a + b, 0),
    items: items.size,
    unresearchable,
  };
}

const phases = (u) =>
  plan(world, u).map((moves) =>
    moves
      .map((m) =>
        m.kind === "annex"
          ? {
              kind: "annex",
              by: name(world, m.by, m.byRegions),
              what: name(world, m.nation, m.nationRegions),
              where: region(world, m.region),
              pop: population(world, holdings(world, u, m.nation)),
              regions: holdings(world, u, m.nation).length,
              project: m.project ? pname(m.project) : null,
            }
          : {
              // A capital strike is one war listed under the nation it hits, with the capital as
              // the "via" region; everything else is a single region taken on its own.
              kind: m.kind,
              by: name(world, m.by, m.byRegions),
              what: m.regions.length > 1 ? name(world, m.victim) : region(world, m.region),
              where: m.regions.length > 1 ? region(world, m.region) : null,
              pop: population(world, m.regions),
              regions: m.regions.length,
              project: m.projects.length ? m.projects.map(pname).join(" + ") : null,
            },
      )
      .sort((a, b) => b.pop - a.pop),
  );

const describe = (latent) => (u) => {
  const grabs = [...u.grabs.values()];
  const warRegions = grabs.filter((g) => g.hostile).map((g) => g.region);
  const phaseList = phases(u);
  const projects = [...u.projectsNeeded];
  return {
    id: short(u.start),
    name: name(world, u.start),
    nations: u.bloc.size,
    regions: u.reach,
    held: population(world, u.regions),
    grabbed: population(world, grabs.filter((g) => !g.hostile).map((g) => g.region)),
    seized: population(world, warRegions),
    wars: phaseList.flat().filter((m) => m.kind === "war").length,
    ...researchBill(projects),
    projects: projects.map(pname).sort(),
    keep: risks(world, u)
      .filter((r) => r.targets.length)
      .map((r) => ({
        name: name(world, r.id),
        targets: r.targets.map((t) => name(world, t.target)),
        gates: [...r.gates].map(pname).sort(),
        traps: r.traps.map((t) => name(world, t.by)),
      })),
    phases: phaseList,
    latent: latent ? name(world, world.ownerOf.get(world.nations.get(u.start).capital)) : null,
  };
};

const blocs = [
  ...topBlocs(world, {}).map(describe(false)),
  ...topBlocs(world, { starts: latentStarts(world) }).map(describe(true)),
];

// Below ~100M a "unification" is two neighbours merging: real, but not a mega-nation.
const large = blocs
  .filter((b) => b.held + b.grabbed + b.seized >= 100)
  .sort((a, b) => b.held + b.grabbed + b.seized - (a.held + a.grabbed + a.seized));

const template = fs.readFileSync(path.join(__dirname, "unifications.template.html"), "utf8");
const output = template.replace("__BLOCS__", JSON.stringify(large));
if (output.includes("__BLOCS__")) throw new Error("Template placeholder was not replaced");
fs.writeFileSync(path.join(__dirname, "unifications.html"), output);
console.log(`${large.length} of ${blocs.length} blocs -> unifications.html`);
