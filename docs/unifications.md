# Unification rules

How `unifications/unifications.js` turns the game's bilateral records into blocs. Every rule below
is a rule of the game data, not of this repo, except where marked *(our heuristic)*.

## The raw material

A world is built from `TIBilateralTemplate.json` records with `relationType: "Claim"`, plus
`TIRegionTemplate.json` (population, primary city) and `TINationTemplate.json` (names, union
trigger). A claim record says something about `nation1` and `region1`:

| Field | Meaning |
| --- | --- |
| `initialOwner` | nation1 starts the game owning region1 |
| `capitalClaim` | region1 is nation1's capital |
| `hostileClaim` | the claim is pressed by war, not by unification |
| `projectUnlockName` | the claim is inert until that project is researched |
| none of the above | a peaceful claim on someone else's region |

A record can be both `initialOwner` and `capitalClaim` — that is a nation sitting on its own
capital. Aliens and the Protectorate (`ALN`, `1962_PRA`) claim the whole planet by fiat and are
dropped entirely; they are not unifications.

**A nation exists at game start only if it owns its own capital.** Nations whose capital is held by
somebody else (Bolivia, the Dominion of America) are *latent*: their claims are real but nothing can
happen until an event puts them on the map. `latentStarts` lists them, and the page ranks them
separately from turn-one starts.

## Two ways to press a claim

- **Peaceful claim on a nation's capital → you swallow the entire nation**, all its regions at once.
  This is unification.
- **Peaceful claim on a non-capital region → you take that one region**, no war.
- **Hostile claim → war.** Taking a victim's capital hands over every region of that victim you
  claim (the capital itself only if you claim it too), so several hostile claims on one nation are
  *one* war, not several. The victim survives on whatever it holds that you never claimed.

A hostile claim never grows the bloc, so wars are reported separately from unifications throughout —
but see [Laundering a hostile claim](#laundering-a-hostile-claim): with enough patience a hostile
capital claim becomes a peaceful one, and the model does not account for that.

## Claims are not inherited

This is the rule that shapes everything. A claim belongs to a specific nation. **Annex that nation
and its claims die with it.** So a bloc two levels deep is reachable only if the middle nation
presses its own claim *before* it is swallowed.

Consequences:

- Ordering matters. `plan()` puts the annexation of X at X's BFS depth and X's own land grabs half a
  step deeper, then prints phases **deepest-first** — so no nation is ever shown acting after it was
  swallowed.
- A nation carrying claims is an **engine**. `risks()` ranks them; `riskReport` prints
  "KEEP INDEPENDENT — unify it early and they are gone for good".
- An **ungated peaceful claim on an engine's capital is a trap**: it can fire on turn one, by you or
  by the AI, and burns the engine before it has moved. `annexers()` finds those.

## Laundering a hostile claim

**Off by default, opt in with `--launder` (CLI) or the *Launder hostile claims* toggle on the page.**
This is a player technique the data does not state, which is why it is never the default view.
A hostile claim on a capital looks like a dead end: war gives you only the regions you claim, and the victim keeps the rest. But
hostility is not permanent. Conquer the capital, hold it, and eventually the region turns
non-hostile — and the claim on it turns with it. Then:

1. **Conquer** the target's capital with the hostile claim.
2. **Wait** for that region to stop being hostile. Your claim on it becomes peaceful.
3. **Release** the nation. It comes back holding every non-hostile region its captor held for it,
   and owning its own capital again — so it exists again, and its own claims are live again.
4. **Let it press those claims.** You control the released nation too (this game lets you run
   several), so nothing here depends on the AI cooperating.
5. **Unify it peacefully** via the now-peaceful capital claim, collecting everything it gathered.

The example: Bolivia's claim on Colombia is hostile (`Project_SouthAmericanUnion`). Conquer,
convert, release, and Colombia — which carries nine hostile capital claims of its own under
`Project_UnidadColombia`, and reaches 9 nations / 43 regions / ~850M on its own — can be absorbed
whole afterwards instead of being stripped one region at a time.

### Why early — and why the two halves are far apart

The flip is a random roll across your hostile holdings, one at a time. Ten hostile regions means the
one you actually need may not come up for decades. So conquer **only** what you need to convert, and
convert it **early**, while the pool is small. Every unrelated hostile region you are sitting on is
competing for the same roll.

That splits a laundering into two moves that sit at opposite ends of the plan:

- **The war, first.** Take the capital, wait it out, release the nation. Start the clock on turn one.
- **The unification, last.** The released nation still has to spend its own claims before it is
  swallowed, exactly like any other bloc member.

Conquer Russia early, launder the capital claim, release it, let it gather everything its own claims
reach — then unify it.

`plan()` reflects that: every laundering is hoisted ahead of the whole plan, and the annexation it
enables stays at its normal depth. Launderings are ordered among themselves by how many releases
they wait on — a nation can only press its own hostile claim once you control it, so a laundering by
a released nation is one phase behind the laundering that released it. In the CLI a laundering reads
`takes and RELEASES X`; the later annexation is marked `[laundered]`. It counts as the war, so the
war tally does not double-count.

### How it is modelled

With `launder` off, every hostile claim is a one-region war grab and the default numbers are a lower
bound. With it on, a hostile claim on a capital becomes an annexation edge like any other, so it
grows the bloc and the released nation's own claims come with it — recursively, since a released
nation's hostile capital claims can be laundered in turn using the nation you just released.

Route choice ranks edges by what they cost to walk: free peaceful claim (0) → project-gated peaceful
claim (1) → laundering (2) → gated laundering (3), cheapest first. So laundering is only used where
nothing else reaches, and a nation reachable both ways is still taken peacefully.

Laundered steps count toward the war tally — each one is a real war.

**The result is deliberately extreme.** Turned on, Bavaria absorbs 148 nations and 4.17B people,
because nearly every hostile capital claim on the map becomes an edge and 386 of them exist. Nothing
caps the waiting: each step is a war plus an unbounded random wait, and the waits stack. Read the
laundered view as the outer limit of what the claim graph permits, not as a plan.

## Reachability and route choice

`unify(world, start)` first computes reach: repeatedly, from any nation already reached, follow
peaceful claims that land on another nation's capital. The set of nations a start can reach never
depends on the route taken.

The route is therefore chosen to **spend the fewest project unlocks** *(our heuristic)*: grow by
free (ungated) claims until nothing more is free, then spend exactly one unlock — preferring a
nation nobody can reach for free, so the free claims that nation carries stay usable next round —
and try again. Each bloc member records `step` (BFS depth), `via` (who annexed it), the `region`
used, and the `project` needed, if any.

`--no-projects` restricts to ungated claims only, showing what is reachable with no research at all.

## Leftovers: single-region grabs

After the bloc is settled, any claim held by a bloc member on a region the bloc does not already own
becomes a **grab**. When two bloc members both claim the same region, the cheaper one wins
*(our heuristic)*, on this cost:

| Situation | Cost |
| --- | --- |
| Hostile claim riding an existing capital strike on the same victim | 0 — the war happens anyway |
| Peaceful grab | 1 |
| Hostile claim that needs a war of its own | 2 |
| Project-gated | +0.5 |

A region a capital strike sweeps up anyway is not worth a move of its own; ungated breaks ties.

## Scoring and filtering

- `reach` = regions unified + regions grabbed. `--by-pop` ranks on population actually unified
  instead, since region count over-rewards war grabs.
- **Contained blocs are dropped.** Indonesia's bloc lies wholly inside Westralia's — those are moves
  within one unification, not two outcomes. `topBlocs` keeps only blocs nothing else contains.
- The page keeps blocs of **≥100M people** *(our heuristic — below that, a "unification" is just two
  neighbours merging)* and prices each bloc's projects as one `researchClosure`, so shared prereqs
  are counted once. Projects with no entry in the project tree (the BSBE set) arrive from events, so
  they carry no price and are listed as unresearchable.

## Naming

Nations rename themselves as they grow: hold `unionTrigger` regions or more and the game uses
`unionDisplayName` (Java → Indonesia). Reports tally holdings in execution order so each line uses
the name that side had *at that moment*; gains from a phase land only at the end of it, so one
nation never appears twice in a phase under two names. Regions display by `primaryCity` where they
have one (KyushuandShikoku → Fukuoka), otherwise the dataName is re-split into words.

Scenario l10n keys carry a suffix (`displayName.COD.BrokenEarth` = "Grand Basin" where the plain key
says "Congo") and the scenario name always wins.
