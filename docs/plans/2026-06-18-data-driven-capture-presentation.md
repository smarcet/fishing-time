# Data-Driven Hooked-Entity Capture Presentation Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Make the hooked-entity capture presentation data-driven so each species/object defines its own `captureRotation`/`captureOffsetX`/`captureOffsetY` in `FISH_DEFINITIONS` — fish hang from the hook, crabs and octopus stay upright, swordfish/large predators keep a natural tilt, and inert objects are not forcibly rotated — without any change to fishing-rod or hook logic. Document the decision in ADR 0029.

## Out of Scope

- Changing the capture throw-arc, glow/pulse, or escape-particle behavior in `EnemyWithAnimation.drawCaptured()` — only orientation (rotation) and positional offsets are added.
- Per-species capture offsets with non-zero values — the offset plumbing is wired and defaults to `0` for every species; no current species needs a non-zero offset.
- New sprite art or "hanging pose" die-frame rows — rotation is applied to the existing captured (die-frame) sprite.

## Approach

**Chosen:** Extend `FISH_DEFINITIONS` (src/constants.js) with three capture-presentation fields and thread them generically through `EnemyFactory` (build spec entry in the existing `forEach`, attach to the instance in `createEnemy()`), then consume them in `EnemyWithAnimation.drawCaptured()`.
**Why:** Mirrors the existing single-source-of-truth pattern from ADR-0027 (factory derives everything from `FISH_DEFINITIONS` with no per-species code), so a new species declares its capture look in one data entry — at the cost of capture orientation living in data rather than in each class's draw method (the intended trade-off).

## Context for Implementer

Captured entities are removed from `Game._enemies` (`src/Game.js:95` filters out `isCaptured()`), so once hooked their `update()` is never called again — autonomous movement, AI, and swim-frame advancement already stop structurally. The hook owns the catch and drives only `updateCaptured()` + `draw()`. Every entity (fish and inert) routes its captured render through the shared `EnemyWithAnimation.drawCaptured()` (each `draw()` does `if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }`), and species override only `_drawCapturedSprite()` for sprite-cell specifics. This means orientation must be applied in `drawCaptured()` — the one place all hooked entities pass through — not in per-species code. All entity creation flows through `EnemyFactory.createEnemy()` (`FishSpawner.js:164`, `Game.forceHookedFishForE2E` `Game.js:305`), making `createEnemy()` the single choke point for attaching capture data.

## Capture Rotation Values (degrees, clockwise-positive on canvas)

Confirmed with user; `captureOffsetX`/`captureOffsetY` are `0` for all entities.

| Species | captureRotation | Source |
|---------|-----------------|--------|
| ButterflyFish | 75 | explicit |
| ClownFish | 80 | explicit |
| JellyFish, PufferFish, LionFish | 75 | small/medium fish hang (user choice) |
| Crab | 0 | explicit (upright) |
| Octopus | 0 | explicit (upright) |
| SwordFish | -15 | explicit (natural tilt) |
| Tuna, Shark, HammerHeadShark | -15 | large predators, natural tilt (user choice) |
| RedApple, DiscardedBottle, FishBone, Wheel, Shoe, Clock (all `isTrash`) | 0 | objects not forcibly rotated |

## Assumptions

- Canvas `rotate` is clockwise for positive radians; positive `captureRotation` rotates a head-right fish into a downward hang. Sign is verified visually in E2E (Task 3 / TS scenarios); if a species looks inverted, only its data value flips — Tasks 1–4 stand.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rotation direction/magnitude looks wrong for some sprites | Medium | Low | Verify each acceptance species in-browser via `forceHookedFishForE2E` (TS-001..TS-004); adjust only the per-species `captureRotation` data value. |

## Goal Verification

### Truths

1. Every hooked entity stays visually attached to the hook for the entire reel-in, with orientation determined solely by its `FISH_DEFINITIONS` capture data — fish hang, crab/octopus stay upright, swordfish/large predators tilt slightly, inert objects are unrotated.
2. A brand-new species can set its hooked orientation by adding `captureRotation`/`captureOffsetX`/`captureOffsetY` to its `FISH_DEFINITIONS` entry, with zero edits to `Hook.js`, `Player.js`, or any fishing-rod/hook code.

## E2E Test Scenarios

Driven via the dev server (`python3 -m http.server 8081` → `main.html`) and `game.forceHookedFishForE2E(<ENEMY_TYPE>)` to deterministically hook a chosen species, then observe the captured render on the canvas.

### TS-001: Small fish hangs from the hook
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8081/main.html?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In console run `window.__fishingTimeE2E.forceHookedFish('clown_fish')` | Returns `{hooked:true, enemyType:'ClownFish', runtimeStats:{...}}` — verify `hooked` and `enemyType` |
| 2 | Observe the hooked sprite as it reels up | ClownFish is rotated to a near-vertical hang and tracks the hook tip up the rope |

### TS-002: Crab remains upright
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8081/main.html?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `window.__fishingTimeE2E.forceHookedFish('crab')` | Returns `{hooked:true, enemyType:'Crab', runtimeStats:{...}}` |
| 2 | Observe the hooked sprite | Crab is drawn upright (no rotation), attached to the hook |

### TS-003: Octopus upright / SwordFish natural tilt
**Priority:** High
**Preconditions:** Game running at `http://localhost:8081/main.html?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `window.__fishingTimeE2E.forceHookedFish('octopus')` | Octopus drawn upright while reeled |
| 2 | Run `window.__fishingTimeE2E.forceHookedFish('sword_fish')` | SwordFish drawn with a slight (~-15°) tilt, not vertical |

### TS-004: Inert object not forcibly rotated
**Priority:** High
**Preconditions:** Game running at `http://localhost:8081/main.html?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `window.__fishingTimeE2E.forceHookedFish('shoe')` | Returns `{hooked:true, enemyType:'Shoe', runtimeStats:{...}}` |
| 2 | Observe the hooked sprite | Shoe is drawn unrotated (capture orientation 0), attached to the hook |

## Progress Tracking

- [x] Task 1: Add capture-presentation fields to all FISH_DEFINITIONS entries
- [x] Task 2: Thread capture presentation through EnemyFactory generically
- [x] Task 3: Apply capture rotation + offsets in EnemyWithAnimation.drawCaptured()
- [x] Task 4: Write ADR 0029 documenting the data-driven capture presentation

## Implementation Tasks

### Task 1: Add capture-presentation fields to all FISH_DEFINITIONS entries

**Objective:** Add `captureRotation`, `captureOffsetX`, and `captureOffsetY` to every entry in `FISH_DEFINITIONS` (both `isTrash` and non-trash), using the agreed value table. This makes capture orientation part of the single source of truth alongside the existing render geometry.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add the three fields to each of the 16 entries in `FISH_DEFINITIONS` (`src/constants.js:174`). `captureRotation` in degrees per the value table above; `captureOffsetX: 0`, `captureOffsetY: 0` for all.
- No new exported constant is required — values are inline data on each entry (consistent with how `score`/`strength`/render geometry already live inline). `FISH_SPECS`/`FISH_SCORE_MAP` derivations are unaffected (they read other keys).
- `Trivial:` purely additive data fields on existing object literals; no new branch/loop/symbol/error path. Covered by Task 2's `enemy-factory.test.js` assertions (which read these values through the factory) and Task 3's draw test. No standalone test file.

**Definition of Done:**

- [ ] All 16 `FISH_DEFINITIONS` entries have `captureRotation`, `captureOffsetX: 0`, `captureOffsetY: 0`, with rotation values matching the agreed table.
- [ ] Verify: `npx jest __tests__/enemy-factory.test.js -q`

### Task 2: Thread capture presentation through EnemyFactory generically

**Objective:** Carry the new capture fields from `FISH_DEFINITIONS` into each factory spec entry and attach them to every created instance, so all entities expose `_captureRotation`/`_captureOffsetX`/`_captureOffsetY` regardless of species. Keep this generic — no per-species branches.

**Files:**

- Modify: `src/EnemyFactory.js`
- Modify: `__tests__/enemy-factory.test.js`

**Key Decisions / Notes:**

- In the `FISH_DEFINITIONS.forEach` loop (`src/EnemyFactory.js:6`), copy the three fields onto `entry` for both trash and non-trash branches: `entry.captureRotation = def.captureRotation`, `entry.captureOffsetX = def.captureOffsetX`, `entry.captureOffsetY = def.captureOffsetY`.
- In `createEnemy()` (`src/EnemyFactory.js:62`), after `const enemy = Cls.create(...)`, attach generically before returning: set `enemy._captureRotation`/`_captureOffsetX`/`_captureOffsetY` from `spec` (guard the existing `if (!spec || !Cls) return null;` path — only attach when `enemy` is non-null). This is the single choke point covering FishSpawner and `forceHookedFishForE2E`.
- No change to any species `static create()` signature — avoids touching 16 constructors.
- The three capture fields are profile-invariant and require no handling in `_applyProfileScale` — that method only touches `spec.size/baseSize` and will leave the capture fields untouched on profile switches.

**Definition of Done:**

- [ ] `EnemyFactory.createEnemy(<type>)` returns an instance whose `_captureRotation`/`_captureOffsetX`/`_captureOffsetY` equal that species' `FISH_DEFINITIONS` values; assert for four species covering the full rotation-table range: ClownFish (`_captureRotation=80`), Crab (`0`), SwordFish (`-15`), and Shoe (`0`, trash path).
- [ ] Verify: `npx jest __tests__/enemy-factory.test.js -q`

### Task 3: Apply capture rotation + offsets in EnemyWithAnimation.drawCaptured()

**Objective:** Use the per-entity capture data when rendering a hooked entity: translate by the configured offsets and rotate the sprite by `captureRotation` (degrees→radians) about its center, for the whole capture sequence (rising and throwing). Defaults to no offset / no rotation when unset so directly-constructed entities are unaffected.

**Files:**

- Modify: `src/EnemyWithAnimation.js`
- Modify: `__tests__/catchablefish.test.js`

**Key Decisions / Notes:**

- In `drawCaptured()` (`src/EnemyWithAnimation.js:113`), change the transform block to apply offsets and rotation:
  - `this._ctx.translate(cx + (this._captureOffsetX || 0), cy + (this._captureOffsetY || 0));`
  - keep `this._ctx.scale(scale, scale);`
  - add `this._ctx.rotate((this._captureRotation || 0) * Math.PI / 180);` before `this._drawCapturedSprite(-w/2, -h/2, w, h);`
- Order is translate → scale → rotate → draw-centered, so rotation pivots on the sprite center. `|| 0` fallbacks keep the existing `catchablefish.test.js` center-positioning test green (base fish constructed without factory has no capture fields → translate stays `(RX, RY)`).
- This ordering is safe because `scale` in `drawCaptured()` is a uniform scalar (same value on both axes). If non-uniform scale is ever added (e.g. a direction flip via `scale(-1, 1)`), rotate must be moved before scale to avoid shearing.
- Add one rotation test to the existing `drawCaptured() fish center positioning` describe: add a `rotate: jest.fn()` to that block's ctx mock, set `fish._captureRotation = 75` before `fish.draw()`, and assert `rotate` was called with `75 * Math.PI / 180`. Reuse the existing `makeCapturingSetup` shape — do not add a new test file.

**Definition of Done:**

- [ ] When a captured entity has `_captureRotation = R`, `drawCaptured()` calls `ctx.rotate(R * Math.PI / 180)`; with `_captureOffsetX/Y` set, `ctx.translate` is offset accordingly.
- [ ] Existing `test_drawCaptured_translatesTo_hookEndpoint_not_hookEndpointPlusHalfHeight` still passes (no offsets/rotation on a bare fish).
- [ ] Verify: `npx jest __tests__/catchablefish.test.js -q`

### Task 4: Write ADR 0029 documenting the data-driven capture presentation

**Objective:** Record the architectural decision in a new ADR so the rationale and extension path are captured alongside ADR-0027 (data-driven factory) and ADR-0025 (traffic model).

**Files:**

- Create: `docs/adr/0029-data-driven-capture-presentation.md`

**Key Decisions / Notes:**

- Follow the existing ADR format (see `docs/adr/0027-*.md`): `# ADR 0029 - ...`, `**Date:** 2026-06-18`, `**Status:** Accepted`, then `## Context`, `## Decision`, `## Alternatives Considered`, `## Tradeoffs`, `## Consequences / Future Extensibility`.
- Content must explain: why one hardcoded capture animation is insufficient (crab/octopus/swordfish/objects look wrong rotated uniformly); why species need different presentations; why data-driven (single source of truth, ADR-0027 consistency) was chosen; alternatives considered (per-class `drawCaptured` overrides; constructor params on each species; a hardcoded type→angle map in the hook); tradeoffs; and future extensibility.
- Include a concrete example showing a new species adding `captureRotation`/`captureOffsetX`/`captureOffsetY` to its `FISH_DEFINITIONS` entry and getting correct hooked orientation with no edits to `Hook.js`/fishing-rod code.

**Definition of Done:**

- [ ] `docs/adr/0029-data-driven-capture-presentation.md` exists and covers: insufficiency of single animation, per-species need, data-driven rationale, alternatives, tradeoffs, future extensibility, and a new-species example requiring no fishing-system changes.
- [ ] Verify: `grep -q 'Alternatives Considered' docs/adr/0029-data-driven-capture-presentation.md && grep -q 'captureRotation' docs/adr/0029-data-driven-capture-presentation.md && npx jest -q` (full suite green)
