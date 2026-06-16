# RedApple Inert Object Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add `RedApple` as a new inert floating object that extends `InertObject`, spawns at the water surface, scores −5 on capture, uses a single-frame spritesheet derived from `red_apple.png`, and is fully documented with an ADR.

## Approach

**Chosen:** Mirror `DiscardedBottle` — same constructor signature, same bob-and-tilt draw loop, 1-frame spritesheet copied from the source PNG.
**Why:** `DiscardedBottle` is the only `InertObject` precedent; it already handles single-image sprites (`maxFrames`, horizontal strip, bob+tilt draw). Reusing its full signature keeps `EnemyFactory` consistent and requires zero new abstractions. Cost: the apple gets bottle-like bobbing behaviour by default, which is intentional (it floats).

## Context for Implementer

`InertObject` extends `EnemyWithAnimation` and overrides `getFightSpec()` → `null`, which tells the hook that capturing this entity requires no power-bar fight. `DiscardedBottle` is the only existing `InertObject` subclass and is the exact template to follow. The sprite image **must** be declared as a hidden `<img>` in `main.html` before the `<script>` tags — the game never uses `new Image()`.

## Progress Tracking

- [x] Task 1: Copy spritesheet asset
- [x] Task 2: Add ENEMY_TYPE_RED_APPLE constant and display size constants
- [x] Task 3: Add RedApple score entry to SCORE_MAP
- [x] Task 4: Create src/RedApple.js
- [x] Task 5: Register in EnemyFactory
- [x] Task 6: Wire up in index.js
- [x] Task 7: Wire up in main.html (img tag + script tag)
- [x] Task 8: Add sprite id to display:none in main.css
- [x] Task 9: Write ADR 0019

## Implementation Tasks

---

### Task 1: Copy spritesheet asset

**Objective:** Place the source PNG into the game's asset tree as a 1-frame spritesheet. The apple has a single static pose (118×204 px), so the "spritesheet" is the original image with `maxFrames = 1`. No compositing or tiling needed.

**Files:**

- Create: `images/items/red_apple_sprite.png` (copy from source)

**Key Decisions / Notes:**

- Source: `/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/red_apple.png` (118×204 px, RGBA)
- Destination: `images/items/red_apple_sprite.png` — matches the `images/items/` convention used by other sprites (`__fisherman_in_boat_idle.png`, etc.)
- `Trivial:` ≤1 shell command, no production code change, no new branch/loop; covered by visual verification in Task 8.

**Definition of Done:**

- [ ] `images/items/red_apple_sprite.png` exists and is 118×204 px
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/items/red_apple_sprite.png'); print(img.size)"` prints `(118, 204)`

---

### Task 2: Add constants to src/constants.js and src/EnemyFactory.js

**Objective:** Declare `ENEMY_TYPE_RED_APPLE` (the string key) in `src/constants.js` alongside the existing `ENEMY_TYPE_*` constants, and declare the display-size constants (`RED_APPLE_DISPLAY_W`, `RED_APPLE_DISPLAY_H`, `RED_APPLE_MAX_FRAMES`) in `src/EnemyFactory.js` alongside the equivalent bottle constants — matching the actual convention in the codebase.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/EnemyFactory.js` (size constants only — factory spec/branch added in Task 5)

**Key Decisions / Notes:**

- `ENEMY_TYPE_RED_APPLE = 'red_apple'` → `src/constants.js:139` (after `ENEMY_TYPE_SHARK`), exported in its `module.exports` block.
- `RED_APPLE_DISPLAY_W = 118`, `RED_APPLE_DISPLAY_H = 204`, `RED_APPLE_MAX_FRAMES = 1` → `src/EnemyFactory.js` near lines 19–21 alongside `BOTTLE_DISPLAY_H/W/BOTTLE_MAX_FRAMES`. These are file-local constants and do NOT go in `src/constants.js` — `BOTTLE_DISPLAY_H/W` are also in `EnemyFactory.js`, not in `constants.js`.

**Definition of Done:**

- [ ] `grep 'ENEMY_TYPE_RED_APPLE' src/constants.js` returns the new constant
- [ ] `grep 'RED_APPLE_DISPLAY\|RED_APPLE_MAX_FRAMES' src/EnemyFactory.js` returns the three size constants
- [ ] Verify: `npm test` passes

---

### Task 3: Add RedApple entry to SCORE_MAP

**Objective:** Insert `RedApple: -5` into `SCORE_MAP` in `src/ScoreSystem.js`. The key must match the class name exactly because `EVENT_ENEMY_CAPTURED` dispatches `e.detail.enemyType` as the constructor name.

**Files:**

- Modify: `src/ScoreSystem.js`
- Modify: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- Existing negative entry for reference: `DiscardedBottle: -5` (line ~8) — `RedApple` follows the same pattern and value.
- The score lookup key is `e.detail.enemyType` which equals the class name string (`'RedApple'`), NOT the `ENEMY_TYPE_*` constant — see `ScoreSystem.js:_handleCapture`.
- Add one assertion to the existing `score-system.test.js` near the `DiscardedBottle is worth -5 points` test (line 10): `test('RedApple is worth -5 points', () => { expect(SCORE_MAP.RedApple).toBe(-5); });`

**Definition of Done:**

- [ ] `grep 'RedApple' src/ScoreSystem.js` shows `RedApple: -5` in `SCORE_MAP`
- [ ] `grep 'RedApple' __tests__/score-system.test.js` shows the new assertion
- [ ] Verify: `npm test` passes

---

### Task 4: Create src/RedApple.js

**Objective:** Implement `RedApple extends InertObject` following the `DiscardedBottle` pattern exactly — same constructor signature, same bob-and-tilt animation, same `draw()` and `_drawCapturedSprite()` overrides.

**Files:**

- Create: `src/RedApple.js`

**Key Decisions / Notes:**

- Constructor: `constructor(game, ctx, size, position, image, maxFrames)` — identical to `DiscardedBottle` (see `DiscardedBottle.js:3`).
- Copy the full body of `DiscardedBottle` verbatim, then rename the class and update the `module.exports` line.
- The bobbing physics (`_bobPhase`, `_bobOffset`, `_angle`) and the `update()` / `getPosition()` / `draw()` / `_drawCapturedSprite()` methods are identical — an apple bobs in water just like a bottle.
- No new constants needed beyond those added in Task 2 (the constructor delegates to the parent which uses the passed-in `size` and `maxFrames`).

**Definition of Done:**

- [ ] `src/RedApple.js` exists and exports `{ RedApple }`
- [ ] Verify: `npm test` passes (the test harness bootstraps index.js globals; a direct `require('./src/RedApple.js')` would fail because `InertObject` and animation constants are not loaded without the bootstrap)

---

### Task 5: Register RedApple in EnemyFactory

**Objective:** Add the `ENEMY_TYPE_RED_APPLE` spec entry to `EnemyFactory.specs` in the constructor and add a `createEnemy` branch that instantiates `RedApple` at the water surface (`y = WATER_SURFACE_Y`), exactly as `DiscardedBottle` does.

**Files:**

- Modify: `src/EnemyFactory.js`

**Key Decisions / Notes:**

- Spec entry (in constructor after `ENEMY_TYPE_DISCARDED_BOTTLE` block, lines 67–71 of `EnemyFactory.js`):
  ```js
  this.specs[ENEMY_TYPE_RED_APPLE] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_RED_APPLE) : null,
    size: new Size(RED_APPLE_DISPLAY_H, RED_APPLE_DISPLAY_W),
    maxFrames: RED_APPLE_MAX_FRAMES,
  };
  ```
- Add `const DOM_ID_RED_APPLE = 'red_apple_sprite';` at the top of the file alongside the other DOM ID constants (lines 1–10).
- `createEnemy` branch (after the `ENEMY_TYPE_DISCARDED_BOTTLE` branch, line 159–165):
  ```js
  if (name === ENEMY_TYPE_RED_APPLE) {
    return new RedApple(
      game, ctx, spec.size,
      new Point(0, WATER_SURFACE_Y),
      spec.image, spec.maxFrames
    );
  }
  ```
- Spawn at `(0, WATER_SURFACE_Y)` — same as the bottle; the drift moves it across the canvas from the left edge.

**Definition of Done:**

- [ ] `grep 'RED_APPLE\|red_apple' src/EnemyFactory.js` returns the DOM ID constant, the spec entry, and the factory branch
- [ ] Verify: `npm test` passes

---

### Task 6: Wire up in index.js

**Objective:** Add the `require` + `global` line for `RedApple` in `index.js` so the class is available at browser runtime via the global scope and also loadable by Jest.

**Files:**

- Modify: `index.js`

**Key Decisions / Notes:**

- Pattern (from `index.js:13`): `const { DiscardedBottle } = require('./src/DiscardedBottle'); global.DiscardedBottle = DiscardedBottle;`
- Insert after the `DiscardedBottle` line: `const { RedApple } = require('./src/RedApple'); global.RedApple = RedApple;`
- Add `RedApple` to the `module.exports` spread at `index.js:30`.

**Definition of Done:**

- [ ] `grep 'RedApple' index.js` shows the require line and the export
- [ ] Verify: `npm test` passes

---

### Task 7: Wire up in main.html

**Objective:** Add the hidden `<img>` tag for the sprite and the `<script>` tag for `RedApple.js` to `main.html`, in the correct order relative to existing entries.

**Files:**

- Modify: `main.html`

**Key Decisions / Notes:**

- `<img>` tag (after the `bottle_1_sprite` img, around line 52 of `main.html`):
  ```html
  <img src="images/items/red_apple_sprite.png" id="red_apple_sprite"/>
  ```
- `<script>` tag: after `<script src="src/DiscardedBottle.js"></script>` (line 20 of `main.html`):
  ```html
  <script src="src/RedApple.js"></script>
  ```
- `Trivial:` 2 one-line HTML additions; no new branch/loop; covered by browser verification in Task 8 spec.

**Definition of Done:**

- [ ] `grep 'red_apple' main.html` shows both the `<img>` and `<script>` lines
- [ ] Verify: Open `http://localhost:8000/main.html` and confirm no JS console errors on load

---

### Task 8: Add sprite id to display:none list in main.css

**Objective:** Add `#red_apple_sprite` to the selector block in `main.css` that sets `display: none` for all sprite images, so the hidden `<img>` tag is not rendered as a visible DOM image.

**Files:**

- Modify: `main.css`

**Key Decisions / Notes:**

- Existing selector (lines 20–23 of `main.css`): `#fish1, #fish2, ..., #shark_sprite { display: none; }` — append `#red_apple_sprite` to the end of the selector list.
- `Trivial:` 1 token appended to a CSS selector; no new rule.

**Definition of Done:**

- [ ] `grep 'red_apple_sprite' main.css` returns the line with `display: none`
- [ ] Verify: `npm test` passes; browser shows no stray apple image on the page

---

### Task 9: Write ADR 0019

**Objective:** Document the design decision to add `RedApple` as a negative-score inert object, including the score value rationale, the spritesheet approach for a single-frame asset, and the `InertObject` extension pattern.

**Files:**

- Create: `docs/adr/0019-red-apple-inert-object.md`

**Key Decisions / Notes:**

- Format: follow `docs/adr/0001-bottle-animation-and-test-harness.md` — Date, Status, Context, Decision, Consequences.
- Cover: why −5 score (same penalty as `DiscardedBottle`, representing undesirable ocean litter), single-frame spritesheet rationale (no animation frames in source asset), `InertObject` extension over a raw `EnemyWithAnimation` (inherits `getFightSpec() → null` preventing power-bar fight).
- `Trivial:` documentation only, no production code; no tests needed.

**Definition of Done:**

- [ ] `docs/adr/0019-red-apple-inert-object.md` exists with Date, Status, Context, Decision, Consequences sections
- [ ] Verify: `ls docs/adr/0019-red-apple-inert-object.md` exits 0

---

## Goal Verification

### Truths

1. Capturing a `RedApple` during gameplay subtracts 5 points from the score and displays a `−5` floating animation at the capture position.
2. A `RedApple` instance spawns at the water surface (`y = WATER_SURFACE_Y`), bobs vertically, and drifts across the canvas exactly as `DiscardedBottle` does.
