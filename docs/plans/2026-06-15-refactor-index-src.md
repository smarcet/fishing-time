# Refactor index.js — Split into src/ (One File per Class) Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Split the monolithic `index.js` (~1200 lines, 15 classes + constants + browser bootstrap) into one file per class under a new `src/` folder, while keeping `main.html` loading without a bundler and keeping all 6 Jest test suites green with zero changes to test files.

## Out of Scope

- `Sprite` and `Animation` classes: declared in `index.js` but never used anywhere in the game — dropped per user instruction.
- No new behavior, no feature additions, no refactors inside the classes.
- No bundler, module system (ES modules), or build step.

## Approach

**Chosen:** Browser-globals pattern + CommonJS barrel in `index.js`

**Why:** The game has no bundler, so `src/` files must work as plain `<script>` tags that add their class to the browser's global scope. In Node/Jest, `index.js` becomes a thin barrel that requires each `src/` file in dependency order, injects their classes into `global` (so later-required files can reference earlier ones as globals), then re-exports everything. This costs zero changes to the 6 existing test files and zero bundle-tooling changes.

## Context for Implementer

**Dual-mode pattern (browser + Node) used in every `src/` file:**

```js
// src/Foo.js

class Foo extends Bar {          // Bar is a global in browser, set by index.js via global.Bar in Node
  // ...class body unchanged from index.js
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Foo };
}
```

In the browser: prior `<script>` tags have run; `Bar` is already in global scope. The `module.exports` block does NOT run.  
In Node: `index.js` is the entry point. It requires each file in dependency order and calls `global.Bar = Bar` BEFORE requiring any file that uses `Bar`. So when `src/Foo.js` is evaluated, `Bar` is already a global in the Node `global` object.

**`index.js` barrel pattern:**

```js
'use strict';

// 1. Inject constants into global (all src files reference them as bare names)
const _constants = require('./src/constants');
Object.assign(global, _constants);

// 2. Require each class in dependency order; inject into global after each
const { Size } = require('./src/Size');
global.Size = Size;

const { Point } = require('./src/Point');
global.Point = Point;
// ... etc.

// 3. Re-export for Jest tests (unchanged from current module.exports)
module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash, Octopus, Crab, Fish, Hook, Player };
```

**`main.html` update:** Replace the single `<script src="index.js">` with `<script>` tags for every `src/` file in the exact dependency order listed in Task 5. The `src/main.js` file (browser bootstrap) must be LAST.

**Constants file:** `src/constants.js` declares all `const` names at the top level and exports them for Node:
```js
// Declare constants
const KEY_ARROW_UP = 'ArrowUp';
// ...

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KEY_ARROW_UP, KEY_ARROW_DOWN, /* ... all names */ };
}
```

`index.js` then does `Object.assign(global, _constants)` so every subsequent `require()` sees `KEY_ARROW_UP` etc. as globals.

## Feature Inventory

All symbols from `index.js` mapped to their `src/` destination:

| Symbol | Lines (index.js) | Task | src/ destination |
|--------|-----------------|------|------------------|
| All constants (KEY_*, ANIM_*, HOOK_*, etc.) | 1–68 | Task 1 | `src/constants.js` |
| `Size` | 70–78 | Task 1 | `src/Size.js` |
| `Point` | 80–88 | Task 1 | `src/Point.js` |
| `InputHandler` | 90–105 | Task 1 | `src/InputHandler.js` |
| `GameObject` | 107–131 | Task 1 | `src/GameObject.js` |
| `Sprite` (unused) | 133–144 | Out of scope | **Dropped** |
| `Animation` (unused) | 146–160 | Out of scope | **Dropped** |
| `Enemy` | 162–212 | Task 2 | `src/Enemy.js` |
| `EnemyWithAnimation` | 214–349 | Task 2 | `src/EnemyWithAnimation.js` |
| `Trash` | 351–404 | Task 2 | `src/Trash.js` |
| `Octopus` | 406–468 | Task 2 | `src/Octopus.js` |
| `Crab` | 470–511 | Task 2 | `src/Crab.js` |
| `Fish` | 513–576 | Task 2 | `src/Fish.js` |
| `Hook` | 578–748 | Task 3 | `src/Hook.js` |
| `Player` | 750–903 | Task 3 | `src/Player.js` |
| `Bubble` | 905–924 | Task 4 | `src/Bubble.js` |
| `EnemyFactory` | 926–968 | Task 4 | `src/EnemyFactory.js` |
| `Layer` | 970–990 | Task 4 | `src/Layer.js` |
| `Game` | 992–1143 | Task 4 | `src/Game.js` |
| `window.addEventListener('load', ...)` bootstrap | 1145–1190 | Task 4 | `src/main.js` |
| `module.exports` | 1192–1194 | Task 5 | `index.js` (rewritten as barrel) |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Wrong `<script>` load order in `main.html` breaks browser (`ReferenceError: Foo is not defined`) | Medium | High | Follow the exact dependency order in Task 5's DoD; test game in browser before marking complete |
| `global.X` injection order wrong in `index.js` barrel — Node fails with `ReferenceError` | Medium | High | Barrel requires files in exact same dependency order as `<script>` tags; `npm test` is the RED/GREEN check |
| Class accidentally using a constant before it's declared (e.g. `Hook` uses `KEY_SPACE`) | Low | Medium | All constants live in `src/constants.js` and are the FIRST thing loaded; verified by `npm test` |

## Progress Tracking

- [x] Task 1: src/constants.js + Size, Point, InputHandler, GameObject
- [x] Task 2: Enemy hierarchy (Enemy, EnemyWithAnimation, Trash, Octopus, Crab, Fish)
- [x] Task 3: Hook + Player
- [x] Task 4: Bubble, EnemyFactory, Layer, Game, src/main.js
- [x] Task 5: Rewrite index.js as barrel + update main.html + browser verification

## Implementation Tasks

### Task 1: src/constants.js + primitive classes

**Objective:** Create `src/constants.js` with all game constants, and extract `Size`, `Point`, `InputHandler`, `GameObject` into their own files. These have no class-level dependencies on other custom classes, making them the safe first step. After this task, `npm test` must still pass (index.js is still intact).

**Files:**

- Create: `src/constants.js`
- Create: `src/Size.js`
- Create: `src/Point.js`
- Create: `src/InputHandler.js`
- Create: `src/GameObject.js`

**Key Decisions / Notes:**

- Copy the class body verbatim from `index.js` — no logic changes.
- `src/constants.js`: Declare all `const`s at the top level exactly as in `index.js:1-68`, then add:
  ```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KEY_ARROW_UP, KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_SPACE, AllowedKeys,
      ANIM_BOB_AMPLITUDE, ANIM_BOB_SPEED, ANIM_MAX_TILT_ANGLE, ANIM_STAGGER_SLOW,
      DRIFT_SPEED_SLOW, DRIFT_SPEED_DEFAULT, HOOK_PIVOT_X_OFFSET, HOOK_PIVOT_Y_FACTOR,
      HOOK_CAST_PIVOT_X_OFFSET, HOOK_CAST_PIVOT_Y_FACTOR, HOOK_REST_LENGTH, HOOK_MAX_SWING_ANGLE,
      HOOK_SWING_SPEED, HOOK_CAST_SPEED, HOOK_REEL_SPEED, HOOK_CATCH_REEL_SPEED, HOOK_MAX_DEPTH_FACTOR,
      WATER_SURFACE_Y, FISH_FRAME_WIDTH, FISH_FRAME_HEIGHT, FISH_MAX_FRAME_X,
      CRAB_FRAME_WIDTH, CRAB_FRAME_HEIGHT, CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, CRAB_DIE_FRAME_Y,
      CRAB_DRIFT_SPEED, CRAB_SEABED_FACTOR, PLAYER_ANIM_STAGGER, PLAYER_CATCH_MAX_FRAME_X,
      PLAYER_CATCH_MAX_FRAME_Y, PARALLAX_GAME_SPEED, CAPTURE_PHASE_RISING, CAPTURE_PHASE_THROWING,
      CAPTURE_BLINK_INTERVAL, CAPTURE_THROW_THRESHOLD, CAPTURE_THROW_ARC_Y,
      HOOK_STATUS_IDLE, HOOK_STATUS_CAST, HOOK_STATUS_CATCH,
      ENEMY_STATUS_CAPTURED, PLAYER_STATE_IDLE, PLAYER_STATE_MOVING_R, PLAYER_STATE_MOVING_L,
      PLAYER_STATE_CAST, PLAYER_STATE_REEL };
  }
  ```
- `src/Size.js`: copy `class Size` verbatim from `index.js:70-78`, add `module.exports` at the bottom.
- `src/Point.js`: copy `class Point` verbatim from `index.js:80-88`, add `module.exports` at the bottom.
- `src/InputHandler.js`: copy `class InputHandler` verbatim from `index.js:90-105`. Uses `AllowedKeys` (constant — global in browser, injected by index.js barrel in Node). Add `module.exports = { InputHandler }`.
- `src/GameObject.js`: copy `class GameObject` verbatim from `index.js:107-131`. Uses `Size`, `Point` (globals). Add `module.exports = { GameObject }`.
- Do NOT modify `index.js` yet — tests must keep passing against the original.

**Definition of Done:**

- [ ] 5 `src/` files created, each with the exact class body from `index.js` plus the dual-mode `module.exports` footer
- [ ] `src/constants.js` exports every constant name declared in `index.js:1-68`
- [ ] Verify: `npm test` — all tests still pass (index.js untouched) and 0 failures

---

### Task 2: Enemy hierarchy

**Objective:** Extract all 6 enemy-related classes from `index.js` into their own `src/` files. Each file uses globals from prior `<script>` tags (browser) or globals injected by `index.js` (Node). No logic changes.

**Files:**

- Create: `src/Enemy.js`
- Create: `src/EnemyWithAnimation.js`
- Create: `src/Trash.js`
- Create: `src/Octopus.js`
- Create: `src/Crab.js`
- Create: `src/Fish.js`

**Key Decisions / Notes:**

- Copy each class verbatim from `index.js`. Add `module.exports = { ClassName }` at the bottom of each file.
- `src/Enemy.js` uses: `GameObject` (superclass), `DRIFT_SPEED_DEFAULT`, `ENEMY_STATUS_CAPTURED`, `Point`, `Size` — all globals in browser, injected into Node `global` by the barrel.
- `src/EnemyWithAnimation.js` uses: `Enemy` (superclass), `CAPTURE_BLINK_INTERVAL`, `CAPTURE_THROW_THRESHOLD`, `CAPTURE_THROW_ARC_Y`, `ENEMY_STATUS_CAPTURED`.
- `src/Trash.js` uses: `EnemyWithAnimation` (superclass), `ANIM_STAGGER_SLOW`, `ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`, `DRIFT_SPEED_SLOW`, `ENEMY_STATUS_CAPTURED`, `Point`.
- `src/Octopus.js` uses: `EnemyWithAnimation` (superclass), `ANIM_STAGGER_SLOW`, `ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`, `ENEMY_STATUS_CAPTURED`, `Point`.
- `src/Crab.js` uses: `EnemyWithAnimation` (superclass), `ANIM_STAGGER_SLOW`, `CRAB_DRIFT_SPEED`, `ENEMY_STATUS_CAPTURED`.
- `src/Fish.js` uses: `EnemyWithAnimation` (superclass), `WATER_SURFACE_Y`, `ANIM_STAGGER_SLOW`, `ENEMY_STATUS_CAPTURED`, `Point`.
- Do NOT modify `index.js` yet.

**Definition of Done:**

- [ ] 6 `src/` files created, each with verbatim class body plus `module.exports` footer
- [ ] No logic, variable names, or constant references altered
- [ ] Verify: `npm test` — all tests still pass, 0 failures

---

### Task 3: Hook + Player

**Objective:** Extract `Hook` and `Player` from `index.js` into their own `src/` files. These are the most complex classes (170 and 155 lines respectively) and have the most global dependencies. No logic changes.

**Files:**

- Create: `src/Hook.js`
- Create: `src/Player.js`

**Key Decisions / Notes:**

- `src/Hook.js` uses: `GameObject` (superclass), `HOOK_STATUS_IDLE`, `HOOK_STATUS_CAST`, `HOOK_STATUS_CATCH`, `HOOK_REST_LENGTH`, `HOOK_CAST_SPEED`, `HOOK_REEL_SPEED`, `HOOK_CATCH_REEL_SPEED`, `HOOK_MAX_DEPTH_FACTOR`, `HOOK_MAX_SWING_ANGLE`, `HOOK_SWING_SPEED`, `HOOK_PIVOT_X_OFFSET`, `HOOK_PIVOT_Y_FACTOR`, `HOOK_CAST_PIVOT_X_OFFSET`, `HOOK_CAST_PIVOT_Y_FACTOR`, `CAPTURE_THROW_THRESHOLD`, `CAPTURE_PHASE_RISING`, `CAPTURE_PHASE_THROWING`, `KEY_SPACE`, `KEY_ARROW_LEFT`, `KEY_ARROW_RIGHT`, `PLAYER_STATE_CAST`, `Point`, `Size`.
- `src/Player.js` uses: `GameObject` (superclass), `Hook`, `HOOK_PIVOT_Y_FACTOR`, `PLAYER_STATE_IDLE`, `PLAYER_STATE_MOVING_R`, `PLAYER_STATE_MOVING_L`, `PLAYER_STATE_CAST`, `PLAYER_STATE_REEL`, `PLAYER_ANIM_STAGGER`, `PLAYER_CATCH_MAX_FRAME_X`, `PLAYER_CATCH_MAX_FRAME_Y`, `KEY_ARROW_RIGHT`, `KEY_ARROW_LEFT`, `KEY_SPACE`, `ANIM_BOB_SPEED`, `ANIM_BOB_AMPLITUDE`, `Size`, `Point`.
- Copy verbatim. Add `module.exports = { Hook }` / `module.exports = { Player }` at the bottom of each file.
- Do NOT modify `index.js` yet.

**Definition of Done:**

- [ ] `src/Hook.js` and `src/Player.js` created with verbatim class body plus `module.exports` footer
- [ ] Verify: `npm test` — all tests still pass, 0 failures

---

### Task 4: Bubble, EnemyFactory, Layer, Game, main.js

**Objective:** Extract the remaining classes and the browser bootstrap (`window.addEventListener('load', ...)`) into `src/`. After this task, all 18 `src/` files exist and `index.js` is still the working entry point.

**Files:**

- Create: `src/Bubble.js`
- Create: `src/EnemyFactory.js`
- Create: `src/Layer.js`
- Create: `src/Game.js`
- Create: `src/main.js`

**Key Decisions / Notes:**

- `src/Bubble.js` uses: `GameObject` (superclass), `Point`.
- `src/EnemyFactory.js` uses: `Octopus`, `Crab`, `Size`, `Point`, `CRAB_FRAME_HEIGHT`, `CRAB_FRAME_WIDTH`, `CRAB_MAX_FRAME_X`, `CRAB_MAX_FRAME_Y`, `CRAB_DIE_FRAME_Y`, `CRAB_SEABED_FACTOR`. Note: uses `document.getElementById()` — only runs in browser; not tested by Jest.
- `src/Layer.js` uses: `PARALLAX_GAME_SPEED`.
- `src/Game.js` uses: ALL other classes and many constants. Uses `document`, `requestAnimationFrame` — browser-only.
- `src/main.js`: Contains only the `window.addEventListener('load', ...)` block and its nested functions (`disableAntiAliasing`, `animationLoop`). This is the browser entry point. It does NOT need `module.exports` (never required in Node). Verbatim copy of `index.js:1145-1190`.
- `EnemyFactory` and `Game` and `Bubble` do NOT need `module.exports` — they are not exported by the current `index.js:1192-1194`. They are only used in the browser.
- The barrel in `index.js` does NOT require `Bubble`, `EnemyFactory`, `Layer`, or `Game` — none of the exported classes reference these at class-definition time (confirmed by grep: all references to these names inside exported classes are inside method bodies, evaluated at runtime, not at class declaration time).
- `src/main.js` is NEVER required by `index.js` barrel — it is browser-only. The outer `typeof window !== undefined` guard in the original `index.js:1145` contains a known pre-existing bug (comparing the string `'undefined'` to the primitive `undefined` — always truthy) but is harmless because the body fails safely at runtime. Copy verbatim and do NOT fix the guard — out of scope.

**Definition of Done:**

- [ ] 5 `src/` files created; `src/main.js` contains the browser bootstrap block verbatim
- [ ] `EnemyFactory`, `Game`, `Bubble`, `Layer` have NO `module.exports` (not in the current export list); barrel does not require them
- [ ] Verify: `npm test` — all tests still pass, 0 failures

---

### Task 5: Rewrite index.js as barrel + update main.html + browser verification

**Objective:** Replace `index.js` with a CommonJS barrel that requires all `src/` files in dependency order (injecting each class into `global` before the next require) and re-exports the original module.exports. Update `main.html` to remove `<script src="index.js">` and add `<script>` tags for all `src/` files in dependency order. Verify the game still runs in the browser.

**Files:**

- Modify: `index.js`
- Modify: `main.html`

**Key Decisions / Notes:**

- **New `index.js` content** — exact require/global injection order:
  ```js
  'use strict';

  if (typeof module !== 'undefined' && module.exports) {
    const _c = require('./src/constants');
    Object.assign(global, _c);

    const { Size }               = require('./src/Size');               global.Size               = Size;
    const { Point }              = require('./src/Point');              global.Point              = Point;
    const { GameObject }         = require('./src/GameObject');         global.GameObject         = GameObject;
    const { InputHandler }       = require('./src/InputHandler');       global.InputHandler       = InputHandler;
    const { Enemy }              = require('./src/Enemy');              global.Enemy              = Enemy;
    const { EnemyWithAnimation } = require('./src/EnemyWithAnimation'); global.EnemyWithAnimation = EnemyWithAnimation;
    const { Trash }              = require('./src/Trash');              global.Trash              = Trash;
    const { Octopus }            = require('./src/Octopus');            global.Octopus            = Octopus;
    const { Crab }               = require('./src/Crab');               global.Crab               = Crab;
    const { Fish }               = require('./src/Fish');               global.Fish               = Fish;
    const { Hook }               = require('./src/Hook');               global.Hook               = Hook;
    const { Player }             = require('./src/Player');             global.Player             = Player;

    module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash, Octopus, Crab, Fish, Hook, Player };
  }
  ```
  The `if (typeof module !== 'undefined')` guard ensures that if `index.js` is ever accidentally loaded as a `<script>` tag in the browser, it does nothing (not that it should be — `main.html` no longer references it).

- **New `main.html` `<script>` tags** (replace `<script src="index.js"></script>` with, in this exact order):
  ```html
  <script src="src/constants.js"></script>
  <script src="src/Size.js"></script>
  <script src="src/Point.js"></script>
  <script src="src/GameObject.js"></script>
  <script src="src/InputHandler.js"></script>
  <script src="src/Enemy.js"></script>
  <script src="src/EnemyWithAnimation.js"></script>
  <script src="src/Trash.js"></script>
  <script src="src/Octopus.js"></script>
  <script src="src/Crab.js"></script>
  <script src="src/Fish.js"></script>
  <script src="src/Hook.js"></script>
  <script src="src/Player.js"></script>
  <script src="src/Bubble.js"></script>
  <script src="src/EnemyFactory.js"></script>
  <script src="src/Layer.js"></script>
  <script src="src/Game.js"></script>
  <script src="src/main.js"></script>
  ```
  Position: immediately before the `<canvas>` element (in `<head>` where the old `<script src="index.js">` was, or at the same position).
- The barrel intentionally does NOT re-export constants — all 6 existing test files declare the constants they need locally. Do NOT add constants to `module.exports`.
- Before running `npm test`, cross-check the barrel's `module.exports` against each test file's destructuring: `player.test.js` needs `{Size, Point, Player}`; `hook.test.js` needs `{Size, Point, Hook}`; `octopus.test.js` needs `{Size, Point, EnemyWithAnimation, Octopus}`; `fish.test.js` needs `{Size, Point, EnemyWithAnimation, Fish}`; `crab.test.js` needs `{Size, Point, EnemyWithAnimation, Crab}`; `trash.test.js` needs `{Size, Point, EnemyWithAnimation, Trash}`.

**Definition of Done:**

- [ ] `index.js` is rewritten as the barrel shown above (no class declarations remain in it)
- [ ] `main.html` replaces `<script src="index.js">` with the 18 `<script src="src/...">` tags in the exact order above
- [ ] Confirmed `module.exports` includes exactly: `Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash, Octopus, Crab, Fish, Hook, Player` — cross-referenced against all 6 `__tests__/*.test.js` require() calls
- [ ] Verify: `npm test` — all 6 test suites (79 tests) pass, 0 failures
- [ ] Browser verification using browser automation (tier 1: Claude Code Chrome, fallback: playwright-cli): navigate to `http://localhost:8000/main.html`, confirm zero `ReferenceError`/`TypeError`/404s in console, fish/crab/octopus visible and moving, hook catches work. `curl` or source-file reading are NOT acceptable substitutes.

## E2E Test Scenarios

### TS-001: Game loads with src/ split — no console errors
**Priority:** Critical
**Preconditions:** `python3 -m http.server 8000` running at project root
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Page loads, canvas visible, no JS console errors |
| 2 | Open DevTools Console | Zero `ReferenceError`, zero `TypeError`, zero 404 errors for src files |
| 3 | Wait 3 seconds | Fish, octopus, and crab visible and moving |
| 4 | Press arrow keys to move boat | Boat moves left and right smoothly |
| 5 | Hold Space to cast hook | Hook descends, can catch enemies; catch animation plays |

## Open Questions

None — all design decisions resolved.
