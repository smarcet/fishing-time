# Hooked Fish Struggle Animation Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** When a catchable fish is hooked on the line, it visually struggles — a sinusoidal rotation + horizontal offset oscillation that scales up with escape danger — making the fish look alive while being reeled in, until the capture launch animation takes over.

## Out of Scope

- Changes to the escape/resistance gameplay mechanic (`_escapeProgress`, `HOOK_STRUGGLE_*`)
- Animation during the capture-launch arc (fly-to-boat); that phase renders via `_drawCaptureLaunch` in `Hook.js` using static `_captureRotation` — intentionally unchanged
- Vertical bounce (horizontal + rotation alone satisfy the user's "subtle" requirement)

## Approach

**Chosen:** Extend `EnemyWithAnimation.drawCaptured()` with per-species struggle params stored in `FISH_DEFINITIONS` and propagated by `EnemyFactory`.

**Why:** `drawCaptured()` is the single rendering path for hooked entities; all catchable fish and inert objects pass through it. Putting the struggle here — and data-driving it from `FISH_DEFINITIONS` — keeps zero per-species code changes (consistent with ADR-0027). A rejected alternative (adding `struggleOffset` to `Enemy.update()`) was skipped because the struggle is a *rendering* transform, not a position update; it must never move the fish's logical position or interact with the reel mechanics.

## Context for Implementer

`drawCaptured()` already computes `escapeDanger` (0–1) for the glow system. The struggle formula re-uses that value to scale amplitude — `dangerScale = 1 + escapeDanger * STRUGGLE_DANGER_FACTOR` — matching the glow pulse pattern (`CAPTURE_PULSE_DANGER_FACTOR`). Use `this._captureTick` as the time variable; it already increments every frame in `updateCaptured()`. Apply rotation with `Math.sin(t * speed) * rotAmp * dangerScale` and X-offset with `Math.cos(t * speed * 0.7) * offAmp * dangerScale` (0.7 factor de-correlates the two waves). Guard on `this._hook.isCatchableFishHooked()` so trash items never struggle even with defensive `struggleEnabled: false`.

## Assumptions

- `_drawCaptureLaunch` in `Hook.js` (lines 386-389) reads `e._captureRotation` and calls `e._drawCapturedSprite()` directly — verified. Even if `drawCaptured()` were somehow called during launch, the `isHooked()` guard in Task 3 ensures `sRot = sOffX = 0`; the launch arc is always smooth.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| High-amplitude values on large fish clip visually outside their bounding rect | Low | Low | Conservative amplitude defaults; tunable via FISH_DEFINITIONS after visual testing |
| `this._hook` is null when `drawCaptured()` called outside hook context | Very low | Medium | The `|| 0` guard already exists on `_captureRotation`; add same null-safe guard on `isCatchableFishHooked()` check |

## Progress Tracking

- [x] Task 1: Add struggle constants and per-species fields to `FISH_DEFINITIONS`
- [x] Task 2: Propagate struggle fields in `EnemyFactory.createEnemy()`
- [x] Task 3: Apply struggle animation in `EnemyWithAnimation.drawCaptured()`
- [x] Task 4: Tests + ADR

## Implementation Tasks

---

### Task 1: Add struggle constants and per-species fields to `FISH_DEFINITIONS`

**Objective:** Add one shared tuning constant (`STRUGGLE_DANGER_FACTOR`) and four per-species fields (`struggleEnabled`, `struggleSpeed`, `struggleRotationAmplitude`, `struggleOffsetAmplitude`) to every entry in `FISH_DEFINITIONS` in `src/constants.js`. This is the single source of truth; no per-species code changes elsewhere.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add `STRUGGLE_DANGER_FACTOR = 1.0` to `src/constants.js` in the tuning-constants block and export it in `module.exports`. (Note: `CAPTURE_PULSE_DANGER_FACTOR` is a file-local constant in `EnemyWithAnimation.js` — do NOT co-locate there; these are distinct files.) This means at max escape danger the struggle amplitude doubles.
- Place the four new fields after `captureOffsetY` in each FISH_DEFINITIONS entry (consistent field ordering).
- Export `STRUGGLE_DANGER_FACTOR` in the `module.exports` block at the bottom.
- Per-species values:

  | Species | enabled | speed | rotAmp (°) | offAmp (px) |
  |---------|---------|-------|-----------|------------|
  | ClownFish | true | 0.15 | 8 | 3 |
  | JellyFish | true | 0.12 | 6 | 2 |
  | ButterflyFish | true | 0.15 | 8 | 3 |
  | LionFish | true | 0.10 | 10 | 4 |
  | PufferFish | true | 0.10 | 6 | 3 |
  | Shark | true | 0.06 | 12 | 5 |
  | HammerheadShark | true | 0.07 | 12 | 5 |
  | SwordFish | true | 0.08 | 14 | 6 |
  | Tuna | true | 0.08 | 12 | 5 |
  | Octopus | true | 0.06 | 5 | 2 |
  | Crab | true | 0.05 | 4 | 2 |
  | DiscardedBottle | false | 0 | 0 | 0 |
  | RedApple | false | 0 | 0 | 0 |
  | Wheel | false | 0 | 0 | 0 |
  | Shoe | false | 0 | 0 | 0 |
  | FishBone | false | 0 | 0 | 0 |
  | Clock | false | 0 | 0 | 0 |

**Definition of Done:**

- [ ] `STRUGGLE_DANGER_FACTOR` constant declared and exported
- [ ] All 17 `FISH_DEFINITIONS` entries have all 4 struggle fields
- [ ] `STRUGGLE_DANGER_FACTOR` appears in the `module.exports` block
- [ ] Verify: `npm test -- --testPathPattern=enemy-factory --silent` (factory tests prove spec is importable and parseable)

---

### Task 2: Propagate struggle fields in `EnemyFactory.createEnemy()`

**Objective:** Read the four new fields from the built spec entry and set them on the entity instance, exactly as `captureRotation` / `captureOffsetX` / `captureOffsetY` are already set today.

**Files:**

- Modify: `src/EnemyFactory.js`

**Key Decisions / Notes:**

- In the constructor's `FISH_DEFINITIONS.forEach` block (lines 6-24), add to `entry`:
  ```js
  entry.struggleEnabled           = def.struggleEnabled;
  entry.struggleSpeed             = def.struggleSpeed;
  entry.struggleRotationAmplitude = def.struggleRotationAmplitude;
  entry.struggleOffsetAmplitude   = def.struggleOffsetAmplitude;
  ```
- In `createEnemy()` (lines 71-73), add after existing capture property assignments. Use `??` defaults so any species entry missing struggle fields degrades to no-struggle (no NaN in canvas transforms):
  ```js
  enemy._struggleEnabled           = spec.struggleEnabled ?? false;
  enemy._struggleSpeed             = spec.struggleSpeed ?? 0;
  enemy._struggleRotationAmplitude = spec.struggleRotationAmplitude ?? 0;
  enemy._struggleOffsetAmplitude   = spec.struggleOffsetAmplitude ?? 0;
  ```
- `Trivial:` ≤ 8 new lines, no new branch/loop/error path, no new public symbol; covered by the factory test in Task 4.

**Definition of Done:**

- [ ] `createEnemy()` sets all 4 struggle properties on every created entity
- [ ] Verify: `npm test -- --testPathPattern=enemy-factory --silent`

---

### Task 3: Apply struggle animation in `EnemyWithAnimation.drawCaptured()`

**Objective:** Compute a sinusoidal rotation delta and X-offset delta from the species struggle params (scaled by `escapeDanger`) and fold them into the existing canvas transform in `drawCaptured()`.

**Files:**

- Modify: `src/EnemyWithAnimation.js`

**Key Decisions / Notes:**

- `escapeDanger` is already computed (line 80-82). Keep it as-is.
- After computing `escapeDanger`, add:
  ```js
  const dangerScale = 1 + escapeDanger * STRUGGLE_DANGER_FACTOR;
  const t = this._captureTick;
  const struggleActive = this._struggleEnabled && this._hook && this._hook.isHooked();
  const sRot  = struggleActive
    ? Math.sin(t * this._struggleSpeed) * this._struggleRotationAmplitude * dangerScale
    : 0;
  const sOffX = struggleActive
    ? Math.sin(t * this._struggleSpeed * 0.7) * this._struggleOffsetAmplitude * dangerScale
    : 0;
  ```
- Change the translate line (currently line 102):
  ```js
  this._ctx.translate(cx + (this._captureOffsetX || 0) + sOffX, cy + (this._captureOffsetY || 0));
  ```
- Change the rotate line (currently line 104):
  ```js
  this._ctx.rotate(((this._captureRotation || 0) + sRot) * Math.PI / 180);
  ```
- `STRUGGLE_DANGER_FACTOR` is a global from `src/constants.js` (loaded via `<script>` before `EnemyWithAnimation.js` in `main.html`). Just use it directly — no import needed, and no copy into `EnemyWithAnimation.js`.
- Guard uses `isHooked()` (Hook.js:405 — `this._status === HOOK_STATUS_HOOKED`) NOT `isCatchableFishHooked()`. The latter checks `this._catch instanceof CatchableFish`, which returns `true` even during `HOOK_STATUS_CAPTURE_LAUNCH` if the catch object is still referenced, so it would NOT correctly gate the struggle. `isHooked()` is the correct hook-status gate.
- The null-guard `this._hook &&` prevents crashes if `drawCaptured()` is ever called before `captured(hook)` fully wires up.
- Both `sRot` and `sOffX` use `Math.sin()` (sin(0)=0), so there is no initial-frame jump when the fish is first hooked.

**Definition of Done:**

- [ ] `drawCaptured()` computes `sRot` and `sOffX` using the species struggle params
- [ ] Translate and rotate calls incorporate `sRot` / `sOffX`
- [ ] When `struggleEnabled = false`, `sRot === 0` and `sOffX === 0` (no visual change for trash)
- [ ] When `_captureTick = 0`, both `sRot === 0` and `sOffX === 0` (sin(0) = 0 — no initial jump in either axis)
- [ ] Verify: `npm test -- --silent`

---

### Task 4: Tests + ADR

**Objective:** Add tests covering the new struggle propagation and rendering behavior, and document the decision in an ADR.

**Files:**

- Modify: `__tests__/enemy-factory.test.js`
- Create: `__tests__/enemy-with-animation.test.js`
- Create: `docs/adr/0030-hooked-fish-struggle-animation.md`

**Key Decisions / Notes:**

- **Factory test** (extend existing `enemy-factory.test.js`): Add one test case in the existing `describe('EnemyFactory configured roster')` block:
  ```js
  test('sets struggle properties from FISH_DEFINITIONS on created entities', () => {
    const factory = new EnemyFactory();
    const game = makeGame();
    const clown = factory.createEnemy(ENEMY_TYPE_CLOWN_FISH, game, {});
    expect(clown._struggleEnabled).toBe(true);
    expect(clown._struggleSpeed).toBe(0.15);
    expect(clown._struggleRotationAmplitude).toBe(8);
    expect(clown._struggleOffsetAmplitude).toBe(3);
    const bottle = factory.createEnemy(ENEMY_TYPE_DISCARDED_BOTTLE, game, {});
    expect(bottle._struggleEnabled).toBe(false);
  });
  ```

- **EnemyWithAnimation test** (new file — `drawCaptured()` has meaningful new branching behavior that warrants its own test):
  - Use a concrete subclass (e.g. `ClownFish`) via `require('../index.js')` and create an instance via `EnemyFactory.createEnemy()` or manually with `new ClownFish(...)` so all required properties are properly initialized.
  - Mock `ctx.rotate` via `jest.fn()` to capture the angle argument. Before calling `drawCaptured()` directly, set all required properties manually:
    - `fish._status = ENEMY_STATUS_CAPTURED`
    - `fish._captureTick = 60` (mid-cycle — sin(60*0.15) ≠ 0)
    - `fish._captureRotation = 80`, `fish._captureOffsetX = 0`, `fish._captureOffsetY = 0`
    - `fish._struggleEnabled = true`, `fish._struggleSpeed = 0.15`, `fish._struggleRotationAmplitude = 8`, `fish._struggleOffsetAmplitude = 3`
    - `fish._hook = { getEndpoint: () => new Point(200, 300), isHooked: () => true, isCatchableFishHooked: () => true, _escapeProgress: 0 }`
  - Test A: with above setup → `ctx.rotate` called with angle ≠ `80 * Math.PI / 180` (struggle rotation delta applied)
  - Test B: `_struggleEnabled = false` → `ctx.rotate` called with exactly `80 * Math.PI / 180`
  - Test C: `_struggleEnabled = true` but `hook.isHooked() = false` → `ctx.rotate` called with exactly `80 * Math.PI / 180` (no struggle when not in HOOKED state)

- **ADR-0030** — one paragraph: what was decided, why `drawCaptured()` was the right place, why rendering not position, why FISH_DEFINITIONS as source of truth.

**Definition of Done:**

- [ ] `enemy-factory.test.js` passes with new struggle-property assertion
- [ ] `enemy-with-animation.test.js` passes with all 3 test cases
- [ ] `docs/adr/0030-hooked-fish-struggle-animation.md` created
- [ ] Verify: `npm test -- --silent` (full suite, 0 failures)

---

## E2E Test Scenarios

### TS-001: Fish visually struggles while hooked

**Priority:** Critical
**Preconditions:** Dev server running at `http://localhost:8081/main.html`; desktop viewport
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8081/main.html` | Game canvas renders, fisherman on boat |
| 2 | Press Space to cast | Hook swings and descends into water |
| 3 | Wait until a fish is hooked (observe bottom status or hook glow) | Hook glow turns gold |
| 4 | Observe the hooked fish over 2 seconds without pressing any key | Fish visibly oscillates in rotation and horizontal position — it does NOT swim normally |
| 5 | Press arrow keys rapidly to reel | Glow turns redder; struggle amplitude increases visually |
| 6 | Continue reeling until fish reaches boat | At capture launch, fish flies to boat without struggle (static rotation during arc) |

### TS-002: Trash items do not struggle

**Priority:** High
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Cast and wait to hook a trash item (bottle, wheel, apple, etc.) | Trash item caught |
| 2 | Observe the hooked trash item for 2 seconds | Item hangs statically on hook — no oscillation |

## Goal Verification

### Truths

1. While a catchable fish (not trash) is at `HOOK_STATUS_HOOKED`, its rendered rotation at frame N differs from its rendered rotation at frame 0 by at least `struggleRotationAmplitude * 0.5` degrees (accounting for mid-cycle values) — verified by TS-001 visual observation and the EnemyWithAnimation unit test.
2. At maximum `escapeDanger` (= 1.0), the struggle amplitude is `2× the base species amplitude` — verified by the unit test asserting `dangerScale` math.
3. During `HOOK_STATUS_CAPTURE_LAUNCH`, the struggle guard `this._hook.isHooked()` returns `false` (hook status has changed), so `sRot = sOffX = 0`. The launch arc renders via `_drawCaptureLaunch` using raw `_captureRotation` — always smooth.
