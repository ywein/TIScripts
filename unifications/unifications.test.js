const assert = require("node:assert/strict");
const { buildWorld, loadWorld, loadNationNames, unify, topBlocs, latentStarts, plan, annexers, risks, population, holdings, name } = require("./unifications");
const TEMPLATES = require("node:path").join(__dirname, "..", "templates");

const claim = (nation, region, extra = {}) => ({ relationType: "Claim", nation1: nation, region1: region, ...extra });

// A owns Acap+Aland, B owns Bcap, C owns Ccap+Cland.
// A -> B peacefully via B's capital; B -> C peacefully via C's capital (only reachable after annexing B).
// A also has a hostile claim on Cland and a peaceful claim on a non-capital region of C.
const world = buildWorld([
  claim("A", "Acap", { capitalClaim: true, initialOwner: true }),
  claim("A", "Aland", { initialOwner: true }),
  claim("B", "Bcap", { capitalClaim: true, initialOwner: true }),
  claim("C", "Ccap", { capitalClaim: true, initialOwner: true }),
  claim("C", "Cland", { initialOwner: true }),
  claim("A", "Bcap"),
  claim("A", "Cland", { hostileClaim: true }),
  claim("B", "Ccap", { projectUnlockName: "P" }),
  claim("D", "Dcap", { capitalClaim: true }), // latent nation, owns nothing
], {
  regions: [
    { dataName: "Acap", population_Millions: 10 },
    { dataName: "Aland", population_Millions: 1 },
    { dataName: "Bcap", population_Millions: 2 },
    { dataName: "Ccap", population_Millions: 4 },
    { dataName: "Cland", population_Millions: 8 },
  ],
  names: [{ dataName: "A", friendlyName: "1962_Ayland" }],
});

assert.deepEqual([...world.existing].sort(), ["A", "B", "C"]);

const full = unify(world, "A");
assert.deepEqual([...full.bloc.keys()], ["A", "B", "C"]);
assert.equal(full.regions.size, 5);
assert.deepEqual([...full.projectsNeeded], ["P"]);
assert.equal(full.bloc.get("C").via, "B"); // snowball: C only via B's inherited claim
assert.equal(full.grabs.size, 0); // Cland came along with C
assert.equal(full.reach, 5);

const gated = unify(world, "A", { projects: false });
assert.deepEqual([...gated.bloc.keys()], ["A", "B"]);
assert.deepEqual([...gated.grabs.keys()], ["Cland"]); // hostile claim only: one region, needs war
assert.equal(gated.grabs.get("Cland").hostile, true);
assert.equal(gated.reach, 4); // 3 owned + Cland taken by war, which rides along if A is annexed

const fromB = unify(world, "B");
assert.deepEqual([...fromB.bloc.keys()], ["B", "C"]); // claims do not flow backwards

// Claim engines: A must press its claim on Bcap before anyone swallows A, and B likewise on Ccap.
assert.deepEqual(annexers(world, "B").map((a) => a.by), ["A"]);
assert.deepEqual(annexers(world, "A"), []); // nobody claims Acap
const r = risks(world, full);
assert.deepEqual(r.map((x) => x.id), ["B", "A"]); // C has no annex targets; B ranks first, it is project-gated
assert.deepEqual([...r[0].gates], ["P"]); // B cannot move until project P is done
assert.deepEqual(r[0].traps.map((t) => t.by), ["A"]); // ...and A can eat B with no project at all

// Population rides on regions, so it follows whichever bloc ends up holding them.
assert.equal(population(world, full.regions), 25);
assert.equal(population(world, unify(world, "B").regions), 14); // B+C only
assert.equal(population(world, gated.regions), 13); // A+B; Cland is a war grab, counted separately
assert.equal(population(world, gated.grabs.keys()), 8);
assert.equal(population(world, ["Acap", "nosuchregion"]), 10); // unknown regions contribute nothing
assert.equal(world.label.get("A"), "1962_Ayland");

// B's bloc {B,C} sits wholly inside A's {A,B,C}: one unification, not two.
assert.deepEqual(topBlocs(world, {}).map((u) => u.start), ["A"]);

// D owns nothing (C sits on no region of D's, but D's capital is unowned) so it never ranks by
// default; it only appears once you ask for the nations that must be formed first.
const latent = buildWorld([
  claim("A", "Acap", { capitalClaim: true, initialOwner: true }),
  claim("B", "Bcap", { capitalClaim: true, initialOwner: true }),
  claim("D", "Dcap", { capitalClaim: true }),
  claim("A", "Dcap", { initialOwner: true }), // A squats on D's capital
  claim("D", "Bcap"),
]);
assert.deepEqual(latentStarts(latent), ["D"]);
assert.deepEqual(topBlocs(latent, {}).map((u) => u.start), []); // nothing existing can annex
assert.deepEqual(topBlocs(latent, { starts: latentStarts(latent) }).map((u) => u.start), ["D"]);

// Ordering: B grabs Eland off E, and only then may A annex B. A plan that annexes B first is
// wrong — B no longer exists to press anything.
const chain = buildWorld([
  claim("A", "Acap", { capitalClaim: true, initialOwner: true }),
  claim("B", "Bcap", { capitalClaim: true, initialOwner: true }),
  claim("C", "Ccap", { capitalClaim: true, initialOwner: true }),
  claim("E", "Ecap", { capitalClaim: true, initialOwner: true }),
  claim("E", "Eland", { initialOwner: true }),
  claim("A", "Bcap"),
  claim("B", "Ccap"),
  claim("B", "Eland"), // non-capital: a land grab, not an annexation
]);
const steps = plan(chain, unify(chain, "A")).map((moves) =>
  moves.map((m) => (m.kind === "annex" ? `${m.by}+${m.nation}` : `${m.by}>${m.region}`)),
);
assert.deepEqual(steps, [["B+C"], ["B>Eland"], ["A+B"]]);
const grabbed = steps.findIndex((s) => s.includes("B>Eland"));
assert.ok(grabbed < steps.findIndex((s) => s.includes("A+B")), "B must grab before it is annexed");

// Localization: the scenario key wins over the plain one, and unknown codes fall through.
const display = loadNationNames(TEMPLATES);
assert.equal(display("1962_COD"), "Grand Basin"); // BrokenEarth override; plain key says Congo
assert.equal(display("1962_ETH"), "Ethiopia"); // no override, plain key
assert.equal(display("1962_NOPE"), null);
assert.equal(loadNationNames(TEMPLATES, "NoSuchScenario")("1962_COD"), "Congo"); // override ignored

// The CLI and the page must build the same world, names included.
assert.equal(loadWorld(TEMPLATES).label.get("1962_COD"), "Grand Basin");

// A nation grabs before it is annexed, so it hands over its own land plus what it took.
const chainU = unify(chain, "A");
assert.deepEqual(holdings(chain, chainU, "B").sort(), ["Bcap", "Eland"]);

// Free routes win over gated shortcuts: A can take Z directly with project P, or for nothing via Y.
const routes = buildWorld([
  claim("A", "Acap", { capitalClaim: true, initialOwner: true }),
  claim("Y", "Ycap", { capitalClaim: true, initialOwner: true }),
  claim("Z", "Zcap", { capitalClaim: true, initialOwner: true }),
  claim("A", "Ycap"),
  claim("A", "Zcap", { projectUnlockName: "P" }),
  claim("Y", "Zcap"),
]);
const free = unify(routes, "A");
assert.equal(free.bloc.get("Z").via, "Y");
assert.deepEqual([...free.projectsNeeded], []);
const stepZ = free.bloc.get("Z").step;
assert.ok(stepZ > free.bloc.get("Y").step, "Y must annex Z before A annexes Y");

// Unlocks are spent on nations nobody can take for free (W), never on one a bloc member can
// already reach for nothing (V) — otherwise the free claim W carries is wasted.
const order = buildWorld([
  claim("A", "Acap", { capitalClaim: true, initialOwner: true }),
  claim("W", "Wcap", { capitalClaim: true, initialOwner: true }),
  claim("V", "Vcap", { capitalClaim: true, initialOwner: true }),
  claim("A", "Wcap", { projectUnlockName: "P" }),
  claim("A", "Vcap", { projectUnlockName: "P" }),
  claim("W", "Vcap"),
]);
const staged = unify(order, "A");
assert.equal(staged.bloc.get("V").via, "W");
assert.ok(!staged.bloc.get("V").project);
assert.equal([...staged.bloc.values()].filter((m) => m.project).length, 1);

// Nations rename themselves once they hold unionTrigger regions: J starts under the trigger and
// crosses it by annexing K, so it presses its next claim under the new name.
const growing = buildWorld([
  claim("J", "Jcap", { capitalClaim: true, initialOwner: true }),
  claim("K", "Kcap", { capitalClaim: true, initialOwner: true }),
  claim("M", "Mcap", { capitalClaim: true, initialOwner: true }),
  claim("M", "Mland", { initialOwner: true }),
  claim("J", "Kcap"), // K's capital: annexes K whole
  claim("J", "Mland"), // not a capital: a land grab, one phase later
], { names: [{ dataName: "J", friendlyName: "Java", unionName: "Indonesia", unionTrigger: 2 }] });
assert.equal(name(growing, "J"), "Java"); // 1 region at start, under the trigger
const named = plan(growing, unify(growing, "J")).map((phase) =>
  phase.map((m) => `${name(growing, m.by, m.byRegions)}>${m.nation || m.region}`),
);
assert.deepEqual(named, [["Java>K"], ["Indonesia>Mland"]]);

// Conquering a capital collects every region of that nation the conqueror claims: one war, not one
// per region. P keeps the region nobody claimed; Q, fully claimed, is destroyed.
const conquest = buildWorld([
  claim("N", "Ncap", { capitalClaim: true, initialOwner: true }),
  claim("P", "Pcap", { capitalClaim: true, initialOwner: true }),
  claim("P", "Pland", { initialOwner: true }),
  claim("P", "Pfree", { initialOwner: true }),
  claim("Q", "Qcap", { capitalClaim: true, initialOwner: true }),
  claim("Q", "Qland", { initialOwner: true }),
  claim("N", "Pcap", { hostileClaim: true }),
  claim("N", "Pland", { hostileClaim: true }),
  claim("N", "Qcap", { hostileClaim: true }),
  claim("N", "Qland", { hostileClaim: true }),
]);
const taken = plan(conquest, unify(conquest, "N")).flat();
assert.equal(taken.length, 2, "four hostile claims, two capitals: two wars");
const [p, q] = taken.sort((a, b) => a.victim.localeCompare(b.victim));
assert.deepEqual([p.region, p.regions.sort(), p.killed], ["Pcap", ["Pcap", "Pland"], false]); // Pfree survives
assert.deepEqual([q.region, q.regions.sort(), q.killed], ["Qcap", ["Qcap", "Qland"], true]);

// The capital need not be claimed: claims on two of R's regions are still one strike, aimed at
// R's capital, and R survives because the capital itself stays its own.
const uncapped = buildWorld([
  claim("N", "Ncap", { capitalClaim: true, initialOwner: true }),
  claim("R", "Rcap", { capitalClaim: true, initialOwner: true }),
  claim("R", "Rone", { initialOwner: true }),
  claim("R", "Rtwo", { initialOwner: true }),
  claim("N", "Rone", { hostileClaim: true }),
  claim("N", "Rtwo", { hostileClaim: true, projectUnlockName: "P" }),
]);
const hit = plan(uncapped, unify(uncapped, "N")).flat();
assert.equal(hit.length, 1);
assert.deepEqual([hit[0].region, hit[0].regions.sort(), hit[0].killed], ["Rcap", ["Rone", "Rtwo"], false]);
assert.deepEqual(hit[0].projects, ["P"]); // gates of every folded claim, not just the capital's

// A region a capital strike sweeps up anyway is not worth a move of its own: X's peaceful claim on
// Vland is dropped, because Y conquers V and Vland comes with it.
const shuffle = buildWorld([
  claim("X", "Xcap", { capitalClaim: true, initialOwner: true }),
  claim("Y", "Ycap", { capitalClaim: true, initialOwner: true }),
  claim("V", "Vcap", { capitalClaim: true, initialOwner: true }),
  claim("V", "Vland", { initialOwner: true }),
  claim("X", "Ycap"), // X annexes Y whole
  claim("X", "Vland"), // peaceful, but redundant
  claim("Y", "Vcap", { hostileClaim: true }),
  claim("Y", "Vland", { hostileClaim: true }),
]);
const tidy = unify(shuffle, "X");
assert.equal(tidy.grabs.get("Vland").by, "Y", "Vland rides Y's strike instead of being taken twice");
const wars = plan(shuffle, tidy).flat().filter((m) => m.kind !== "annex");
assert.equal(wars.length, 1, "one war, not a war plus a grab");
assert.deepEqual(wars[0].regions.sort(), ["Vcap", "Vland"]);
