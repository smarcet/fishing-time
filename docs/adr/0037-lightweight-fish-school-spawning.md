# ADR-0037: Lightweight Fish School Spawning

**Date:** 2026-06-19
**Status:** Accepted

## Context

Players found the ocean felt sparse and mechanical — fish always appear solo, one per
lane trigger. A "school" (small group of the same species swimming together) would
add variety and visual richness. The requirement was to keep it lightweight: no new
entity types, no group AI, no changes to the hook/score/capture systems.

## Decision

Implement schooling purely as a **spawn pattern inside `FishSpawner`**, not as a new
`FishSchool` `GameObject`. When the live per-lane spawn fires and the resulting leader
is from a `schoolable` COMMON or UNCOMMON species, a 30% chance triggers the creation
of 2–4 additional same-species `CatchableFish` (total school size 3–5). Each follower
is an ordinary independent enemy produced by the existing `EnemyFactory`; no new class
or lifecycle is introduced.

**What a school is:** N independent `CatchableFish` spawned close together in the same
lane and direction, with similar speed. Nothing more.

**What a school is NOT:** a coordinated entity, a shared group object, or a container.
Each member can be hooked, captured, escaped, and scored individually and independently.

## Species and Rarity Gate

Schooling is opt-in at the `FISH_DEFINITIONS` level via `schoolable: true`, backed by
a defensive `FISH_RARITY_COMMON || FISH_RARITY_UNCOMMON` rarity guard in
`_isSchoolEligible`. Only five species carry the flag:

| Species | Rarity |
|---------|--------|
| ClownFish | COMMON |
| ButterflyFish | COMMON |
| JellyFish | COMMON |
| LionFish | UNCOMMON |
| PufferFish | UNCOMMON |

Species excluded and why:

- **RARE / EPIC / LEGENDARY** (Shark, HammerHeadShark, SwordFish, AnglerFlish, Tuna,
  Lobster) — high-stakes solo encounters; schooling would trivialise or overwhelm them.
- **Crab** — `maxActive: 1`; `_hasActiveCapacity` would block followers anyway, but the
  rarity guard makes the intent explicit.
- **Trash / InertObjects** — negative-score debris; schooling would feel punishing and
  is semantically wrong (rubbish doesn't school).

## Positioning Constraint — The `isOffScreen` Problem

`Enemy.isOffScreen()` (`src/Enemy.js`) is **not direction-aware**: it returns `true`
whenever `x + width < 0 OR x > gameWidth`. This is a hard invariant — changing it
would be scope creep and could break existing culling logic.

`Game.update()` culls off-screen enemies **before** pushing newly spawned ones. A
follower placed further behind the leader (further outside the entering edge) would be
culled immediately and never rendered.

**Solution:** offset followers **inward** from the entering edge using the lane's travel
direction:

```
followerX = leaderX + direction * (followerWidth * X_SPACING_FACTOR) * index
```

Because `direction` points into the screen from the entering edge, every follower is
strictly closer to the screen interior than the leader. The leader is always the
trailing-most member (at the edge); followers stream ahead of it.

## Approach Alternatives Considered

### Temporal Stagger (Rejected)

Spawn followers one per frame over the next N frames via a pending queue, so the school
"flows in" naturally rather than appearing all at once. This would eliminate the mild
visual pop-in of the deepest member.

**Rejected because:**
- Requires a per-frame stagger queue with species, lane, and leader-state bookkeeping
  across multiple `update()` ticks.
- Followers spawned later may see a different `activeTraffic` count, causing inconsistent
  school sizes near the mobile traffic cap.
- Complexity cost is high relative to the mild aesthetic benefit; the spatial inward
  cluster approach is correct and cheaper.

### Schooling via `FishSchool` Entity (Rejected per user requirement)

A `FishSchool` GameObject that manages members and dissolves on capture was explicitly
ruled out: "Do not introduce a new FishSchool GameObject yet." Even absent that
constraint, it would have required changes to Hook, collision, and ScoreSystem, all
of which are out of scope.

### Pure Rarity Gate Without `schoolable` Flag (Rejected)

Gate schooling only on `rarity === COMMON || rarity === UNCOMMON` without an explicit
per-species opt-in.

**Rejected because:**
- Crab (UNCOMMON, `maxActive: 1`) and Tuna (UNCOMMON, large, high-value) would be
  eligible without explicit exclusion logic, requiring separate carve-outs.
- The `schoolable` flag is the project's "FISH_DEFINITIONS is the single source of
  truth" convention: data drives behavior, not ad-hoc code conditionals.
- Adding a new species in the future is a one-field decision in `FISH_DEFINITIONS`
  rather than relying on whoever adds it to know about the rarity rule.

## Tuning Constants

All tuning lives in `src/constants.js` near the other `FISH_TRAFFIC_*` constants:

| Constant | Value | Meaning |
|---|---|---|
| `FISH_SCHOOL_CHANCE` | 0.30 | Probability an eligible lane spawn becomes a school |
| `FISH_SCHOOL_SIZE_MIN` | 3 | Minimum total members including leader |
| `FISH_SCHOOL_SIZE_MAX` | 5 | Maximum total members including leader |
| `FISH_SCHOOL_X_SPACING_FACTOR` | 0.35 | Inward longitudinal gap as fraction of member width |
| `FISH_SCHOOL_Y_JITTER_FACTOR` | 0.6 | Vertical jitter as fraction of member height |
| `FISH_SCHOOL_SPEED_JITTER` | 0.12 | Speed variance as +/- fraction of leader speed |

## Consequences

- **Mobile profile:** school members count toward `maxActiveTraffic` (cap 8), so the
  school is naturally truncated near the cap — no special mobile handling needed.
- **Spawn frequency:** the leader's species cooldown is applied once (by
  `_createTrafficEnemy`); followers do not re-trigger it. Schools appear at the same
  per-species cadence as solo spawns, just with more members when the roll passes.
- **Game balance:** at 30% chance and size 3–5, roughly 30% of schoolable lane spawns
  produce a cluster. For ClownFish (spawnWeight 10, spawnFrequency 80, three eligible
  lanes), this meaningfully increases visual activity without crowding the screen.
- **Mild pop-in:** the deepest follower (highest index) is furthest from the edge but
  still on-screen. On a wide canvas this is barely noticeable; on a narrow one
  followers are even closer together. Accepted trade-off versus temporal stagger.
