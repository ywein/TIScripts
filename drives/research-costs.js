#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function load(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// The project list ships as a base file plus a per-scenario overlay (the 1962 start is tagged
// PostApoc). An overlay record replaces the base one WHOLE, never field-by-field: it drops
// prereqs the base had. Records tagged for a different scenario are not in this game at all.
function loadProjects(directory, scenario = "PostApoc") {
  const byName = new Map();
  for (const file of fs.readdirSync(directory).filter((f) => /^TIProjectTemplate.*\.json$/.test(f)).sort()) {
    for (const project of load(path.join(directory, file))) {
      if (project.scenarioTags && !project.scenarioTags.includes(scenario)) continue;
      if (project.scenarioTags || !byName.has(project.dataName)) byName.set(project.dataName, project);
    }
  }
  return [...byName.values()];
}

// Every project and tech a set of roots transitively needs, each counted once — shared
// prereqs are paid for only the first time, so pass all the roots together.
function researchClosure(projects, techs, roots) {
  const nodes = new Map([...projects, ...techs].map((item) => [item.dataName, item]));
  const seen = new Set();
  const visiting = new Set();
  const walk = (root) => {
    if (visiting.has(root)) throw new Error(`Research dependency cycle at ${root}`);
    if (seen.has(root)) return;
    const item = nodes.get(root);
    if (!item) throw new Error(`Unknown research dependency: ${root}`);
    seen.add(root);
    visiting.add(root);
    for (const prereq of item.prereqs || []) walk(prereq);
    visiting.delete(root);
  };
  for (const root of roots) walk(root);
  return { items: seen, cost: [...seen].map((name) => nodes.get(name).researchCost) };
}

function calculateResearchCosts(drives, projects, techs) {
  return drives.map((drive) => {
    const { items: research, cost: costs } = researchClosure(projects, techs, [drive.requiredProjectName]);
    return {
      ...drive,
      totalResearchCost: costs.some((cost) => cost < 0)
        ? null
        : costs.reduce((sum, cost) => sum + cost, 0),
      researchItems: research.size,
    };
  });
}

function main() {
  const directory = path.resolve(process.argv[2] || ".");
  const result = calculateResearchCosts(
    load(path.join(directory, "TIDriveTemplate.json")),
    loadProjects(directory),
    load(path.join(directory, "TITechTemplate.json")),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { calculateResearchCosts, researchClosure, loadProjects };
