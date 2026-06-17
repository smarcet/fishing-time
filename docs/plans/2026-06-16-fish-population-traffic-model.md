# Fish Population Traffic Model Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Codex
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the static bounce-patrol fish population with an arcade-style traffic model where the full current roster spawns from lane-aware configuration, enters offscreen, crosses the playfield in one direction, exits, despawns, and is continuously replenished.

## Approach

**Chosen:** Configuration-backed `FishSpawner` integrated through `Game`, `Enemy`, and `constants`.
**Why:** A dedicated spawner keeps traffic timing, lane selection, weighted rarity, and offscreen placement out of `Game.js`, while `constants.js` becomes the single source for species score, strength, runtime traffic speed, rarity, lanes, spawn weight, and spawn frequency. This adds one runtime coordinator and a richer config table at the cost of touching score/fight compatibility maps that currently live separately.

## Context for Implementer

The clarified scope includes every existing fish/object in the repo, not only the originally listed 12. `ButterflyFish`, `Wheel`, `Shoe`, and `FishBone` must be part of the traffic population too; `Wheel`, `Shoe`, `FishBone`, `RedApple`, and `DiscardedBottle` are inert trash/hazard objects with no resistance, automatic retrieval, and negative score.

User follow-up clarified that `Crab` is a seabed-only reward target: it must spawn only in the bottom lane, appear occasionally with at most one active crab at a time, and render with a strong pulsing golden glow around the body silhouette because it carries the highest score.

## Runtime Environment

- **Start:** `yarn dev` (`package.json` maps this to `python3 -m http.server 8081`)
- **URL:** `http://127.0.0.1:8081/main.html`
- **Health check:** `curl -I http://127.0.0.1:8081/main.html`
- **Stop:** terminate the `python3 -m http.server 8081` process started by `yarn dev`

## Feature Inventory

| Existing file/function | Current behavior | Plan mapping |
|------------------------|------------------|--------------|
| `src/Game.js` constructor | Seeds a fixed `_enemies` population with hard-coded counts and one-off pushes | Task 4 |
| `src/Game.js update()` | Treats every offscreen, uncaptured enemy as evaded and filters offscreen enemies | Task 4 |
| `src/Enemy.js update()` | Reverses `_speedX` and `_direction` at horizontal bounds | Task 3 |
| `src/Enemy.js isOffScreen()` | Only returns true after `_hasEscaped` is true | Task 3 |
| `src/EnemyFactory.js createEnemy()` | Falls back to `Octopus` for unknown names because the final branch is unconditional | Task 4 |
| `src/constants.js FISH_SPECS` | Stores fight strength separately from spawn/score concepts | Task 1 |
| `src/ScoreSystem.js SCORE_MAP` | Stores score values separately from species definitions | Task 2 |
| `main.html` script list | Loads `Game.js` without a spawner script before it | Task 4 |
| `index.js` test barrel | Exports existing classes only | Task 4 |

## File Structure

- `src/constants.js` (modify) — add lane definitions, full-roster fish definitions, derived fight/score compatibility maps.
- `src/ScoreSystem.js` (modify) — source `SCORE_MAP` from `FISH_SCORE_MAP`.
- `src/Enemy.js` (modify) — remove bounce behavior and despawn on full horizontal exit.
- `src/FishSpawner.js` (create) — weighted lane traffic spawner.
- `src/EnemyFactory.js` (modify) — remove silent Octopus fallback for unknown ids.
- `src/Game.js` (modify) — replace static constructor population with continuous spawner integration.
- `main.html` (modify) — load `FishSpawner.js` before `Game.js`.
- `index.js` (modify) — export `FishSpawner` for tests.
- `__tests__/fish-spawner.test.js` (create) — unit coverage for lane selection, weighting, offscreen placement, cooldown/frequency, and full roster eligibility.
- `__tests__/enemy-factory.test.js` (create) — integration coverage for config ids against real factory instantiation.
- `__tests__/enemy-traffic.test.js` (create) — unit coverage for no-bounce movement and exit detection.
- `__tests__/score-system.test.js` (modify) — verify score map values still include the full roster from config.
- `docs/adr/0025-fish-traffic-model.md` (create) — design decision record.

## Assumptions

- `Game` owns the only live enemy list and can receive new enemies after filtering old ones — Task 4 depends on this.
- Enemy instances can safely have `_position`, `_direction`, `_driftSpeed`, and `_speedX` assigned by `FishSpawner` after `EnemyFactory.createEnemy()` returns — Task 4 depends on vanilla JavaScript field access already used throughout the codebase.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Normal traffic exits trigger evade penalties | High | High | Task 4 narrows `EVENT_ENEMY_EVADED` dispatch to enemies with `_hasEscaped === true`; tests cover normal exits and escaped exits separately |
| Large bottom-lane species spawn partly outside vertical bounds on short screens | Medium | Medium | Task 4 clamps lane Y placement to `WATER_SURFACE_Y` through `canvasHeight - enemyHeight`; Task 5 covers small-canvas clamping |
| Full-roster config drifts away from score/fight behavior | Medium | High | Task 1 derives `FISH_SPECS` and `FISH_SCORE_MAP` from `FISH_DEFINITIONS`; Task 2 and Task 5 verify exported maps |

## E2E Test Scenarios

### TS-001: Traffic Flow Starts Populated and Keeps Moving
**Priority:** Critical
**Preconditions:** Dev server running at `http://127.0.0.1:8081/main.html`
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/main.html` | Canvas renders with visible enemies/objects already present in multiple water lanes |
| 2 | Wait 10 seconds | Enemies continue moving in one horizontal direction; none visibly reverse at the screen edges |
| 3 | Wait another 10 seconds and compare screen edges | Earlier enemies have exited and disappeared; new enemies enter from offscreen edges |

### TS-002: Full Roster Lane Variety
**Priority:** High
**Preconditions:** Dev server running; first traffic scenario passed
**Mapped Tasks:** Task 1, Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/main.html` and observe for 30 seconds | Surface, upper, middle, deep, and bottom lanes all receive traffic over time |
| 2 | Observe surface/upper lanes | Small fish and floating trash/hazards such as ClownFish, JellyFish, ButterflyFish, bottles, apples, shoes, wheels, or fish bones appear |
| 3 | Observe deep/bottom lanes | High-reward species such as Crab, Octopus, SwordFish, Shark, or HammerHeadShark appear less frequently than surface traffic |

### TS-003: Primary Fishing Interaction Still Works
**Priority:** Critical
**Preconditions:** Dev server running; player starts idle
**Mapped Tasks:** Task 2, Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press Space to cast the hook at passing traffic | Hook casts into the playfield and can collide with a moving enemy/object |
| 2 | Let an inert object or fish reel back when caught | Inert trash/hazards retrieve automatically; catchable fish use the existing fight mechanic |
| 3 | Let a hooked catchable fish escape if one is hooked | Escaped fish re-enters traffic at escape speed, leaves the screen, and applies the existing escape/evade penalty behavior only for the escaped fish |

## E2E Results

**Tool:** `playwright-cli -s=${PILOT_SESSION_ID:-fish-population-traffic-model}`
**URL:** `http://127.0.0.1:8081/main.html`

| Scenario | Result | Evidence |
|----------|--------|----------|
| TS-001 Traffic Flow | PASS | Browser probe observed 47 new spawns after instrumentation, 1200 movement samples, no direction changes, and no wrong-way movement samples. |
| TS-002 Lane Variety | PASS | Browser probe observed all five lanes: `surface`, `upper`, `middle`, `deep`, and `bottom`, with 13 roster types during the sample window. |
| TS-003 Fishing Interaction | PASS | `keydown Space` held for 0.4s triggered `rodCasted`, `reelRetrieving`, and `hookIdle`; canvas interaction also logged a collision with `DiscardedBottle`. |
| Crab Body Glow | PASS | Browser canvas render of `Crab.draw()` produced 10,063 gold pixels at low pulse and 22,182 at high pulse, with zero corner leakage, confirming a strong body-shaped glow rather than a rectangular border. |

## Progress Tracking

- [x] Task 1: Add full-roster lane and species definitions to constants
- [x] Task 2: Source score/fight compatibility maps from species definitions
- [x] Task 3: Remove bounce behavior and support traffic despawn
- [x] Task 4: Create and integrate FishSpawner
- [x] Task 5: Verify trash and traffic behavior with focused tests
- [x] Task 6: Create ADR for the traffic model
- [x] Task 7: Constrain and visually highlight Crab as the rare bottom reward target

## Implementation Tasks

### Task 1: Add full-roster lane and species definitions to constants

**Objective:** Add `FISH_LANES`, `FISH_DEFINITIONS`, and rarity constants to `src/constants.js`. The definitions must include all existing fish and objects, with each entry carrying `id`, `className`, `rarity`, `lanes`, `score`, `strength`, `escapeRate`, `speedMin`, `speedMax`, `spawnWeight`, `spawnFrequency`, and `isTrash`.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Include all 16 existing enemy/object types: `ButterflyFish`, `ClownFish`, `JellyFish`, `PufferFish`, `LionFish`, `Tuna`, `Crab`, `Octopus`, `SwordFish`, `Shark`, `HammerHeadShark`, `RedApple`, `DiscardedBottle`, `Wheel`, `Shoe`, and `FishBone`.
- Use the requested rarity tiers, plus `ButterflyFish`, `Wheel`, `Shoe`, and `FishBone` as `common`.
- Keep the requested lane distribution and add the clarified extra roster conservatively: `ButterflyFish` in surface/upper/middle, `FishBone` in surface/upper, `Wheel` and `Shoe` in surface/bottom.
- `FISH_LANES` owns y-band, direction, and lane spawn interval; `FISH_DEFINITIONS` owns species eligibility, score, strength, runtime traffic speed range, spawn weight, and species spawn frequency/cooldown.
- Existing per-class speed constants can remain as constructor defaults, but `FishSpawner` must override `_driftSpeed` and `_speedX` from `FISH_DEFINITIONS` for traffic-spawned entities.
- New magic string and number values introduced by the traffic model must live in `src/constants.js` as meaningful constants; implementation files should consume those constants instead of inline literals.
- Export `FISH_LANES`, `FISH_DEFINITIONS`, and any derived maps through `module.exports`.

**Definition of Done:**

- [ ] `FISH_LANES` defines `surface`, `upper`, `middle`, `deep`, and `bottom` with alternating directions and spawn intervals.
- [ ] `FISH_DEFINITIONS` contains exactly 16 entries and includes every existing enemy/object type in the repo.
- [ ] Trash/hazard entries have `isTrash: true`, `strength: 0`, `escapeRate: 0`, negative score, and no fight resistance.
- [ ] Verify: `node -e "const c = require('./src/constants'); console.log(Object.keys(c.FISH_LANES).length, c.FISH_DEFINITIONS.length)"` prints `5 16`.

### Task 2: Source score and fight maps from species definitions

**Objective:** Keep existing consumers working while making `FISH_DEFINITIONS` the authoritative configuration. Derive `FISH_SPECS` for fish classes and `FISH_SCORE_MAP` for score handling from the species definitions, then update `ScoreSystem` to use the derived score map.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/ScoreSystem.js`
- Modify: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- Preserve the `FISH_SPECS[id].strength` and `FISH_SPECS[id].escape_rate` shape so existing fish constructors do not need per-class rewrites.
- Export `SCORE_MAP` from `ScoreSystem.js` as before, but initialize it from `FISH_SCORE_MAP` so tests and callers keep the same import contract.
- Keep existing score values for the full roster unless the config explicitly changes them: bottom/deep fish remain high reward, surface/common fish and trash remain low or negative value.
- Update the score map tests so the expected keys match the full 16-entry roster.

**Definition of Done:**

- [ ] `FISH_SPECS` is derived from non-trash `FISH_DEFINITIONS` entries and preserves existing constructor reads.
- [ ] `ScoreSystem.SCORE_MAP` is derived from `FISH_SCORE_MAP` and still exports through `index.js`.
- [ ] Score map tests assert all 16 configured `className` keys exist.
- [ ] Verify: `yarn test --testPathPattern=score-system --silent` passes.

### Task 3: Remove bounce behavior and support traffic despawn

**Objective:** Change `Enemy` movement from patrol/bounce to one-way traffic. Enemies should keep their assigned direction and speed until they fully exit the horizontal playfield, then `isOffScreen()` should report true regardless of escape state.

**Files:**

- Modify: `src/Enemy.js`
- Test: `__tests__/enemy-traffic.test.js`

**Key Decisions / Notes:**

- Remove the boundary reversal block in `Enemy.update()` that mutates `_speedX` and `_direction` when `rBound >= gameWidth` or `lBound <= 0`.
- Keep escaped fish acceleration in `Enemy.escaped()` unchanged.
- Change `isOffScreen()` to return true when `x + width < 0 || x > gameWidth`, without requiring `_hasEscaped`.
- Boundary semantics must allow offscreen spawn positions: `x === -width` and `x === gameWidth` are still considered entering, not despawned.

**Definition of Done:**

- [ ] A fish at the right edge moving right continues right instead of reversing.
- [ ] A fish at the left edge moving left continues left instead of reversing.
- [ ] `isOffScreen()` is false at the exact spawn edges and true only after a full horizontal exit.
- [ ] Verify: `yarn test --testPathPattern=enemy-traffic --silent` passes.

### Task 4: Create and integrate FishSpawner

**Objective:** Add `src/FishSpawner.js` and use it from `Game` to replace constructor-time static enemy seeding. The spawner should pre-seed initial lane traffic, tick lane timers, choose lane-eligible species by weighted random selection, respect species spawn frequency/cooldown, assign a speed from each species speed range, place enemies offscreen, and return newly spawned enemies each update.

**Files:**

- Create: `src/FishSpawner.js`
- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`
- Modify: `main.html`
- Modify: `index.js`
- Test: `__tests__/fish-spawner.test.js`

**Key Decisions / Notes:**

- `FishSpawner` should accept injectable `rng` in its constructor for deterministic tests, defaulting to `Math.random`.
- `update()` returns newly spawned enemies; `Game.update()` appends them after filtering captured/offscreen enemies.
- Pre-seed enough enemies to avoid an empty initial screen, but use normal configured species/lane logic so the first frame matches the traffic model.
- Normal traffic exits must not dispatch `EVENT_ENEMY_EVADED`; only enemies with `_hasEscaped === true` should do that.
- Replace the unconditional `Octopus` fallback in `EnemyFactory.createEnemy()` with a loud null/unknown return path so invalid config ids cannot silently spawn the wrong class.
- Use named constants from `src/constants.js` for new lane ids, class names, traffic directions, seed spread factors, default preseed counts, and cooldown/timer values.
- Add `<script src="src/FishSpawner.js"></script>` in `main.html` before `src/Game.js`, and export `FishSpawner` from `index.js`.

**Definition of Done:**

- [ ] `Game` no longer defines `ENEMY_COUNT_*` constants or hard-coded initial enemy pushes.
- [ ] `FishSpawner` spawns from `FISH_LANES` and `FISH_DEFINITIONS`; no species list is hard-coded in `Game.js`.
- [ ] Spawned entities enter from `x = -width` for right-moving lanes or `x = gameWidth` for left-moving lanes.
- [ ] Spawned entities receive non-null `_direction`, `_driftSpeed`, and `_speedX` from definition speed ranges.
- [ ] Unknown `EnemyFactory.createEnemy()` ids do not fall back to `Octopus`.
- [ ] `main.html` and `index.js` expose `FishSpawner` in browser and Jest contexts.
- [ ] Verify: `yarn test --testPathPattern="fish-spawner|enemy-factory" --silent` passes.

### Task 5: Verify trash and traffic behavior with focused tests

**Objective:** Add behavioral coverage for the full traffic model without duplicating every existing fish class test. The tests should cover roster completeness, weighted selection, species frequency/cooldown, trash eligibility, offscreen spawn placement, and the existing inert retrieval contract.

**Files:**

- Create: `__tests__/fish-spawner.test.js`
- Create: `__tests__/enemy-factory.test.js`
- Create: `__tests__/enemy-traffic.test.js`
- Modify: `__tests__/hook.test.js`

**Key Decisions / Notes:**

- Reuse the existing `makeMocks()` style from fish and hook tests.
- `fish-spawner.test.js` can mock `EnemyFactory.createEnemy()` for deterministic spawn positioning, but `enemy-factory.test.js` must use the real `EnemyFactory` for full-roster id/class verification.
- Existing hook tests already cover inert object auto-reel; add only one assertion if needed to tie configured trash entries to `InertObject` behavior.
- Do not add one test file per species; roster completeness is a config/spawner behavior, not a per-class behavior.

**Definition of Done:**

- [ ] FishSpawner tests prove all 16 configured ids can be selected through lane eligibility.
- [ ] FishSpawner tests prove higher `spawnWeight` candidates win over lower candidates with deterministic RNG.
- [ ] FishSpawner tests prove species `spawnFrequency` prevents immediate repeat spawning until cooldown expires.
- [ ] EnemyFactory integration tests prove every configured `FISH_DEFINITIONS` id creates an instance whose `constructor.name` matches the configured `className`.
- [ ] EnemyFactory integration tests prove an unknown id returns `null` or another explicit failure value rather than `Octopus`.
- [ ] FishSpawner tests instantiate a short canvas and assert large deep/bottom-lane entities clamp between `WATER_SURFACE_Y` and `canvasHeight - enemyHeight`.
- [ ] Traffic tests prove no-bounce and despawn boundary behavior.
- [ ] Hook/inert tests prove configured trash has no resistance and auto-retrieves without space-bar fight input.
- [ ] Verify: `yarn test --silent` passes.

### Task 6: Create ADR for the traffic model

**Objective:** Add an ADR documenting why the game moved from fixed patrol entities to arcade-style traffic spawning. The ADR must explain the lane model, rarity model, habitat assignment, alternatives, tradeoffs, and how future species can join the traffic configuration without changing spawner or fishing logic.

**Files:**

- Create: `docs/adr/0025-fish-traffic-model.md`

**Key Decisions / Notes:**

- Follow the existing ADR style in `docs/adr/0011-lionfish-enemy-mid-water-and-spawn-refactor.md` and `docs/adr/0022-pufferfish-enemy.md`.
- Include the clarified full-roster decision: listed species plus `ButterflyFish`, `Wheel`, `Shoe`, and `FishBone`.
- Include alternatives considered: keep bounce patrols with random respawn, global random spawn table without lanes, per-class spawn logic, and lane traffic with configuration.
- The extensibility example should show a new species definition entry and state that `FishSpawner`, `Game`, `Hook`, and `ScoreSystem` do not need logic changes once `EnemyFactory` can instantiate the new type.
- Do not run `git commit`; Git write commands require explicit user permission even though the ADR is created as part of the implementation.

**Definition of Done:**

- [ ] ADR created at `docs/adr/0025-fish-traffic-model.md`.
- [ ] ADR explains patrol replacement, traffic spawning, lanes, rarity tiers, habitat assignment, alternatives, tradeoffs, and future extensibility.
- [ ] ADR includes a configuration-only traffic example for adding a new species after its enemy class/factory support exists.
- [ ] Verify: `rtk rg -n "traffic|lane|rarity|extensibility|ButterflyFish|FishBone" docs/adr/0025-fish-traffic-model.md`.

### Task 7: Constrain and visually highlight Crab as the rare bottom reward target

**Objective:** Keep `Crab` behavior aligned with the seabed reward fantasy. Crab traffic should be bottom-only, rare, and capped to one active instance. Because it is the highest-score target, it should draw a strong pulsing golden glow around the sprite body silhouette using named constants from `src/constants.js`.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/Crab.js`
- Modify: `__tests__/fish-spawner.test.js`
- Modify: `__tests__/crab.test.js`

**Key Decisions / Notes:**

- `FISH_DEFINITIONS` owns Crab lane eligibility, spawn weight, spawn frequency, and active cap.
- `FishSpawner` should enforce optional per-species `maxActive` without special-casing Crab in the spawner logic.
- Glow color, blur range, alpha range, and pulse speed must live in `src/constants.js`.
- The glow must be generated from the Crab sprite alpha/body shape, not from `strokeRect` or any rectangular border.

**Definition of Done:**

- [x] Crab definitions list only the bottom lane.
- [x] FishSpawner prevents a second active Crab while one is still present.
- [x] Crab draw renders a strong pulsing golden body-silhouette glow from named constants.
- [x] Verify: `rtk yarn test --testPathPattern=crab --silent` passes.
