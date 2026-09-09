#!/usr/bin/env node

const path = require("node:path");
const { loadTemplates } = require("../templates");

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
  const directory = path.resolve(process.argv[2] || path.join(__dirname, "..", "templates"));
  const result = calculateResearchCosts(
    loadTemplates(directory, "TIDriveTemplate.json"),
    loadTemplates(directory, "TIProjectTemplate.json"),
    loadTemplates(directory, "TITechTemplate.json"),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) main();
module.exports = { calculateResearchCosts, researchClosure };
