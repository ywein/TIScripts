#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// Nations that claim the whole planet by fiat (aliens, Protectorate) — not unifications.
const OMNI_NATIONS = new Set(["ALN", "1962_PRA"]);

// Localization ships as a base file plus a scenario file whose keys carry a suffix
// (displayName.COD.BrokenEarth = "Grand Basin", where the plain key says "Congo"). The scenario
// name always wins, so the two files can be read in any order.
function loadNationNames(directory, scenario = "BrokenEarth") {
  const plain = new Map();
  const scenarioNames = new Map();
  for (const file of fs.readdirSync(directory).filter((f) => /^TINationTemplate.*\.en$/.test(f))) {
    for (const line of fs.readFileSync(path.join(directory, file), "utf8").split(/\r?\n/)) {
      const [key, ...rest] = line.split("=");
      const match = key.match(/^TINationTemplate\.(displayName|unionDisplayName)\.([A-Za-z0-9_]+)(?:\.(\w+))?$/);
      if (!match || !rest.length) continue;
      const [, field, code, tag] = match;
      if (!tag) plain.set(`${field}.${code}`, rest.join("="));
      else if (tag === scenario) scenarioNames.set(`${field}.${code}`, rest.join("="));
    }
  }
  // field is "displayName" (what a nation is called) or "unionDisplayName" (what it is called
  // once it holds unionTrigger regions — several nations are already over that line in 1962).
  return (dataName, field = "displayName") => {
    const key = `${field}.${short(dataName)}`;
    return scenarioNames.get(key) || plain.get(key) || null;
  };
}

// One place that knows which files make a world, so the CLI and the page can never drift apart.
function loadWorld(directory = __dirname) {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
  const displayName = loadNationNames(directory);
  return buildWorld(
    read("TIBilateralTemplate.json").filter((r) => r.relationType === "Claim"),
    {
      regions: read("TIRegionTemplate.json"),
      names: read("TINationTemplate.json").map((n) => ({
        dataName: n.dataName,
        friendlyName: displayName(n.dataName) || n.friendlyName,
        unionName: displayName(n.dataName, "unionDisplayName"),
        unionTrigger: n.unionTrigger,
      })),
    },
  );
}

// capitalClaim marks "region1 is nation1's capital"; initialOwner marks "nation1 starts owning region1".
function buildWorld(claims, { omni = OMNI_NATIONS, regions = [], names = [] } = {}) {
  const pop = new Map(regions.map((r) => [r.dataName, r.population_Millions]));
  // The map labels a region by its primary city: KyushuandShikoku is "Fukuoka" on screen.
  const city = new Map(regions.filter((r) => r.primaryCity).map((r) => [r.dataName, r.primaryCity]));
  const label = new Map(names.map((n) => [n.dataName, n.friendlyName]));
  const union = new Map(
    names.filter((n) => n.unionName && n.unionTrigger).map((n) => [n.dataName, { name: n.unionName, trigger: n.unionTrigger }]),
  );
  const nations = new Map();
  const nation = (id) => {
    if (!nations.has(id)) nations.set(id, { id, capital: null, regions: [], claims: [] });
    return nations.get(id);
  };
  const ownerOf = new Map();
  for (const c of claims) {
    if (omni.has(c.nation1)) continue;
    const n = nation(c.nation1);
    if (c.capitalClaim) n.capital = c.region1;
    if (c.initialOwner) {
      n.regions.push(c.region1);
      ownerOf.set(c.region1, c.nation1);
    } else {
      n.claims.push({ region: c.region1, hostile: !!c.hostileClaim, project: c.projectUnlockName });
    }
  }
  // Only nations that own their own capital actually exist at game start.
  const existing = new Set([...nations.values()].filter((n) => n.capital && ownerOf.get(n.capital) === n.id).map((n) => n.id));
  return { nations, ownerOf, existing, pop, label, union, city };
}

// A peaceful claim on a region that is its owner's capital swallows the entire nation,
// then that nation's own claims can no longer be pressed, so the annexation must happen after
// it has used them: phases are printed deepest-first for that reason. Hostile claims take the
// region only, so they never grow the claim pool and are reported separately.
function annexTargets(world, nationId) {
  const out = [];
  for (const claim of world.nations.get(nationId).claims) {
    if (claim.hostile) continue;
    const target = world.ownerOf.get(claim.region);
    if (!target || target === nationId) continue;
    if (world.nations.get(target).capital !== claim.region) continue;
    out.push({ target, ...claim });
  }
  return out;
}

// The bloc a start can reach never depends on the route, so the route is chosen to spend the
// fewest claim unlocks: grow by free claims until nothing more is free, then spend one unlock and
// try again. A nation deeper in the bloc presses its own free claim before it is annexed (phases
// run deepest-first), so borrowing its claim costs nothing and stages the unification.
function unify(world, startId, { projects = true } = {}) {
  const allowed = (c) => projects || !c.project;
  const reach = new Set([startId]);
  const incoming = new Map(); // nation -> the claims that can swallow it whole
  for (const id of reach) {
    for (const t of annexTargets(world, id)) {
      if (!allowed(t) || t.target === startId) continue;
      reach.add(t.target); // Set iteration walks values appended during the loop
      if (!incoming.has(t.target)) incoming.set(t.target, []);
      incoming.get(t.target).push({ from: id, project: t.project, region: t.region });
    }
  }
  const bloc = new Map([[startId, { step: 0, via: null, project: null, region: null }]]);
  const joinable = (edges) =>
    edges.filter((e) => bloc.has(e.from)).sort((a, b) => bloc.get(a.from).step - bloc.get(b.from).step)[0];
  const attach = (id, e) => bloc.set(id, { step: bloc.get(e.from).step + 1, via: e.from, project: e.project, region: e.region });
  const pending = () => [...incoming].filter(([id, edges]) => !bloc.has(id) && edges.some((e) => bloc.has(e.from)));
  for (;;) {
    let grew = false;
    for (const [id, edges] of pending()) {
      const free = joinable(edges.filter((e) => !e.project));
      if (free) (attach(id, free), (grew = true));
    }
    if (grew) continue;
    // Nothing is free: spend an unlock on a nation nobody can annex for free, so the free claims
    // that nation carries stay available for the round after.
    const waiting = pending();
    const [id, edges] = waiting.find(([i]) => !incoming.get(i).some((e) => !e.project)) || waiting[0] || [];
    if (!id) break;
    attach(id, joinable(edges));
  }
  const regions = new Set();
  for (const id of bloc.keys()) for (const r of world.nations.get(id).regions) regions.add(r);
  // Leftover claims on nations we could not swallow whole: land grabs, one region at a time.
  const leftover = [];
  for (const id of bloc.keys())
    for (const c of world.nations.get(id).claims) if (!regions.has(c.region) && allowed(c)) leftover.push({ ...c, by: id });
  // A region a capital strike sweeps up anyway is not worth a move of its own — taking it early
  // just shuffles it between hands that both end up ours. So a claim riding an existing strike
  // beats a standalone grab, which beats a war of its own; ungated breaks the tie.
  const front = (c) => `${c.by}|${world.ownerOf.get(c.region)}`;
  const strikes = new Map();
  for (const c of leftover) if (c.hostile) strikes.set(front(c), (strikes.get(front(c)) || 0) + 1);
  const cost = (c) => (c.hostile ? (strikes.get(front(c)) > 1 ? 0 : 2) : 1) + (c.project ? 0.5 : 0);
  const grabs = new Map();
  for (const c of leftover) {
    const prev = grabs.get(c.region);
    if (!prev || cost(c) < cost(prev)) grabs.set(c.region, c);
  }
  const projectsNeeded = new Set();
  for (const m of bloc.values()) if (m.project) projectsNeeded.add(m.project);
  for (const g of grabs.values()) if (g.project) projectsNeeded.add(g.project);
  return { start: startId, bloc, regions, grabs, projectsNeeded, reach: regions.size + grabs.size };
}

// Claims are granted to a specific nation. Annex that nation and its claims die with it —
// they are NOT inherited, so the bloc above is only reachable if every nation presses its own
// claims BEFORE anyone swallows it. A nation with claims is an "engine"; an ungated peaceful
// claim on an engine's capital is a trap, because it can fire (or the AI can fire it) on turn 1.
function annexers(world, targetId) {
  const cap = world.nations.get(targetId).capital;
  const out = [];
  for (const [id, n] of world.nations) {
    if (id === targetId || !world.existing.has(id)) continue;
    for (const c of n.claims) if (c.region === cap && !c.hostile) out.push({ by: id, project: c.project });
  }
  return out;
}

function risks(world, u) {
  const scope = new Set(u.bloc.keys());
  const rows = [];
  for (const id of scope) {
    const n = world.nations.get(id);
    const gates = new Set(n.claims.filter((c) => !c.hostile || c.project).map((c) => c.project).filter(Boolean));
    const targets = annexTargets(world, id).filter((t) => scope.has(t.target));
    if (!targets.length && !gates.size) continue;
    const traps = annexers(world, id).filter((a) => !a.project);
    rows.push({ id, gates, targets, traps, weight: targets.length * 10 + gates.size });
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

// Regions carry the population; a bloc is worth the sum of what it holds plus what it seizes.
function population(world, regionIds) {
  let m = 0;
  for (const r of regionIds) m += world.pop.get(r) || 0;
  return m;
}

// Nations like Bolivia and the Dominion of America hold no land in 1962 — someone else sits on
// their capital. Their claims are real but only after an event puts them on the map, so they are
// ranked separately rather than mixed into what you can start doing on turn one.
function latentStarts(world) {
  return [...world.nations.values()]
    .filter((n) => !world.existing.has(n.id) && n.capital && n.claims.length)
    .map((n) => n.id);
}

function rank(world, opts = {}) {
  // Region count over-rewards war grabs; --by-pop ranks on people actually annexed peacefully.
  const key = opts.byPop ? (u) => population(world, u.regions) : (u) => u.reach;
  return [...(opts.starts || world.existing)]
    .map((id) => unify(world, id, opts))
    .sort((a, b) => key(b) - key(a) || b.bloc.size - a.bloc.size);
}

// Indonesia's bloc is wholly inside Westralia's, Angola's inside Ethiopia's: those are moves
// within a bigger unification, not separate outcomes. Keep only blocs nothing else contains.
function topBlocs(world, opts) {
  const all = rank(world, opts).filter((u) => u.bloc.size > 1);
  const contains = (a, b) => [...b.bloc.keys()].every((id) => a.bloc.has(id));
  return all.filter((u, i) => !all.some((v, j) => j !== i && contains(v, u) && (v.bloc.size > u.bloc.size || j < i)));
}

const short = (id) => String(id).replace(/^\d+_/, "");
// Nations rename themselves as they grow: hold unionTrigger regions and the game calls you by your
// union name (Java -> Indonesia). Default to what the nation holds in 1962, so a bare call gives
// the name on the map at game start — already the union name for Pomorze, Ethiopia and nine others.
const name = (world, id, regions = world.nations.get(id)?.regions.length || 0) => {
  const u = world.union.get(id);
  return short(u && regions >= u.trigger ? u.name : world.label.get(id) || id);
};
// Region dataNames run words together ("RiodeJaneiro"); split them back for the ones with no city.
const region = (world, id) =>
  world.city.get(id) || short(id).replace(/(de|of|and)(?=[A-Z])/g, " $1 ").replace(/([a-z])([A-Z])/g, "$1 $2");
const mpop = (world, region) => `${(world.pop.get(region) || 0).toFixed(1)}M`;

function summary(u, world) {
  // One war on a capital collects several regions, so count operations, not regions.
  const wars = plan(world, u).flat().filter((m) => m.kind === "war").length;
  const held = population(world, u.regions);
  const seized = population(world, u.grabs.keys());
  const lines = [
    `${name(world, u.start)}: ${u.reach} regions, ${(held + seized).toFixed(1)}M people — ` +
      `${u.bloc.size} nations unified (${u.regions.size} regions, ${held.toFixed(1)}M) ` +
      `+ ${u.grabs.size} regions seized (${wars} by war, ${seized.toFixed(1)}M)`,
  ];
  if (u.projectsNeeded.size) lines.push(`  projects: ${[...u.projectsNeeded].map(short).sort().join(", ")}`);
  return lines.join("\n");
}

// A nation acts only while it is independent, so every claim it presses has to land before it is
// annexed. The annexation of X sits at X's BFS depth; X's own land grabs therefore sit half a step
// deeper, and phases run deepest-first so no nation is ever shown acting after it was swallowed.
function plan(world, u) {
  const moves = [];
  for (const [id, m] of u.bloc)
    if (m.via) moves.push({ level: m.step, kind: "annex", by: m.via, nation: id, region: m.region, project: m.project });
  // Taking a nation's capital hands over every region of it the conqueror claims — the capital
  // itself only if claimed too — so several claims on one nation are ONE war. A lone claim is just
  // that region, captured directly. The victim survives on whatever it holds that nobody claimed.
  const strike = new Map(); // conqueror|victim -> the claims that one capital strike collects
  for (const g of u.grabs.values()) {
    if (!g.hostile) continue;
    const key = `${g.by}|${world.ownerOf.get(g.region)}`;
    if (!strike.has(key)) strike.set(key, { victim: world.ownerOf.get(g.region), regions: [], projects: new Set() });
    const s = strike.get(key);
    s.regions.push(g.region);
    if (g.project) s.projects.add(g.project);
  }
  for (const g of u.grabs.values()) {
    const s = g.hostile && strike.get(`${g.by}|${world.ownerOf.get(g.region)}`);
    const whole = s && s.regions.length > 1 ? s : null;
    if (whole && whole.regions[0] !== g.region) continue; // folded into the capital strike
    moves.push({
      level: u.bloc.get(g.by).step + 0.5,
      kind: g.hostile ? "war" : "grab",
      by: g.by,
      region: whole ? world.nations.get(whole.victim).capital : g.region,
      regions: whole ? whole.regions : [g.region],
      victim: whole ? whole.victim : null,
      killed: whole ? world.nations.get(whole.victim).regions.every((r) => whole.regions.includes(r)) : false,
      projects: whole ? [...whole.projects] : g.project ? [g.project] : [],
    });
  }
  const phases = [...new Set(moves.map((m) => m.level))]
    .sort((a, b) => b - a)
    .map((level) => moves.filter((m) => m.level === level));
  // Tally holdings in execution order so every move carries the region count each side had when it
  // was made — that is what decides whether the line reads "Java" or "Indonesia".
  const owned = new Map([...u.bloc.keys()].map((id) => [id, world.nations.get(id).regions.length]));
  // Moves inside a phase happen at once, so the gains land only at the end of it — otherwise the
  // same nation would appear twice in one phase under two different names.
  for (const phase of phases) {
    for (const m of phase) {
      m.byRegions = owned.get(m.by);
      m.nationRegions = m.kind === "annex" ? owned.get(m.nation) : m.regions.length;
    }
    for (const m of phase) owned.set(m.by, owned.get(m.by) + m.nationRegions);
  }
  return phases;
}

// A nation presses its own claims before it is swallowed (its grabs print one phase earlier), so
// what it hands over is its starting regions plus everything it took on the way.
function holdings(world, u, nationId) {
  const taken = [...u.grabs.values()].filter((g) => g.by === nationId).map((g) => g.region);
  return [...world.nations.get(nationId).regions, ...taken];
}

function report(u, world) {
  const lines = [summary(u, world)];
  plan(world, u).forEach((moves, i) => {
    lines.push(`  --- phase ${i + 1} ---`);
    for (const m of moves)
      lines.push(
        (m.kind === "annex"
          ? `  ${name(world, m.by, m.byRegions)} ANNEXES ${name(world, m.nation, m.nationRegions)} whole via ${region(world, m.region)} ` +
            `(+${holdings(world, u, m.nation).length} regions, ${population(world, holdings(world, u, m.nation)).toFixed(1)}M)`
          : m.regions.length > 1
            ? `  ${name(world, m.by, m.byRegions)} conquers ${name(world, m.victim)} via ${region(world, m.region)} ` +
              `(+${m.regions.length} regions, ${population(world, m.regions).toFixed(1)}M)${m.killed ? " — destroyed" : " — survives"}`
            : `  ${name(world, m.by, m.byRegions)} ${m.kind === "war" ? "conquers" : "takes"} ${region(world, m.region)} (${mpop(world, m.region)})`) +
          (m.kind === "annex"
            ? m.project
              ? ` [${short(m.project)}]`
              : ""
            : m.projects.length
              ? ` [${m.projects.map(short).join(" + ")}]`
              : ""),
      );
  });
  return lines.join("\n");
}

function riskReport(world, u) {
  const nm = (id) => name(world, id);
  const lines = [`KEEP INDEPENDENT — each of these presses its own claims; annex it early and they are gone for good.`];
  for (const r of risks(world, u)) {
    if (!r.targets.length) continue;
    lines.push(
      `  ${nm(r.id)} — annexes ${r.targets.map((t) => nm(t.target)).join(", ")}` +
        (r.gates.size ? `  [needs ${[...r.gates].map(short).sort().join(", ")}]` : "  [no project needed]"),
    );
    if (r.traps.length) lines.push(`     ⚠ ${r.traps.map((t) => nm(t.by)).join(", ")} can annex ${nm(r.id)} with no project — block that until ${nm(r.id)} is done.`);
  }
  const free = [...u.bloc.keys()].filter((id) => !risks(world, u).some((r) => r.id === id && r.targets.length));
  lines.push(`  everything else is disposable: ${free.map(nm).sort().join(", ")}`);
  return lines.join("\n");
}

function mermaid(u) {
  const lines = ["graph LR", `  ${short(u.start)}[["${short(u.start)}"]]`];
  for (const [id, m] of u.bloc) {
    if (!m.via) continue;
    lines.push(`  ${short(m.via)} -->|${m.project ? short(m.project) : short(m.region)}| ${short(id)}`);
  }
  return lines.join("\n");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { projects: !args.includes("--no-projects"), byPop: args.includes("--by-pop") };
  const wantMermaid = args.includes("--mermaid");
  const target = args.find((a) => !a.startsWith("--"));
  const world = loadWorld();

  if (target) {
    const id = world.nations.has(target) ? target : [...world.nations.keys()].find((k) => short(k) === target);
    if (!id) throw new Error(`unknown nation: ${target}`);
    const u = unify(world, id, opts);
    if (wantMermaid) console.log(mermaid(u));
    else console.log(args.includes("--risks") ? riskReport(world, u) : report(u, world));
  } else {
    for (const u of topBlocs(world, opts).slice(0, 15))
      console.log(args.includes("--steps") ? report(u, world) + "\n" : summary(u, world));
  }
}

module.exports = { buildWorld, holdings, region, loadWorld, unify, rank, topBlocs, latentStarts, plan, loadNationNames, annexTargets, annexers, risks, population, short, name };
