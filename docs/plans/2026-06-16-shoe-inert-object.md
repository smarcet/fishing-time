# Shoe Inert Object Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `Shoe` inert object (score=-5) extending `InertObject`, sourced from a single PNG (`shoe.png`), with bob/tilt/drift animation, random X spawn at `WATER_SURFACE_Y`, wired into EnemyFactory, Game.js, main.html, main.css, ScoreSystem, and an ADR.

## Approach

**Chosen:** Mirror the `Wheel`/`RedApple` single-frame inert object pattern exactly — copy the PNG as the sprite, `maxFrames: 1`, draw using `image.naturalWidth`/`naturalHeight` for source dimensions.
**Why:** `Wheel` and `RedApple` already handle single-PNG sprites with this shape; Shoe is structurally identical (one static image, bob+tilt+drift). Using the same pattern keeps the codebase consistent and eliminates the need for any spritesheet assembly script.

## Context for Implementer

- `Size(h, w)` — height is the FIRST argument throughout (all display sizes use this convention).
- `SCORE_MAP` in `src/ScoreSystem.js` is keyed by `constructor.name`; the key must be exactly `'Shoe'`.
- `DOM_ID_SHOE` and display constants (`SHOE_DISPLAY_H/W`, `SHOE_MAX_FRAMES`) live in `EnemyFactory.js`, NOT `constants.js` — this matches the `DOM_ID_WHEEL`, `WHEEL_DISPLAY_H/W` local-const pattern.
- `ENEMY_TYPE_SHOE = 'shoe'` lives in `constants.js` (same block as other `ENEMY_TYPE_*` constants) — the factory spec array is keyed on this string.
- Source shoe.png: 590×388 px RGBA. Display size: `SHOE_DISPLAY_H = 55`, `SHOE_DISPLAY_W = 84` (aspect ratio 84/55 ≈ 1.53, close to the natural 590/388 ≈ 1.52).
- Bob/tilt/drift constants (`ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`, `DRIFT_SPEED_SLOW`) are already defined globally — do NOT redefine them.
- `Shoe.draw()` pattern matches `Wheel.draw()` and `RedApple.draw()` exactly (use `this._image.naturalWidth`, `this._image.naturalHeight` as source dimensions).
- `Shoe._drawCapturedSprite()` pattern matches `Wheel._drawCapturedSprite()` and `RedApple._drawCapturedSprite()` exactly.

## Progress Tracking

- [x] Task 1: Copy sprite asset
- [x] Task 2: Add constants and ScoreSystem entry
- [x] Task 3: Create Shoe class (TDD)
- [x] Task 4: Wire into EnemyFactory
- [x] Task 5: Update main.html, main.css, index.js, and seed in Game.js
- [x] Task 6: Write ADR 0023

## Implementation Tasks

---

### Task 1: Copy sprite asset

**Objective:** Copy `shoe.png` from the downloads directory to `images/items/shoe_sprite.png` in the repo. This single PNG (590×388 px RGBA) is the complete sprite — no assembly needed.

**Files:**

- Create: `images/items/shoe_sprite.png`

**Key Decisions / Notes:**

- Source: `/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/shoe.png`
- Verify source exists first: `test -f "/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/shoe.png" && echo EXISTS`
- Copy with: `cp "/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/shoe.png" images/items/shoe_sprite.png`
- `Trivial:` ≤ 5 lines, no production code, no branches — verified by the Verify command below.

**Definition of Done:**

- [ ] `images/items/shoe_sprite.png` exists in the repo.
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/items/shoe_sprite.png'); assert img.size==(590,388); print('OK')"`

---

### Task 2: Add constants and ScoreSystem entry

**Objective:** Add `ENEMY_TYPE_SHOE = 'shoe'` to `src/constants.js` (in the `ENEMY_TYPE_*` block) and `Shoe: -5` to `SCORE_MAP` in `src/ScoreSystem.js`.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- Add `ENEMY_TYPE_SHOE = 'shoe'` after `ENEMY_TYPE_WHEEL = 'wheel'` (line ~155 of constants.js).
- Export `ENEMY_TYPE_SHOE` in the existing `module.exports` block at the bottom of constants.js.
- Add `Shoe: -5,` to `SCORE_MAP` after `Wheel: -5` in ScoreSystem.js (key = `constructor.name`).
- `Trivial:` ≤ 5 net new lines, no new branch/loop/try, no new public symbol; covered by `node -e "const c=require('./src/constants.js'); console.log(c.ENEMY_TYPE_SHOE)"` and `node -e "const {SCORE_MAP}=require('./src/ScoreSystem.js'); console.log(SCORE_MAP['Shoe'])"`.

**Definition of Done:**

- [ ] `ENEMY_TYPE_SHOE === 'shoe'` exported from constants.js.
- [ ] `SCORE_MAP['Shoe'] === -5` in ScoreSystem.js.
- [ ] Verify: `node -e "const c=require('./src/constants.js'); console.log(c.ENEMY_TYPE_SHOE)" && node -e "const {SCORE_MAP}=require('./src/ScoreSystem.js'); console.log(SCORE_MAP['Shoe'])"`

---

### Task 3: Create Shoe class (TDD)

**Objective:** Implement `src/Shoe.js` extending `InertObject`, with bob/tilt/drift animation identical to `Wheel` and `RedApple`. Write `__tests__/shoe.test.js` first (RED), then implement (GREEN).

**Files:**

- Create: `src/Shoe.js`
- Test: `__tests__/shoe.test.js`

**Key Decisions / Notes:**

- Copy `src/Wheel.js` structure exactly — constructor, `update()`, `getPosition()`, `_drawCapturedSprite()`, `draw()` are identical in behavior.
- `draw()` uses `this._image.naturalWidth`, `this._image.naturalHeight` as source dimensions (not a stride formula) — matches `RedApple.draw()` and `Wheel.draw()` at `src/Wheel.js:29`.
- `_drawCapturedSprite(dx, dy, w, h)` uses `this._image.naturalWidth`, `this._image.naturalHeight` — matches `src/Wheel.js:28`.
- Module export tail: `if (typeof module !== 'undefined' && module.exports) { module.exports = { Shoe }; }`
- Test mirrors `__tests__/wheel.test.js`: hierarchy (instanceof InertObject, getFightSpec null), bob animation (offset=0 before update, getPosition().getY() after 1 update), slow drift (0.6 px/tick). Display size in test: `new Size(55, 84)`.
- No `'use strict'` — no other InertObject subclass uses it.

**Definition of Done:**

- [ ] `src/Shoe.js` exists, exports `Shoe`.
- [ ] `new Shoe(...) instanceof InertObject` is true.
- [ ] `getFightSpec()` returns `null`.
- [ ] `_bobOffset === 0` before first `update()`; `getPosition().getY()` reflects bob after one tick.
- [ ] Drifts at 0.6 px/tick (inherits `DRIFT_SPEED_SLOW`).
- [ ] Verify: `npm test -- --testPathPattern=shoe --silent`

---

### Task 4: Wire into EnemyFactory

**Objective:** Register Shoe in `src/EnemyFactory.js`: add local `DOM_ID_SHOE`, `SHOE_DISPLAY_H/W`, `SHOE_MAX_FRAMES` constants; add spec array entry; add `createEnemy` branch.

**Files:**

- Modify: `src/EnemyFactory.js`

**Key Decisions / Notes:**

- Add immediately after `const WHEEL_MAX_FRAMES = 1;` (the last Wheel constant in EnemyFactory.js):
  ```js
  const DOM_ID_SHOE     = 'shoe_sprite';
  const SHOE_DISPLAY_H  = 55;   // height (first arg to Size)
  const SHOE_DISPLAY_W  = 84;   // width  (second arg to Size)
  const SHOE_MAX_FRAMES = 1;
  ```
- Add spec entry in constructor after `this.specs[ENEMY_TYPE_WHEEL]`:
  ```js
  this.specs[ENEMY_TYPE_SHOE] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_SHOE) : null,
    size: new Size(SHOE_DISPLAY_H, SHOE_DISPLAY_W),
    maxFrames: SHOE_MAX_FRAMES,
  };
  ```
- Add `createEnemy` branch after the `ENEMY_TYPE_WHEEL` branch (around line 225):
  ```js
  if (name === ENEMY_TYPE_SHOE) {
    return new Shoe(
      game, ctx, spec.size,
      new Point(
        Enemy.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        WATER_SURFACE_Y
      ),
      spec.image, spec.maxFrames
    );
  }
  ```

**Definition of Done:**

- [ ] `EnemyFactory.specs['shoe']` is defined with `size: new Size(55, 84)` and `maxFrames: 1`.
- [ ] `createEnemy('shoe', ...)` returns a `Shoe` instance (verified via factory integration test below).
- [ ] Verify: `npm test -- --testPathPattern=shoe --silent` (factory integration test included in Task 3's test file).

---

### Task 5: Update main.html, main.css, index.js, and seed in Game.js

**Objective:** Wire Shoe into the four bootstrap files: script tag, img tag, display:none rule, CommonJS bootstrap, and one spawn in Game.js.

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`
- Modify: `src/Game.js`

**Key Decisions / Notes:**

- **main.html** — add after `<script src="src/Wheel.js">` (line 22):
  `<script src="src/Shoe.js"></script>`
  Add before `</body>`: `<img src="images/items/shoe_sprite.png" id="shoe_sprite"/>`
- **main.css** — append `, #shoe_sprite` immediately before the `{` that follows `#butterfly_fish_sprite` in the display:none selector, so the line ends: `..., #butterfly_fish_sprite, #shoe_sprite {`.
- **index.js** — add immediately after the line `const { Wheel } = require('./src/Wheel');            global.Wheel              = Wheel;`:
  `const { Shoe }              = require('./src/Shoe');              global.Shoe               = Shoe;`
  Add `Shoe` to `module.exports` on the final line.
- **src/Game.js** — add one spawn after the Wheel spawn:
  `this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_SHOE, this, ctx));`
- Load order check: `src/Shoe.js` must come before `src/EnemyFactory.js` in main.html.
- `Trivial:` for the Game.js line: 1 net new line, no new branch/loop/try, no new public symbol; covered by `npm test`.

**Definition of Done:**

- [ ] `main.html` has `<script src="src/Shoe.js"></script>` before `EnemyFactory.js`.
- [ ] `main.html` has `<img src="images/items/shoe_sprite.png" id="shoe_sprite"/>`.
- [ ] `main.css` has `#shoe_sprite` in the `display: none` selector.
- [ ] `index.js` requires, globalizes, and exports `Shoe`.
- [ ] `src/Game.js` spawns one Shoe via `ENEMY_TYPE_SHOE`.
- [ ] Verify: `node -e "const {Shoe}=require('./index.js'); console.log(typeof Shoe)"` prints `function`.
- [ ] Verify: `npm test --silent`

---

### Task 6: Write ADR 0023

**Objective:** Document the Shoe design decisions in `docs/adr/0023-shoe-inert-object.md`: why single-PNG/no-assembly, display size rationale, score placement, ADR format matching 0021-wheel-inert-object.md.

**Files:**

- Create: `docs/adr/0023-shoe-inert-object.md`

**Key Decisions / Notes:**

- Follow the format of `docs/adr/0021-wheel-inert-object.md`: title, date, status, context, decisions, consequences.
- Decisions to document: (1) single PNG used as-is (no assembly), (2) display size 55×84 (aspect-ratio preservation), (3) score -5 matching other inert objects, (4) bob+tilt+drift animation shared with Wheel/RedApple, (5) spawn at WATER_SURFACE_Y with random X.
- `Trivial:` docs-only, no production code, no branches; verified by `ls docs/adr/0023-shoe-inert-object.md`.

**Definition of Done:**

- [ ] `docs/adr/0023-shoe-inert-object.md` exists with Context, Decisions, and Consequences sections.
- [ ] Verify: `wc -l docs/adr/0023-shoe-inert-object.md` shows ≥ 30 lines.
