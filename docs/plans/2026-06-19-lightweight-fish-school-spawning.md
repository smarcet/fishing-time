# Lightweight Fish School Spawning Implementation Plan

Created: 2026-06-19
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Occasionally spawn small "schools" — clusters of the same COMMON/UNCOMMON
catchable fish swimming together in one lane, one direction, with close offsets and
similar speed — purely as a `FishSpawner` spawn pattern. Each school member is an
ordinary independent `CatchableFish` that hooks, captures, escapes, and scores exactly
like a solo fish. No new `FishSchool` entity, no group lifecycle.

## Out of Scope

- No new `FishSchool` / group `GameObject`. A school is emergent from N independent spawns.
- No changes to `Hook`, `ScoreSystem`, `CatchableFish`, `Enemy`, or any collision/capture logic.
- No coordinated group behavior (no shared movement, formation-keeping, flocking, or group escape).
- No schooling for RARE/EPIC/LEGENDARY species, inert/trash objects, or `maxActive`-capped singletons (Crab, Lobster, etc.).
- Schooling is NOT applied to the constructor pre-seed path or the guaranteed-species path — only the live per-lane spawn in `update()`.

## Approach

**Chosen:** Add a follower-expansion step to `FishSpawner.update()`'s live lane-spawn path,
gated by a per-species `schoolable` opt-in in `FISH_DEFINITIONS` plus a defensive
COMMON/UNCOMMON rarity guard. After a lane leader spawns, `_spawnSchoolFollowers()` creates
N−1 additional same-species `CatchableFish` via the existing `EnemyFactory`, positioning them
in a loose cluster and giving each near-leader speed.

**Why:** Reuses the existing factory + traffic-state machinery so members are real, fully
independent `CatchableFish` (satisfies "each fish can be hooked/captured/escaped/scored
normally") with zero changes to Hook/Score/collision. The data-driven `schoolable` flag
follows the project's "FISH_DEFINITIONS is the single source of truth" convention. Cost: a
school of members placed inward from the entering edge has a mild visual "pop-in" for the
deepest member — accepted to avoid adding a per-frame staggered-spawn queue (see ADR trade-offs).

## Context for Implementer

**Critical constraint — `Enemy.isOffScreen()` is NOT direction-aware** (`src/Enemy.js:19`):
it returns true whenever `x + width < 0` OR `x > gameWidth`, regardless of travel direction.
And `Game.update()` (`src/Game.js`) culls off-screen enemies *before* pushing newly spawned
ones. Therefore school followers must spawn **at or inside the entering edge** — never further
off-screen than the leader — or they are culled before they ever appear.

A right-moving leader spawns at `x = -width` (so `x + width = 0`, the boundary). A left-moving
leader spawns at `x = gameWidth`. Followers are offset *into* the screen along the travel
direction: `followerX = leaderX + direction * spacing * index`. Because `direction` points
into the screen from the entering edge, every follower satisfies `isOffScreen() === false`.
The leader is therefore the trailing-most member (at the edge); followers stream ahead of it.

The live lane-spawn path is the `Object.entries(FISH_LANES).forEach(...)` block in
`FishSpawner.update()` (`src/FishSpawner.js:36-47`). Leaders come from `_spawnForLane` →
`_createTrafficEnemy` (which applies species cooldown + resets the guarantee timer). Followers
must be created with the raw `this._enemyFactory.createEnemy(spec.id, ...)` call and given
state via a new helper — NOT `_createTrafficEnemy` — so they do not each re-bump the species
cooldown or reset guarantee timers.

## Assumptions

- School members count toward `activeTraffic`, so `maxActiveTraffic` (Infinity desktop, 8 mobile)
  naturally bounds school size on constrained profiles — Task 2 relies on this for the mobile cap.
- The five schoolable species have no `maxActive` and are not large fish, so `_hasActiveCapacity`
  returns true for them; the only count gate is `maxActiveTraffic` — Task 2 relies on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Followers spawned off the entering edge get culled instantly (invisible schools) | Medium | High | Offset followers *into* the screen via `direction * spacing * index`; Task 2 DoD asserts every follower has `isOffScreen() === false`. |
| Schooling perturbs existing `update()`-based tests that use `rng: () => 0` | Medium | Medium | Schooling only triggers in the live lane path; with `rng:()=>0` the chance roll passes — verify the FULL suite stays green; the one affected test (`expired lane timers…`) uses `.find()` and the leader is always the trailing member, so it survives. |
| Mobile waters overcrowd | Low | Medium | Members respect `maxActiveTraffic`; Task 2 DoD covers the cap truncating a school. |

## Progress Tracking

- [x] Task 1: Add school tuning constants + `schoolable` flag to the five eligible species in `constants.js`
- [x] Task 2: Implement school follower spawning in `FishSpawner` (TDD)
- [x] Task 3: Write ADR 0037 + update the project-rule traffic note

## Implementation Tasks

### Task 1: School configuration in constants.js

**Objective:** Add the global school-tuning constants and mark the five eligible
COMMON/UNCOMMON catchable species (`ClownFish`, `ButterflyFish`, `JellyFish`, `LionFish`,
`PufferFish`) as `schoolable`, so the spawner can read everything from `FISH_DEFINITIONS`
per the single-source-of-truth convention. Data only — no behavior yet.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add near the other `FISH_TRAFFIC_*` constants (`src/constants.js:170-182`):
  - `FISH_SCHOOL_CHANCE = 0.30` — probability an eligible lane spawn becomes a school.
  - `FISH_SCHOOL_SIZE_MIN = 3`, `FISH_SCHOOL_SIZE_MAX = 5` — total members incl. leader.
  - `FISH_SCHOOL_X_SPACING_FACTOR = 0.35` — inward longitudinal gap per member as a fraction of member width.
  - `FISH_SCHOOL_Y_JITTER_FACTOR = 0.6` — vertical jitter as a fraction of member height.
  - `FISH_SCHOOL_SPEED_JITTER = 0.12` — ± fraction of the leader's speed.
- Add `schoolable: true` to exactly these five `FISH_DEFINITIONS` entries: `ENEMY_TYPE_CLOWN_FISH`,
  `ENEMY_TYPE_BUTTERFLY_FISH`, `ENEMY_TYPE_JELLY_FISH`, `ENEMY_TYPE_LION_FISH`, `ENEMY_TYPE_PUFFER_FISH`.
  Do NOT add it to any RARE/EPIC/LEGENDARY, inert/trash, or `maxActive`-capped entry.
- Export the five new constants in the `module.exports` block (`src/constants.js:742+`). `FISH_RARITY_COMMON`/`FISH_RARITY_UNCOMMON` are already exported.
- `Trivial:` data/constants change — no new branch/loop/error path. Verified by Task 2's new tests consuming these values; no standalone test for this task.

**Definition of Done:**

- [ ] `require('../src/constants')` exposes `FISH_SCHOOL_CHANCE`, `FISH_SCHOOL_SIZE_MIN`, `FISH_SCHOOL_SIZE_MAX`, `FISH_SCHOOL_X_SPACING_FACTOR`, `FISH_SCHOOL_Y_JITTER_FACTOR`, `FISH_SCHOOL_SPEED_JITTER`.
- [ ] Exactly the five listed species have `schoolable: true`; no other entry does.
- [ ] None of the five schoolable species (`ENEMY_TYPE_CLOWN_FISH`, `ENEMY_TYPE_BUTTERFLY_FISH`, `ENEMY_TYPE_JELLY_FISH`, `ENEMY_TYPE_LION_FISH`, `ENEMY_TYPE_PUFFER_FISH`) has a `maxActive` field — verify with: `grep -A 20 "id: ENEMY_TYPE_CLOWN_FISH\|id: ENEMY_TYPE_BUTTERFLY_FISH\|id: ENEMY_TYPE_JELLY_FISH\|id: ENEMY_TYPE_LION_FISH\|id: ENEMY_TYPE_PUFFER_FISH" src/constants.js | grep maxActive` (must return no output).
- [ ] Verify: `npx jest __tests__/fish-spawner.test.js -q` (suite still green after Task 2 lands).

### Task 2: School follower spawning in FishSpawner (TDD)

**Objective:** When a live lane spawn produces a leader of a `schoolable` COMMON/UNCOMMON
species and a 30% chance roll passes, spawn 2–4 additional same-species `CatchableFish`
(total 3–5) in the same lane and direction, offset into the screen with small vertical jitter
and near-leader speed. Members remain fully independent enemies. Verified by new unit +
integration tests in the existing spawner test file.

**Files:**

- Modify: `src/FishSpawner.js`
- Test: `__tests__/fish-spawner.test.js`

**Key Decisions / Notes:**

- Wire into the live lane loop in `update()` (`src/FishSpawner.js:36-47`): after `if (enemy) { spawned.push(enemy); activeTraffic.push(enemy); ... }`, call
  `this._spawnSchoolFollowers(enemy, laneName, laneDef, activeTraffic).forEach(f => spawned.push(f));`
  Followers push themselves onto `activeTraffic` inside the helper (so per-member capacity checks count them); the caller only adds them to `spawned`.
- `_spawnSchoolFollowers(leader, laneName, laneDef, activeTraffic)`: resolve `spec` via `FISH_DEFINITIONS.find(d => d.id === leader._trafficType)`; return `[]` unless `_isSchoolEligible(spec)`; return `[]` if `this._rng() >= FISH_SCHOOL_CHANCE`; pick size via `_randomSchoolSize()`; loop `i = 1..size-1`, breaking on `activeTraffic.length >= this._profile.maxActiveTraffic` or `!this._hasActiveCapacity(spec, activeTraffic)`; create each via `this._enemyFactory.createEnemy(spec.id, this._game, this._ctx)`; apply `_applySchoolMemberState`; push to `activeTraffic` and the returned list.
- `_isSchoolEligible(spec)`: `!!spec && spec.schoolable === true && (spec.rarity === FISH_RARITY_COMMON || spec.rarity === FISH_RARITY_UNCOMMON)` — the rarity check is the defensive encoding of the user's COMMON/UNCOMMON rule.
- `_randomSchoolSize()`: `FISH_SCHOOL_SIZE_MIN + Math.floor(this._rng() * (FISH_SCHOOL_SIZE_MAX - FISH_SCHOOL_SIZE_MIN + 1))`.
- `_applySchoolMemberState(follower, leader, spec, laneName, laneDef, index, baseSpeed)`: mirror `_applyTrafficState`'s field assignments (`_trafficLane`, `_trafficType`, `_position`, `_direction`, `_driftSpeed`, `_speedX`) but with: X = `leader._position.getX() + laneDef.direction * (follower.getSize().getWidth() * FISH_SCHOOL_X_SPACING_FACTOR) * index` (inward, never culled); Y = `leader._position.getY() + (this._rng()*2-1) * follower.getSize().getHeight() * FISH_SCHOOL_Y_JITTER_FACTOR`, clamped to `[0, gameHeight - memberHeight]`; speed = `clamp(baseSpeed * (1 + (this._rng()*2-1)*FISH_SCHOOL_SPEED_JITTER), min(spec.speedMin,spec.speedMax), max(spec.speedMin,spec.speedMax))`, with `baseSpeed = leader._driftSpeed`; `_speedX = direction * speed`.
- Performance: this runs only on the already-throttled lane-spawn frames (not every frame); follower creation reuses the factory. No hot-path concern.
- Tests (extend existing `FishSpawner traffic integration` describe — do NOT add a new file/class):
  - **Mock requirement:** All new tests that call `update()` must either pass `guaranteedSpeciesIntervals: {}` in options (to skip `_spawnGuaranteedSpecies`) OR ensure the `makeEnemy()` stub includes `isCaptured: jest.fn(() => false)` — `update()` calls `enemy.isCaptured()` internally. Without this, tests using existing stubs will throw.
  1. `_isSchoolEligible`: true for the ClownFish def; false for the Shark def; false for a `{schoolable:true, rarity: FISH_RARITY_RARE}` stub (rarity guard).
  2. `_spawnSchoolFollowers` with a ClownFish leader stub (`_driftSpeed: CLOWN_FISH_DRIFT_SPEED`, not 0 — so speed jitter is observable) and `rng:()=>0`: returns `FISH_SCHOOL_SIZE_MAX - 1` followers, all `_trafficType`/`_direction` equal to the leader's, every follower passes `!(follower.isOffScreen())` (boundary per `Enemy.js`), every speed within `[speedMin, speedMax]`. Also test with `rng:()=>0.999` to verify `FISH_SCHOOL_SIZE_MIN - 1` followers (covers the `+1` in `_randomSchoolSize`).
  3. `_spawnSchoolFollowers` returns `[]` for a non-schoolable leader (e.g. a Crab leader).
  4. Integration via `update()` (preseed 0, initialLaneTimer 0, `rng:()=>0`, `guaranteedSpeciesIntervals: {}`): a lane's spawned output contains ≥2 entries of the same `_trafficType`; the leader (first entry) is at the entering edge, followers appear after it in the array.
  5. `maxActiveTraffic` truncates a school: profile cap `2` with one active enemy yields at most one follower added.

**Definition of Done:**

- [ ] An eligible leader + passing chance roll yields 2–4 extra same-species, same-lane, same-direction members; each is the species' real `CatchableFish` class (via the factory).
- [ ] Leader always appears as the FIRST entry in the `spawned` array; followers come after it (in insertion order from `_spawnSchoolFollowers`).
- [ ] Every follower satisfies `!(follower.isOffScreen()) === true` at spawn — i.e. `follower._position.getX() + follower.getSize().getWidth() >= 0 && follower._position.getX() <= gameWidth` (boundary as in `Enemy.js`). Test with both `rng:()=>0` and `rng:()=>0.999` to confirm all followers at both size extremes pass this check.
- [ ] `_randomSchoolSize()` returns `FISH_SCHOOL_SIZE_MIN` (3) when `rng()` → 0 and `FISH_SCHOOL_SIZE_MAX` (5) when `rng()` → 0.999 — verifying the `+1` in the formula; both values tested explicitly.
- [ ] Follower speeds stay within the species' `[speedMin, speedMax]` and are visibly different from 0 (test leader stub uses `_driftSpeed: CLOWN_FISH_DRIFT_SPEED`, not 0); RARE/EPIC/LEGENDARY and non-`schoolable` leaders never produce followers.
- [ ] School members respect `maxActiveTraffic` (school truncated, never exceeds the cap).
- [ ] Verify: `npx jest __tests__/fish-spawner.test.js -q` and full `npm test` — 0 failures.

### Task 3: ADR + project-rule documentation

**Objective:** Record the schooling design — what a school is (spawn pattern, not an entity),
the species/rarity gating, the off-screen-edge positioning constraint, and the trade-offs
(spatial inward cluster vs. temporal stagger; data-driven opt-in vs. pure rarity gate).

**Files:**

- Create: `docs/adr/0037-lightweight-fish-school-spawning.md`
- Modify: `.claude/rules/fishing-time-project.md` (one-line note under "Fish traffic model")

**Key Decisions / Notes:**

- Next ADR number is `0037` (current highest is a duplicated `0036`; confirm with `ls docs/adr/` before writing).
- ADR must cover: decision (school = N independent spawns, no new GameObject), rarity/species gate, the `Enemy.isOffScreen` non-direction-aware constraint and why followers go inward, the accepted pop-in trade-off and the rejected temporal-stagger alternative, why a `schoolable` flag over a pure rarity gate (Crab/Tuna exclusion, explicitness), and consequences (mobile bounded by `maxActiveTraffic`).
- Project-rule note: under the "Fish traffic model" paragraph, add one sentence that `FishSpawner` can expand an eligible COMMON/UNCOMMON lane spawn into a school of independent same-species fish (see ADR-0037).
- `Trivial:` docs-only change — no production code, no test. No verification command beyond file existence.

**Definition of Done:**

- [ ] Confirm ADR number before writing: `ls docs/adr/ | grep '^0037'` must return no output (no collision); if output exists, use next available number.
- [ ] `docs/adr/0037-lightweight-fish-school-spawning.md` exists and documents decisions + trade-offs listed above.
- [ ] `.claude/rules/fishing-time-project.md` references schooling in one line under the traffic model.

## E2E Test Scenarios

### TS-001: Schools appear in live gameplay
**Priority:** Medium
**Preconditions:** Dev server running (`python3 -m http.server 8081`), `main.html` loaded.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `http://localhost:8081/main.html` and start playing | Game runs; fish traffic flows across lanes as before |
| 2 | Watch the lanes for ~30–60 s of spawns | Periodically, a cluster of 3–5 of the same species enters one lane together, same direction, close together, at similar speed |
| 3 | Hook one member of a visible school | Only that fish is hooked; the others keep swimming independently |
| 4 | Capture / let it escape, observe score | Score updates exactly as for a solo catch of that species; remaining members unaffected |

> Schooling is probabilistic; if no school appears within ~60 s, reload and continue observing. Deterministic verification lives in the Task 2 unit/integration tests.

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Medium   | PASS   | 0            | 4 schools observed in 12s (LionFish×4, ButterflyFish×4×2, ClownFish×5); all follower Y ≥ WATER_SURFACE_Y; zero console errors. Entry point: index.html (renamed from main.html). |

## Goal Verification

### Truths

1. A school is purely emergent: every member is an independent `CatchableFish` that can be hooked, captured, escaped, and scored on its own, with no shared group state — confirmed because members are produced by the unchanged `EnemyFactory`/`CatchableFish` path and nothing references a group object.
2. Only COMMON/UNCOMMON `schoolable` species ever form schools; RARE+/inert/`maxActive` species never do — enforced by `_isSchoolEligible` and verified in Task 2 tests.
