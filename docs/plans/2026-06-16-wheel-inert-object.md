# Wheel Inert Object Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add `Wheel` as a new `InertObject` subclass that floats at the water surface, penalises the player −5 points on capture, uses `wheel.png` copied as-is as a single-frame spritesheet, and randomises the initial x position for all InertObjects (Bottle, Apple, Wheel).

## Approach

**Chosen:** Mirror `RedApple` pattern — single-frame spritesheet, bob-and-tilt motion, water-surface spawn — and add random x initialisation to `EnemyFactory` for all three inert types.
**Why:** `RedApple` already solved the single-PNG-as-spritesheet problem; reusing the pattern avoids new abstractions. Random x is a one-liner change in the two existing factory branches plus the new Wheel branch.

## Context for Implementer

- The score key in `SCORE_MAP` must be the **class name** (`'Wheel'`), not the enemy-type constant, because `EVENT_ENEMY_CAPTURED` sets `e.detail.enemyType = constructor.name`.
- `main.html` `<img>` tags are the sole image-loading mechanism — no `new Image()`.
- Script load order in `main.html` must be: constants → ... → InertObject → Wheel → EnemyFactory.
- The ADR number follows the latest existing file: `0021`.

## Progress Tracking

- [x] Task 1: Copy wheel spritesheet asset
- [x] Task 2: Create `src/Wheel.js`
- [x] Task 3: Register enemy type constant and score
- [x] Task 4: Wire EnemyFactory + random x spawn for all InertObjects
- [x] Task 5: Wire main.html, main.css, Game.js, index.js
- [x] Task 6: Unit tests
- [x] Task 7: Write ADR 0021

## Implementation Tasks

---

### Task 1: Copy wheel spritesheet asset

**Objective:** Copy `wheel.png` (840×764 RGBA) to `images/items/wheel_sprite.png`. Because the asset is a single pose with no animation frames, it is used as a 1-frame strip — no compositing or padding needed, identical to the `red_apple_sprite.png` approach.

**Files:**

- Create: `images/items/wheel_sprite.png` (copy of the source asset)

**Key Decisions / Notes:**

- Source: `/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/wheel.png`
- Copy command: `cp <source> images/items/wheel_sprite.png`
- Display size target: **84×76 px** (840÷10 × 764÷10) — a 10× downscale keeps it proportional and similar in size to the bottle (76×92).

**Definition of Done:**

- [ ] `images/items/wheel_sprite.png` exists in the repo.
- [ ] Verify: `file images/items/wheel_sprite.png` returns `PNG image data`.

---

### Task 2: Create `src/Wheel.js`

**Objective:** Implement the `Wheel` class extending `InertObject`. It mirrors `RedApple` exactly: bob-and-tilt animation, same motion constants, single-frame draw, captured-sprite method drawing the full image.

**Files:**

- Create: `src/Wheel.js`

**Key Decisions / Notes:**

- Pattern to follow: `src/RedApple.js` lines 1–53 (verbatim copy with class name substitution).
- `_drawCapturedSprite`: use `drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight, dx, dy, w, h)` — same as `RedApple`.
- `draw()`: `drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight, -w/2, -h/2, w, h)` — full image, centred at translated origin.
- CommonJS guard at bottom: `if (typeof module !== 'undefined' && module.exports) { module.exports = { Wheel }; }`

**Definition of Done:**

- [ ] `src/Wheel.js` exists; `new Wheel(mockGame, mockCtx, ...)` constructs without error in Jest.
- [ ] `getFightSpec()` returns `null`.
- [ ] Verify: `npm test -- --testPathPattern=wheel` passes (after Task 6).

---

### Task 3: Register enemy type constant and score

**Objective:** Add `ENEMY_TYPE_WHEEL = 'wheel'` to `src/constants.js` and `Wheel: -5` to `SCORE_MAP` in `src/ScoreSystem.js`.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- In `constants.js`, add after `ENEMY_TYPE_JELLY_FISH` (line 147): `const ENEMY_TYPE_WHEEL = 'wheel';`
- Export it in the module.exports block (line ~179 area).
- In `ScoreSystem.js`, add `Wheel: -5,` after the `RedApple` entry in `SCORE_MAP` (line 15 area).

**Definition of Done:**

- [ ] `ENEMY_TYPE_WHEEL` is exported from `constants.js` and reachable via `require('../index.js')`.
- [ ] `SCORE_MAP.Wheel === -5` in Jest.
- [ ] Verify: `npm test -- --testPathPattern=score-system` passes.

---

### Task 4: Wire EnemyFactory + random x spawn for all InertObjects

**Objective:** Add the `Wheel` spec to `EnemyFactory` and update the `createEnemy` branch. Additionally, randomise the initial x position for `DiscardedBottle`, `RedApple`, and the new `Wheel` — replacing the hard-coded `x=0` in their factory branches.

**Files:**

- Modify: `src/EnemyFactory.js`

**Key Decisions / Notes:**

- Add at the top of `EnemyFactory.js`:
  ```js
  const DOM_ID_WHEEL        = 'wheel_sprite';
  const WHEEL_DISPLAY_H     = 76;   // height (first arg to Size)
  const WHEEL_DISPLAY_W     = 84;   // width  (second arg to Size)
  const WHEEL_MAX_FRAMES    = 1;
  ```
- CAUTION: `Size(h, w)` is **height-first**. `WHEEL_DISPLAY_H=76` (height), `WHEEL_DISPLAY_W=84` (width). `new Size(76, 84)` is correct. Transposing to `new Size(84, 76)` would make `getWidth()` return 76 and break the random-x bounds.
- Add spec in constructor after the `RED_APPLE` entry:
  ```js
  this.specs[ENEMY_TYPE_WHEEL] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_WHEEL) : null,
    size: new Size(WHEEL_DISPLAY_H, WHEEL_DISPLAY_W),  // Size(h, w) — height first
    maxFrames: WHEEL_MAX_FRAMES,
  };
  ```
- Random x helper (inline, no new function): `Math.max(0, Math.random() * (game.getSize().getWidth() - spec.size.getWidth()))`. The `Math.max(0, ...)` guard prevents negative x if the canvas is narrower than the sprite. Apply to all three inert-object `createEnemy` branches:
  - `ENEMY_TYPE_DISCARDED_BOTTLE`: change `new Point(0, WATER_SURFACE_Y)` → `new Point(Math.max(0, Math.random() * (game.getSize().getWidth() - spec.size.getWidth())), WATER_SURFACE_Y)`
  - `ENEMY_TYPE_RED_APPLE`: same change.
  - `ENEMY_TYPE_WHEEL` (new branch): use same guarded formula, add branch before `ENEMY_TYPE_CRAB`.
- New factory branch:
  ```js
  if (name === ENEMY_TYPE_WHEEL) {
    return new Wheel(
      game, ctx, spec.size,
      new Point(Math.max(0, Math.random() * (game.getSize().getWidth() - spec.size.getWidth())), WATER_SURFACE_Y),
      spec.image, spec.maxFrames
    );
  }
  ```

**Definition of Done:**

- [ ] `EnemyFactory` creates a `Wheel` instance without error when called with `ENEMY_TYPE_WHEEL`.
- [ ] `DiscardedBottle` and `RedApple` no longer hard-code `x=0` in the factory.
- [ ] Verify: existing `discardedBottle.test.js` and `redApple.test.js` still pass (they construct directly, not via factory).

---

### Task 5: Wire main.html, main.css, Game.js, index.js

**Objective:** Connect all integration points — HTML `<img>` tag, CSS hide rule, enemy spawn in `Game`, and CommonJS wiring in `index.js`.

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `src/Game.js`
- Modify: `index.js`

**Key Decisions / Notes:**

- **main.html** img tag: Add `<img src="images/items/wheel_sprite.png" id="wheel_sprite"/>` after the line containing `id="red_apple_sprite"`. Also add `<script src="src/Wheel.js"></script>` after the line containing `src/RedApple.js` (and before `EnemyFactory.js`).
- **main.css**: Edit the **existing** multi-selector `display: none` block (the long comma-separated selector on lines 20–23) — do NOT create a new rule. Add `, #wheel_sprite` after `#red_apple_sprite` within that selector.
- **src/Game.js**: Add `this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_WHEEL, this, ctx));` after the line containing `ENEMY_TYPE_RED_APPLE`.
- **index.js**: Add `const { Wheel } = require('./src/Wheel'); global.Wheel = Wheel;` after the line containing `require('./src/RedApple')`. Add `Wheel` to the `module.exports` object.

**Definition of Done:**

- [ ] `require('../index.js').Wheel` is a constructor in Jest.
- [ ] CSS: `grep -q 'wheel_sprite' main.css && echo OK` exits 0.
- [ ] Script load order: `grep -n '<script' main.html` shows `Wheel.js` after `RedApple.js` and before `EnemyFactory.js`.
- [ ] Verify: `npm test` full suite passes with 0 failures.

---

### Task 6: Unit tests

**Objective:** Add `__tests__/wheel.test.js` covering class hierarchy, bob animation, slow drift, and negative score. Update `__tests__/score-system.test.js` to assert `SCORE_MAP.Wheel === -5`.

**Files:**

- Create: `__tests__/wheel.test.js`
- Modify: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- Follow `__tests__/redApple.test.js` exactly — same three `describe` blocks, same assertions, substituting `Wheel` and `new Size(76, 84)` (height=76, width=84 — height first, matching `Size(h, w)`).
- Before writing the drift assertion, read `src/RedApple.js` and confirm the actual `_driftSpeed` constant used — do not assume 0.6 px/tick from memory.
- `EnemyFactory` is not exported from `index.js` — factory integration test must `require('src/EnemyFactory')` directly:
  ```js
  // in wheel.test.js or a dedicated factory block:
  const { EnemyFactory } = require('../src/EnemyFactory');
  // construct with mockGame providing getSize() → Size(600, 800)
  const factory = new EnemyFactory();
  const wheel = factory.createEnemy(ENEMY_TYPE_WHEEL, mockGame, mockCtx);
  expect(wheel instanceof Wheel).toBe(true);
  ```
- In `score-system.test.js`, add after the `RedApple` test:
  ```js
  test('Wheel is worth -5 points', () => {
    expect(SCORE_MAP.Wheel).toBe(-5);
  });
  ```
- Add `'Wheel'` to the `keys` array in the "SCORE_MAP contains all registered enemy types" test if one exists.

**Definition of Done:**

- [ ] `__tests__/wheel.test.js` contains tests for: `instanceof InertObject`, `getFightSpec() === null`, bob offset before/after update, drift rate matching source constant, factory creates `instanceof Wheel`.
- [ ] `score-system.test.js` asserts `SCORE_MAP.Wheel === -5`.
- [ ] Verify: `npm test` — 0 failures, new wheel tests listed as passing.

---

### Task 7: Write ADR 0021

**Objective:** Document the design decisions for the Wheel inert object: hierarchy choice, single-frame spritesheet approach, score value, and the random x spawn change applied to all InertObjects.

**Files:**

- Create: `docs/adr/0021-wheel-inert-object.md`

**Key Decisions / Notes:**

- Format follows `docs/adr/0019-red-apple-inert-object.md`.
- Sections: Context, Decisions (4 items: extends InertObject, single-frame spritesheet, score -5, random x spawn), Consequences.
- The random x spawn decision should explain why all three inert types were updated together (consistency — they share the same surface-float behaviour).

**Definition of Done:**

- [ ] `docs/adr/0021-wheel-inert-object.md` exists with all four decisions documented.
- [ ] Verify: `ls docs/adr/0021-wheel-inert-object.md` exits 0.
