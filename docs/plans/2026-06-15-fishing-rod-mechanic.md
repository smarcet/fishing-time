# Fishing Rod Mechanic (State-Based) Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Implement a 6-state fishing rod mechanic (Idle → Casting → Hooked / RetrievingEmpty → Captured / Escaped) with a fish struggle sub-mechanic, refactor the entity hierarchy into CatchableFish and InertObject base classes, and rename Fish → ButterflyFish.

## Out of Scope

- New sprite assets for Boot, Can, Treasure Chest, Tire (DiscardedBottle is the existing inert object; future objects reuse InertObject)
- Audio feedback for escape / capture events
- Visual HUD showing escape progress bar
- Tuna and Shark entity classes — `FISH_SPECS` includes reserved entries (`shark`) but no entity classes are created; they serve as future extension points

## Approach

**Chosen:** Extend `src/Hook.js` with a 6-state machine; introduce `CatchableFish` and `InertObject` mid-layer classes between `EnemyWithAnimation` and the concrete entities.

**Why:** The existing Hook already owns rope physics and cast angle; extending it avoids a redundant wrapper class. Inserting CatchableFish / InertObject into the hierarchy means the Hook detects fight vs. auto-retrieve with a single `getFightSpec()` duck-type call — no `instanceof` chain and no logic change needed when new entity types are added later.

## Context for Implementer

**Single-press cast with auto-extend.** The current code extends the rope while Space is *held*. The new model fires on the *rising edge* of Space (off→on) and then auto-extends every tick until the hook hits something or reaches `HOOK_MAX_ROPE_LENGTH`. The Hook detects the rising edge by storing `_prevSpaceHeld` and comparing to the current frame's space state.

**deltaTime threading.** The fish escape formula `escape_progress += strength × escape_rate × dt` requires deltaTime in seconds. `main.js` already passes dt (ms) to `game.update(dt)`, but Game → Player → Hook do not forward it. All three `update()` signatures need an optional `dt` param. Units: **seconds** (divide ms by 1000 before using in the formula).

**getFightSpec() contract.** CatchableFish subclasses return `{ strength, escapeRate }`. InertObject returns `null`. Hook.setCatch() calls `entity.getFightSpec()` to set `_isFishHook` and store the spec. This keeps Hook.js free of class-name dependencies.

**Cast animation gate preserved.** Player.js blocks `hook.update()` until `__castAnimationEnded` (existing pattern). Hook transitions IDLE → CAST in the same frame the press is detected; the gate then holds the rope still until the animation finishes. Net effect: hook starts extending one frame after the press, indistinguishable at 60 fps.

## Runtime Environment

- **Start:** `python3 -m http.server 8000` in repo root
- **URL:** `http://localhost:8000/main.html`
- **No build step.**

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Existing octopus/crab tests break when parent class changes | Medium | Low | Octopus `instanceof EnemyWithAnimation` still holds through CatchableFish; add explicit `instanceof CatchableFish` check in new tests |
| Fish escape math unbalanced (too easy or instant escape) | High | Medium | Tune FISH_SPECS values in Task 1; mark them with a "TUNE" comment so they're easy to find |
| ButterflyFish rename misses a reference (double export, stale test import) | Low | Medium | Grep for 'Fish' after Task 3 to find leftovers |

## Goal Verification

### Truths

1. Pressing Space once while the hook is Idle fires a cast that auto-travels without any further key input, and the line always returns (via Captured, Escaped, or RetrievingEmpty) before a second cast can fire.
2. A ButterflyFish / Octopus / Crab hooked entity increases `_escapeProgress` every frame and the hook returns to Idle when `_escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE` — verified by TS-004.
3. A DiscardedBottle (InertObject) hooked entity auto-reels with no player input required and dispatches `enemyCaptured` when the rope reaches REST length — verified by TS-005.

## E2E Test Scenarios

### TS-001: Single press fires cast and auto-returns on miss
**Priority:** Critical
**Preconditions:** Game running, hook idle
**Mapped Tasks:** Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open `http://localhost:8000/main.html` | Canvas renders, boat visible |
| 2 | Tap Space once (brief press, release immediately) | Hook launches and line extends downward automatically |
| 3 | Wait without pressing anything | Hook travels to max depth / seabed and auto-retracts |
| 4 | Observe rope reaching REST | Hook returns to idle swing, player back to idle pose |

### TS-002: Seabed collision triggers RetrievingEmpty
**Priority:** Critical
**Preconditions:** Fish are positioned away from the cast path
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Press Space once | Hook casts |
| 2 | Wait for hook to reach bottom of canvas | Hook auto-retracts immediately (RetrievingEmpty) |
| 3 | Observe no catch registered | Hook returns to Idle swing, no capture event |

### TS-003: ButterflyFish caught — player wins by pressing Space
**Priority:** Critical
**Preconditions:** ButterflyFish visible on screen
**Mapped Tasks:** Task 3, Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Cast toward a ButterflyFish | Hook collides, struggle begins (boat shows REEL animation) |
| 2 | Repeatedly press Space at ~5 presses/sec | Rope visually shortens each press |
| 3 | Press until fish reaches boat | `enemyCaptured` fires; fish disappears; hook returns to Idle |

### TS-004: Fish escapes when player does not reel
**Priority:** High
**Preconditions:** ButterflyFish (or Shark/Crab) hooked
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Hook catches a fish | Struggle state begins |
| 2 | Do NOT press Space | Escape progress fills up |
| 3 | Wait until fish breaks free | Fish disappears from hook, hook returns to Idle |

### TS-005: DiscardedBottle (InertObject) auto-retrieves without input
**Priority:** High
**Preconditions:** DiscardedBottle (green bottle) visible on screen
**Mapped Tasks:** Task 3, Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Cast toward the bottle | Hook collides |
| 2 | Do NOT press Space after collision | Rope auto-reels, bottle moves toward boat |
| 3 | Bottle reaches boat | `enemyCaptured` fires; bottle disappears; hook Idle |

### TS-006: Crab / Octopus hooked uses struggle mechanic
**Priority:** High
**Preconditions:** Crab or Octopus visible
**Mapped Tasks:** Task 3, Task 5

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Hook hits Crab or Octopus | REEL animation plays (struggle active) |
| 2 | Press Space repeatedly | Rope shortens; escape progress reduced |
| 3 | Continue until captured or escaped | Appropriate event fires |

## Progress Tracking

- [x] Task 1: Add new hook-state and struggle constants to constants.js
- [x] Task 2: Create CatchableFish and InertObject base classes
- [x] Task 3: Rename Fish → ButterflyFish, Trash → DiscardedBottle; migrate entity hierarchy
- [x] Task 4: Thread deltaTime through Game → Player → Hook; update Player cast trigger
- [x] Task 5: Refactor Hook.js to 6-state machine; add Enemy.escaped() method
- [x] Task 6: Update hook.test.js (rename CATCH→HOOKED, add state tests)

## Implementation Tasks

---

### Task 1: Add new hook-state and struggle constants to constants.js

**Objective:** Extend `src/constants.js` with all constants the new state machine and fish struggle mechanic need: new Hook status strings, struggle tunables, max cast distance, and a FISH_SPECS data table. All consuming modules (Hook, CatchableFish) import from this single source.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- New Hook statuses: `HOOK_STATUS_HOOKED = 'HOOKED'` and `HOOK_STATUS_RETRIEVING_EMPTY = 'RETRIEVING_EMPTY'`. Keep `HOOK_STATUS_IDLE` and `HOOK_STATUS_CAST` unchanged.
- `HOOK_STATUS_CATCH = 'CATCH'` is removed — it no longer exists as a state. `HOOK_STATUS_HOOKED` replaces it.
- Struggle tunables (mark each with `// TUNE` comment for easy search):
  ```js
  const HOOK_STRUGGLE_REEL_POWER      = 20;    // escape_progress reduction per Space press — TUNE
  const HOOK_STRUGGLE_MAX_ESCAPE      = 100;   // ceiling; fish breaks free at this value — TUNE
  const HOOK_REEL_DISTANCE_PER_PRESS  = 15;    // rope shrink (px) per Space press — TUNE
  const HOOK_MAX_ROPE_LENGTH          = 600;   // max rope before miss transition — TUNE
  ```
- `FISH_SPECS` object (escape_rate is points/second, dt will be in seconds in the formula):
  ```js
  const FISH_SPECS = {
    butterfly_fish: { strength: 5,  escape_rate: 1.5 },  // easy — used by ButterflyFish
    // tuna: reserved for a future TunaFish entity — NOT used at launch
    shark:          { strength: 60, escape_rate: 3.0 },  // hard — reserved for future SharkFish
    octopus:        { strength: 20, escape_rate: 1.8 },  // moderate — used by Octopus
    crab:           { strength: 40, escape_rate: 2.2 },  // hard — used by Crab
  };
  ```
- Export all new names in the `module.exports` block at the bottom of constants.js.

**Definition of Done:**

- [ ] `HOOK_STATUS_HOOKED`, `HOOK_STATUS_RETRIEVING_EMPTY`, struggle tunables, and `FISH_SPECS` are present in the file and exported.
- [ ] `HOOK_STATUS_CATCH` is removed from BOTH the `const` declaration AND the `module.exports` block. Confirm zero hits: `grep -n "HOOK_STATUS_CATCH" src/constants.js`.
- [ ] Verify: `npm test` — full suite passes (no constant reference broken yet at this stage).

---

### Task 2: Create CatchableFish and InertObject base classes

**Objective:** Insert two new mid-hierarchy classes between `EnemyWithAnimation` and the concrete entity classes. `CatchableFish` adds `_strength`, `_escapeRate`, and `getFightSpec()`. `InertObject` adds only `getFightSpec() → null`. Both are loaded in `main.html` and exported from `index.js` so all existing tests continue to import correctly.

**Files:**

- Create: `src/CatchableFish.js`
- Create: `src/InertObject.js`
- Modify: `main.html` (add two new `<script>` tags)
- Modify: `index.js` (export both new classes)

**Key Decisions / Notes:**

- `CatchableFish` constructor signature mirrors `EnemyWithAnimation` exactly — subclasses call `super(...)` without changes:
  ```js
  class CatchableFish extends EnemyWithAnimation {
    constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
      super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
      this._strength   = 0;   // subclass must set
      this._escapeRate = 0;   // subclass must set
    }
    getFightSpec() { return { strength: this._strength, escapeRate: this._escapeRate }; }
  }
  ```
- `InertObject` is even thinner — just overrides `getFightSpec()`:
  ```js
  class InertObject extends EnemyWithAnimation {
    getFightSpec() { return null; }
  }
  ```
- `main.html` script order: `CatchableFish.js` and `InertObject.js` must come **after** `EnemyWithAnimation.js` and **before** `Trash.js`, `Octopus.js`, `Crab.js`, `Fish.js` (soon ButterflyFish.js):
  ```html
  <script src="src/EnemyWithAnimation.js"></script>
  <script src="src/CatchableFish.js"></script>    <!-- NEW -->
  <script src="src/InertObject.js"></script>       <!-- NEW -->
  <script src="src/Trash.js"></script>
  ```
- `index.js`: require and export both files. After Task 2, the `module.exports` line must be:
  ```js
  module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, CatchableFish, InertObject, Trash, Octopus, Crab, Fish, Hook, Player, Bubble };
  ```
  (After Task 3 completes, `Fish` becomes `ButterflyFish` and `Trash` becomes `DiscardedBottle` in this line.)

**Definition of Done:**

- [ ] `CatchableFish` and `InertObject` exist as global browser-accessible classes via the script tags.
- [ ] `getFightSpec()` returns the correct shape for each class.
- [ ] `CatchableFish` and `InertObject` appear in `module.exports` of `index.js` and are importable via `require('../index.js')` in tests.
- [ ] Verify: `npm test` — full suite still passes (existing tests unchanged; hierarchy additions are backward-compatible).

---

### Task 3: Rename Fish → ButterflyFish; migrate entity hierarchy

**Objective:** Rename `src/Fish.js` → `src/ButterflyFish.js` (class: `ButterflyFish`) and `src/Trash.js` → `src/DiscardedBottle.js` (class: `DiscardedBottle`). Update `Octopus` and `Crab` to extend `CatchableFish` with self-initialized fight specs. Update `DiscardedBottle` to extend `InertObject`. Update all references, script tags, exports, and test files accordingly.

**Files:**

- Create: `src/ButterflyFish.js` (content from `src/Fish.js`, renamed)
- Delete: `src/Fish.js`
- Create: `src/DiscardedBottle.js` (content from `src/Trash.js`, renamed)
- Delete: `src/Trash.js`
- Modify: `src/Octopus.js` (extend CatchableFish, add strength/escapeRate)
- Modify: `src/Crab.js` (extend CatchableFish, add strength/escapeRate)
- Modify: `main.html` (`Fish.js` → `ButterflyFish.js`, `Trash.js` → `DiscardedBottle.js`)
- Modify: `index.js` (export `ButterflyFish`, `DiscardedBottle`; remove `Fish`, `Trash`)
- Modify: `src/Game.js` (`new Fish(...)` → `new ButterflyFish(...)`, `new Trash(...)` → `new DiscardedBottle(...)`)
- Create: `__tests__/butterflyfish.test.js` (from fish.test.js, updated)
- Delete: `__tests__/fish.test.js`
- Create: `__tests__/discardedBottle.test.js` (from trash.test.js, updated)
- Delete: `__tests__/trash.test.js`

**Key Decisions / Notes:**

- ButterflyFish extends CatchableFish (not EnemyWithAnimation). It calls super with the same args, then sets specs:
  ```js
  class ButterflyFish extends CatchableFish {
    constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, specKey = 'butterfly_fish') {
      super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
      this._staggerFrame = ANIM_STAGGER_SLOW;
      const spec = FISH_SPECS[specKey] || FISH_SPECS['butterfly_fish'];
      this._strength   = spec.strength;
      this._escapeRate = spec.escape_rate;
    }
    // ... rest identical to current Fish class ...
  }
  ```
- Octopus sets its own specs in its constructor (no constructor signature change):
  ```js
  // inside Octopus constructor, after existing super() call:
  this._strength   = FISH_SPECS['octopus'].strength;
  this._escapeRate = FISH_SPECS['octopus'].escape_rate;
  ```
  Same pattern for Crab using `FISH_SPECS['crab']`.
- DiscardedBottle: rename class to `DiscardedBottle extends InertObject` — all other code stays.
- After rename, verify no stale references: `grep -rn "new Fish\b\|class Fish\b\|new Trash\b\|class Trash\b" src/ __tests__/ index.js main.html`
- `__tests__/butterflyfish.test.js`: update import (`ButterflyFish`), `makeFish` → `makeButterflyFish`, class name references. Behavioral assertions unchanged.
- `__tests__/discardedBottle.test.js`: update import (`DiscardedBottle`), `makeTrash` → `makeDiscardedBottle`, class name references. Behavioral assertions unchanged.
- `Game.js`: `new Fish(...)` → `new ButterflyFish(...)` (3 occurrences in the fish spawn loop); `new Trash(...)` → `new DiscardedBottle(...)` (1 occurrence).

**Definition of Done:**

- [ ] `src/Fish.js` and `src/Trash.js` are deleted; `src/ButterflyFish.js` and `src/DiscardedBottle.js` exist with correct class names.
- [ ] Octopus and Crab pass their existing tests after hierarchy change.
- [ ] `__tests__/butterflyfish.test.js` passes all behavioral tests from `fish.test.js`.
- [ ] `__tests__/discardedBottle.test.js` passes all behavioral tests from `trash.test.js`.
- [ ] Stale reference grep returns zero hits.
- [ ] Verify: `npm test` — full suite passes.

---

### Task 4: Thread deltaTime through Game → Player → Hook; update Player cast trigger

**Objective:** Forward the `deltaTime` (milliseconds) received by `Game.update(dt)` through to `Player.update(dt)` and `Hook.update(dt)` as an optional argument, so Hook can normalize to seconds for the fish escape formula. Also update `Player.js` to trigger the CAST animation state from the hook's state (`hook.isCasting()`) rather than from Space being held — eliminating the need to hold Space to show the cast pose.

**Files:**

- Modify: `src/Game.js`
- Modify: `src/Player.js`

**Key Decisions / Notes:**

- `Game.update(dt = 0)` — already receives dt from main.js. Change the call: `this._player.update(dt)`.
- `Player.update(dt = 0)` — receives dt, passes through: `this._hook.update(dt)`.
- `Hook.update(dt = 0)` — receives dt. Divide by 1000 where needed: `const dtSec = dt / 1000;`. This is the ONLY place the ms→s conversion happens (do NOT convert in Game or Player).
- Player cast trigger change (replace the `hasKey(KEY_SPACE)` block that sets PLAYER_STATE_CAST):
  ```js
  // Before:
  else if (this._game.hasKey(KEY_SPACE) && !(arrowHeld)) {
    if (this._state !== PLAYER_STATE_CAST) { resetCastAnim(); }
    this._state = PLAYER_STATE_CAST;
  }

  // After:
  else if (this._hook.isCasting()) {
    if (this._state !== PLAYER_STATE_CAST) { resetCastAnim(); }
    this._state = PLAYER_STATE_CAST;
  }
  ```
  `resetCastAnim()` means the two lines `this._frameX = this._frameY = 0; this.__castAnimationEnded = false;`.
- REEL override (`hadCatch()` returning true on HOOKED state) still fires after the cast block — no change needed there.
- Existing `if(this.__castAnimationEnded || this._state !== PLAYER_STATE_CAST) this._hook.update(dt)` gate: update the call to pass `dt`.

**Definition of Done:**

- [ ] `game.update(50)` flows dt through to player and hook without errors.
- [ ] Player shows CAST animation when the hook is in CAST state (not only when Space is held).
- [ ] Verify: `npm test` — full suite passes.

---

### Task 5: Refactor Hook.js to 6-state machine

**Objective:** Replace the existing 3-state machine in `src/Hook.js` (IDLE / CAST / CATCH) with a 6-state machine (IDLE → CAST → HOOKED / RETRIEVING_EMPTY → Idle, with Captured/Escaped as transient events). CAST now auto-extends without player input. HOOKED forks into fish-struggle (for CatchableFish entities) or auto-reel (for InertObject entities). RETRIEVING_EMPTY ignores all collision.

**Files:**

- Modify: `src/Hook.js`
- Modify: `src/Enemy.js` (add `escaped()` method)

**Key Decisions / Notes:**

- **Remove** `_reachedBottom` flag — the RETRIEVING_EMPTY state replaces its function.
- **Add fields in constructor:**
  ```js
  this._escapeProgress = 0;
  this._prevSpaceHeld  = false;
  this._isFishHook     = false;
  this._activeFightSpec = null;  // { strength, escapeRate } from getFightSpec()
  ```
- **Rising-edge detection** (in update, before the state switch):
  ```js
  const spaceHeld    = this._player._game.hasKey(KEY_SPACE) &&
    !(this._player._game.hasKey(KEY_ARROW_LEFT) || this._player._game.hasKey(KEY_ARROW_RIGHT));
  const spacePressed = spaceHeld && !this._prevSpaceHeld;
  this._prevSpaceHeld = spaceHeld;
  ```
- **State machine:**

  **IDLE:**
  ```js
  if (spacePressed) {
    this._castAngle = this._angle;
    this._status = HOOK_STATUS_CAST;
    this._ropeLength += HOOK_CAST_SPEED;  // first extension on the press frame
  } else {
    this._swingPhase += HOOK_SWING_SPEED;
    this._angle = HOOK_MAX_SWING_ANGLE * Math.sin(this._swingPhase);
  }
  ```

  **CAST:**
  ```js
  const atSeabed = this._endpoint().getY() >= gameHeight * HOOK_MAX_DEPTH_FACTOR;
  const atMaxDist = this._ropeLength >= HOOK_MAX_ROPE_LENGTH;
  if (atSeabed || atMaxDist) {
    this._status = HOOK_STATUS_RETRIEVING_EMPTY;
  } else {
    this._ropeLength += HOOK_CAST_SPEED;
  }
  ```
  No space check — cast is fully automatic.

  **HOOKED:**
  ```js
  if (this._isFishHook) {
    const spec = this._activeFightSpec;
    this._escapeProgress += spec.strength * spec.escapeRate * dtSec;
    if (spacePressed) {
      this._escapeProgress = Math.max(0, this._escapeProgress - HOOK_STRUGGLE_REEL_POWER);
      this._ropeLength     = Math.max(HOOK_REST_LENGTH, this._ropeLength - HOOK_REEL_DISTANCE_PER_PRESS);
    }
    if (this._escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE) {
      this._dispatchEscaped();
      this._clearHooked();
    } else if (this._ropeLength <= HOOK_REST_LENGTH) {
      this._catch.updateCaptured();
      this.clearCaptured();
    }
  } else {
    // inert object: auto-reel
    this._catch.updateCaptured();
    this._ropeLength -= HOOK_CATCH_REEL_SPEED;
    if (this._ropeLength <= HOOK_REST_LENGTH) {
      this.clearCaptured();
    }
  }
  ```

  **RETRIEVING_EMPTY:**
  ```js
  this._ropeLength -= HOOK_REEL_SPEED;
  if (this._ropeLength <= HOOK_REST_LENGTH) {
    this._ropeLength = HOOK_REST_LENGTH;
    this._status = HOOK_STATUS_IDLE;
  }
  ```

- **`setCatch(entity)`** — updated to handle fish vs. inert:
  ```js
  setCatch(entity) {
    const spec = entity.getFightSpec ? entity.getFightSpec() : null;
    this._status = HOOK_STATUS_HOOKED;
    this._catch = entity;
    this._catchRopeStart = this._ropeLength;
    this._isFishHook = spec !== null;
    this._activeFightSpec = spec;
    this._escapeProgress = 0;
    entity.captured(this);
  }
  ```

- **`_dispatchEscaped()`** — new private method:
  ```js
  _dispatchEscaped() {
    if (typeof document !== 'undefined' && this._catch) {
      const pos = this.getPosition();
      document.dispatchEvent(new CustomEvent('enemyEscaped', {
        detail: { enemyType: this._catch.constructor.name, x: pos.getX(), y: pos.getY() }
      }));
    }
  }
  ```

- **`_clearHooked()`** — resets state after escape (dispatches escape event, resets entity):
  ```js
  _clearHooked() {
    if (this._catch) {
      this._catch.escaped();   // resets entity status so it stays in game._enemies
    }
    this._catch = null;
    this._catchRopeStart = null;
    this._status = HOOK_STATUS_IDLE;
    this._ropeLength = HOOK_REST_LENGTH;
    this._escapeProgress = 0;
    this._isFishHook = false;
    this._activeFightSpec = null;
  }
  ```

- **`clearCaptured()`** — update: reset `_isFishHook`, `_activeFightSpec`, and `_escapeProgress` in addition to current logic. **The `document.dispatchEvent(enemyCaptured)` call that already exists MUST be preserved.** Do NOT remove or skip that dispatch when refactoring this method.

- **Enemy.escaped() — new method on `src/Enemy.js`:**
  ```js
  escaped() {
    this._status = null;   // clears the ENEMY_STATUS_CAPTURED flag
    this._hook = null;
    this._captureTick = 0;
  }
  ```
  Called from `_clearHooked()` before nulling `_catch`. This resets the entity so `isCaptured()` returns false and the entity stays in `game._enemies` to swim freely. Without this call, the escaped entity would remain in `ENEMY_STATUS_CAPTURED` state and be filtered out of the game on the next frame. The entity can then be re-caught on a subsequent cast.

- **`hadCatch()`** — update: `return this._status === HOOK_STATUS_HOOKED;`

- **`isCasting()`** — unchanged: `return this._status === HOOK_STATUS_CAST;`

- **New public methods** (for tests and external observers):
  - `isHooked()` → `this._status === HOOK_STATUS_HOOKED`
  - `isRetrievingEmpty()` → `this._status === HOOK_STATUS_RETRIEVING_EMPTY`

- **`draw()`** — unchanged structurally; HOOKED is now the label for what was CATCH. The `this._catch.draw()` call at the end already handles both fish and inert.

**Definition of Done:**

- [ ] A single Space press (not hold) transitions Hook from IDLE → CAST.
- [ ] In CAST state, ropeLength grows every tick without any key input.
- [ ] Reaching `HOOK_MAX_ROPE_LENGTH` or seabed transitions to RETRIEVING_EMPTY.
- [ ] In RETRIEVING_EMPTY, `isCasting()` returns false (Game.js will not register new catches).
- [ ] `setCatch()` with a CatchableFish entity starts the struggle mechanic (escape progress grows).
- [ ] `setCatch()` with an InertObject entity auto-reels without escape progress.
- [ ] `hadCatch()` returns true when status is HOOKED, false otherwise.
- [ ] `clearCaptured()` still dispatches `enemyCaptured` via `document.dispatchEvent` on capture (for both fish and inert). Confirmed by existing `clearCaptured` test in hook.test.js.
- [ ] After escape, the entity remains in `game._enemies` (visible on screen, can be re-caught). `_clearHooked()` calls `entity.escaped()` before nulling `_catch`.
- [ ] Verify: `npm test` — full suite passes (including updated hook.test.js from Task 6).

---

### Task 6: Update hook.test.js with new state tests

**Objective:** Update `__tests__/hook.test.js` to reflect the new state machine: rename 'CATCH' → 'HOOKED', remove tests that rely on the hold-to-cast input model, and add tests for single-press cast, auto-extend, seabed/max-distance → RetrievingEmpty, fish struggle, inert auto-reel, and escape/capture transitions.

**Files:**

- Modify: `__tests__/hook.test.js`

**Key Decisions / Notes:**

- Tests import from `../index.js` — no import change needed.
- **Rising-edge convention:** directly set `hook._prevSpaceHeld = false` before the Space-held `update()` call to simulate a press (rising edge). This is the single chosen pattern for all new tests — do not introduce a `makeMockGameWithPress` helper. Example:
  ```js
  hook._player._game = makeMockGame(true);  // space held
  hook._prevSpaceHeld = false;              // rising edge: not held last frame
  hook.update(16);                          // triggers press detection
  ```
- Mock fish entity (CatchableFish): `{ captured: jest.fn(), updateCaptured: jest.fn(), getFightSpec: () => ({ strength: 10, escapeRate: 2.0 }) }`
- Mock inert entity (InertObject): `{ captured: jest.fn(), updateCaptured: jest.fn(), getFightSpec: () => null }`
- Key new test groups:
  - `Single-press cast (rising edge)`: hold=false → update → no transition; hold=true, prevHeld=false → update → CAST
  - `CAST auto-extend`: after transition to CAST, update without space → rope still extends
  - `CAST seabed`: set `_ropeLength` high enough that endpoint.y >= gameHeight × MAX_DEPTH_FACTOR → RETRIEVING_EMPTY
  - `CAST max distance`: `_ropeLength >= HOOK_MAX_ROPE_LENGTH` → RETRIEVING_EMPTY
  - `RETRIEVING_EMPTY reel`: rope decreases each tick; at REST → IDLE
  - `RETRIEVING_EMPTY no catch`: `isCasting()` false; setCatch not called
  - `HOOKED fish struggle`: escape progress grows each update with dt; Space press reduces it
  - `HOOKED fish escape`: escape progress ≥ max → `enemyEscaped` event dispatched, status → IDLE
  - `HOOKED fish capture`: ropeLength ≤ REST → `enemyCaptured` event, status → IDLE
  - `HOOKED inert auto-reel`: no space press needed; rope shrinks each tick; → IDLE on capture
  - `hadCatch()`: true only in HOOKED
  - `isRetrievingEmpty()`: true only in RETRIEVING_EMPTY
- Existing tests that still hold (keep with any string updates):
  - `_angle is 0 before update` ✓
  - `getPosition() projection` ✓
  - `clearCaptured() dispatches enemyCaptured event` ✓ (update mock to use HOOKED state)
  - `getCapturePhase()` and `getCaptureRawProgress()` ✓ (unchanged logic)
  - `Hook._pivot() follows bob offset` ✓

**Definition of Done:**

- [ ] All pre-existing test descriptions (adapted for new state names) still pass.
- [ ] New test groups for single-press cast, RetrievingEmpty, fish struggle, and inert auto-reel all pass.
- [ ] Verify: `npm test -- --testPathPattern=hook` passes with 0 failures.

---

## Assumptions

- `HOOK_REST_LENGTH = 60` serves as `capture_distance` — fish/object is "at the player" when rope reaches REST. Task 5 depends on this value not changing (it comes from existing constants).
- deltaTime will be non-zero in normal play; at dt=0 (first frame or paused) escape progress is 0, which is safe.
