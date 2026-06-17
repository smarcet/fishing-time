# FishBone Inert Object Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `FishBone` inert object (score=−5) extending `InertObject`, built from a 2-frame horizontal spritesheet (fish_bone_01 + fish_bone_02), with bob/tilt/drift animation, random X spawn at `WATER_SURFACE_Y`, wired into EnemyFactory, Game.js, main.html, main.css, ScoreSystem, and an ADR.

## Approach

**Chosen:** Mirror the Shoe/Wheel/RedApple `InertObject` pattern with one extension — since two source PNGs are available (fish_bone_01.png, fish_bone_02.png, both 386×155 px), combine them into a 2-frame horizontal spritesheet (772×155 px) and use frame-based drawImage in `draw()` and `_drawCapturedSprite()` rather than `naturalWidth/naturalHeight` for the full image.
**Why:** Gives a subtle oscillation animation for free via the existing `EnemyWithAnimation` frame-cycle; keeps the same class hierarchy, constants placement, factory pattern, and spawn behaviour as all other inert objects. Cost: `draw()` and `_drawCapturedSprite()` compute `frameW = image.naturalWidth / maxFrameX` instead of using the full image width.

## Context for Implementer

- `Size(h, w)` — height is the FIRST argument (all display sizes use this convention).
- `SCORE_MAP` in `src/ScoreSystem.js` is keyed by `e.detail.enemyType`, which is set to `this._catch.constructor.name` in `Hook.js:94`. The key must be exactly `'FishBone'` (= `FishBone.constructor.name`). The path is: `Hook.js` dispatches `EVENT_ENEMY_CAPTURED` with `{ enemyType: this._catch.constructor.name }` → `ScoreSystem` listens and does `SCORE_MAP[e.detail.enemyType]`.
- `DOM_ID_FISH_BONE` and display constants (`FISH_BONE_DISPLAY_H/W`, `FISH_BONE_MAX_FRAMES`) live in `EnemyFactory.js` — NOT `constants.js` — matching the local-const pattern used by `DOM_ID_WHEEL`, `DOM_ID_SHOE`.
- `ENEMY_TYPE_FISH_BONE = 'fish_bone'` lives in `constants.js` (same block as other `ENEMY_TYPE_*` constants).
- Source frames: each 386×155 px RGBA. Spritesheet: 772×155 px (2 frames side by side). Display size: `FISH_BONE_DISPLAY_H = 40`, `FISH_BONE_DISPLAY_W = 100` (aspect 100/40 = 2.5 ≈ natural 386/155 = 2.49).
- `FishBone.draw()` and `_drawCapturedSprite()` must compute `frameW = this._image.naturalWidth / this._maxFrameX` (= 386) and use `this._frameX * frameW` as the source x offset — different from Shoe/Wheel which use the whole `naturalWidth`.
- Bob/tilt/drift constants (`ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`, `DRIFT_SPEED_SLOW`) are already global — do NOT redefine.
- `EnemyWithAnimation.update()` (called via `super.update()`) advances `_frameX` between 0 and `_maxFrameX-1` automatically — no extra frame logic needed in `FishBone.update()`.

## Progress Tracking

- [x] Task 1: Build and copy spritesheet
- [x] Task 2: Add constants and ScoreSystem entry
- [x] Task 3: Create FishBone class (TDD)
- [x] Task 4: Wire into EnemyFactory
- [x] Task 5: Update main.html, main.css, index.js, and seed in Game.js
- [x] Task 6: Write ADR 0024

## Implementation Tasks

---

### Task 1: Build and copy spritesheet

**Objective:** Combine `fish_bone_01.png` and `fish_bone_02.png` (each 386×155 px RGBA) into a 2-frame horizontal spritesheet (`images/items/fish_bone_sprite.png`, 772×155 px). No external tooling — Python + Pillow.

**Files:**

- Create: `images/items/fish_bone_sprite.png`

**Key Decisions / Notes:**

- Source files: `/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/fish_bone_01.png` and `fish_bone_02.png`
- Assembly command:
  ```python
  from PIL import Image
  f1 = Image.open('/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/fish_bone_01.png')
  f2 = Image.open('/home/smarcet/Downloads/game_assets/game_assets/sea-themed-icons-and-fishing-items/pngs/fish_bone_02.png')
  assert f1.size == f2.size, f'Size mismatch: {f1.size} vs {f2.size}'
  sheet = Image.new('RGBA', (f1.width * 2, f1.height))
  sheet.paste(f1, (0, 0))
  sheet.paste(f2, (f1.width, 0))
  sheet.save('images/items/fish_bone_sprite.png')
  ```
- Both source PNGs must be confirmed equal-size (386×155 px) before assembly — assert ensures no silent misalignment.
- `Trivial:` no production code, file-copy only; verified by the PIL size check below.

**Definition of Done:**

- [ ] `images/items/fish_bone_sprite.png` exists (772×155 px RGBA).
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/items/fish_bone_sprite.png'); assert img.size==(772,155), img.size; print('OK')"`

---

### Task 2: Add constants and ScoreSystem entry

**Objective:** Add `ENEMY_TYPE_FISH_BONE = 'fish_bone'` to `src/constants.js` and `FishBone: -5` to `SCORE_MAP` in `src/ScoreSystem.js`.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- Add `const ENEMY_TYPE_FISH_BONE = 'fish_bone';` after `ENEMY_TYPE_SHOE` line (~line 157 of constants.js).
- Export `ENEMY_TYPE_FISH_BONE` in the existing `module.exports` block at the bottom (same line as other `ENEMY_TYPE_*` exports).
- Add `FishBone: -5,` to `SCORE_MAP` after `Shoe: -5` in ScoreSystem.js.
- `Trivial:` ≤ 5 net new lines, no new branch/loop/try, no new public symbol.

**Definition of Done:**

- [ ] `ENEMY_TYPE_FISH_BONE === 'fish_bone'` exported from constants.js.
- [ ] `SCORE_MAP['FishBone'] === -5` in ScoreSystem.js.
- [ ] Verify: `node -e "const c=require('./src/constants.js'); console.log(c.ENEMY_TYPE_FISH_BONE)" && node -e "const {SCORE_MAP}=require('./src/ScoreSystem.js'); console.log(SCORE_MAP['FishBone'])"`

---

### Task 3: Create FishBone class (TDD)

**Objective:** Write `__tests__/fish_bone.test.js` first (RED), then implement `src/FishBone.js` extending `InertObject` with 2-frame animation, bob/tilt/drift identical to Shoe — but with frame-based drawImage in `draw()` and `_drawCapturedSprite()`.

**Files:**

- Create: `src/FishBone.js`
- Test: `__tests__/fish_bone.test.js`

**Key Decisions / Notes:**

- Constructor mirrors `Shoe`: same bob/tilt/drift fields, but pass `maxFrames = 2` to `super()` so `this._maxFrameX = 2` and frame cycling is inherited.
- `update()`: call `super.update()` (advances frameX + drift), then bob phase + offset + angle — identical to `Shoe.update()`.
- `getPosition()`: return `new Point(p.getX(), p.getY() + this._bobOffset)` — same as Shoe.
- `draw()` key difference from Shoe:
  ```js
  const frameW = this._image.naturalWidth / this._maxFrameX;  // 772/2 = 386
  this._ctx.drawImage(this._image, this._frameX * frameW, 0, frameW, this._image.naturalHeight, -w/2, -h/2, w, h);
  ```
- `_drawCapturedSprite(dx, dy, w, h)` key difference from Shoe:
  ```js
  const frameW = this._image.naturalWidth / this._maxFrameX;
  this._ctx.drawImage(this._image, this._frameX * frameW, 0, frameW, this._image.naturalHeight, dx, dy, w, h);
  ```
- Module export tail: `if (typeof module !== 'undefined' && module.exports) { module.exports = { FishBone }; }`
- Test file mirrors `__tests__/shoe.test.js`: hierarchy, bob animation, slow drift, factory integration (4 describe blocks). Display size in test: `new Size(40, 100)`.
- No `'use strict'` — no other InertObject subclass uses it.

**Definition of Done:**

- [ ] `src/FishBone.js` exists and exports `FishBone`.
- [ ] `new FishBone(...) instanceof InertObject` is true.
- [ ] `getFightSpec()` returns `null`.
- [ ] `_bobOffset === 0` before first `update()`; `getPosition().getY()` reflects bob after one tick.
- [ ] Drifts at 0.6 px/tick.
- [ ] `_maxFrameX === 2` (inherits 2-frame cycling).
- [ ] When `_frameX === 1`, `draw()` calls `ctx.drawImage` with source x = 386 (= 772/2) — verified by a spy on `ctx.drawImage` confirming the 3rd argument is 386.
- [ ] When `_frameX === 1`, `_drawCapturedSprite()` calls `ctx.drawImage` with source x = 386 — same spy approach, confirming captured-state rendering uses frame offset not full width.
- [ ] Test includes assertion: capture event detail `enemyType === 'FishBone'` (confirming SCORE_MAP key matches).
- [ ] Verify: `npm test -- --testPathPattern=fish_bone --silent`

---

### Task 4: Wire into EnemyFactory

**Objective:** Register FishBone in `src/EnemyFactory.js`: add local constants `DOM_ID_FISH_BONE`, `FISH_BONE_DISPLAY_H/W`, `FISH_BONE_MAX_FRAMES`; add spec entry; add `createEnemy` branch using `Enemy.randomSpawnX()`.

**Files:**

- Modify: `src/EnemyFactory.js`

**Key Decisions / Notes:**

- Add immediately after the Shoe constants block:
  ```js
  const DOM_ID_FISH_BONE     = 'fish_bone_sprite';
  const FISH_BONE_DISPLAY_H  = 40;   // height (first arg to Size)
  const FISH_BONE_DISPLAY_W  = 100;  // width  (second arg to Size)
  const FISH_BONE_MAX_FRAMES = 2;
  ```
- Spec entry (in constructor, after `this.specs[ENEMY_TYPE_SHOE]`):
  ```js
  this.specs[ENEMY_TYPE_FISH_BONE] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_FISH_BONE) : null,
    size: new Size(FISH_BONE_DISPLAY_H, FISH_BONE_DISPLAY_W),
    maxFrames: FISH_BONE_MAX_FRAMES,
  };
  ```
- `createEnemy` branch (after the `ENEMY_TYPE_SHOE` branch):
  ```js
  if (name === ENEMY_TYPE_FISH_BONE) {
    return new FishBone(
      game, ctx, spec.size,
      new Point(
        Enemy.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        WATER_SURFACE_Y
      ),
      spec.image, spec.maxFrames
    );
  }
  ```
- `Enemy.randomSpawnX` provides the random X per the spec requirement.

**Definition of Done:**

- [ ] `EnemyFactory.specs['fish_bone']` defined with `size: new Size(40, 100)` and `maxFrames: 2`.
- [ ] `createEnemy('fish_bone', ...)` returns a `FishBone` instance.
- [ ] Verify: `npm test -- --testPathPattern=fish_bone --silent`

---

### Task 5: Update main.html, main.css, index.js, and seed in Game.js

**Objective:** Wire FishBone into the four bootstrap files: script tag, img tag, display:none rule, CommonJS bootstrap, and one spawn in Game.js.

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`
- Modify: `src/Game.js`

**Key Decisions / Notes:**

- **main.html** — add `<script src="src/FishBone.js"></script>` after `<script src="src/Shoe.js">` (line 23). Add `    <img src="images/items/fish_bone_sprite.png" id="fish_bone_sprite"/>` (4-space indent, matching `red_apple_sprite` and `wheel_sprite`) on a new line immediately after the `shoe_sprite` img tag (line 60).
- **main.css** — append `, #fish_bone_sprite` immediately before the `{` that closes the `display: none` selector (current last entry is `#shoe_sprite`).
- **index.js** — add after the Shoe line (line 16):
  `const { FishBone }          = require('./src/FishBone');          global.FishBone          = FishBone;`
  Add `FishBone` to the final `module.exports` object.
- **src/Game.js** — add one spawn after the Shoe line (line 79):
  `this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_FISH_BONE, this, ctx));`
- Load order: `src/FishBone.js` must come before `src/EnemyFactory.js` in main.html.
- `Trivial:` for the Game.js line: 1 net new line, no new branch/loop/try, no new public symbol.

**Definition of Done:**

- [ ] `main.html` has `<script src="src/FishBone.js"></script>` before `EnemyFactory.js`.
- [ ] `main.html` has `<img src="images/items/fish_bone_sprite.png" id="fish_bone_sprite"/>`.
- [ ] `main.css` has `#fish_bone_sprite` in the `display: none` selector.
- [ ] `index.js` requires, globalizes, and exports `FishBone`.
- [ ] `src/Game.js` spawns one FishBone via `ENEMY_TYPE_FISH_BONE`.
- [ ] Verify: `node -e "const {FishBone}=require('./index.js'); console.log(typeof FishBone)"` prints `function`.
- [ ] Verify: `npm test --silent`

---

### Task 6: Write ADR 0024

**Objective:** Document the FishBone design decisions in `docs/adr/0024-fishbone-inert-object.md`: 2-frame spritesheet rationale, display size, score placement, frame-based drawImage pattern (vs naturalWidth), bob+tilt+drift animation, random X spawn.

**Files:**

- Create: `docs/adr/0024-fishbone-inert-object.md`

**Key Decisions / Notes:**

- Follow the format of `docs/adr/0023-shoe-inert-object.md`.
- Decisions to document: (1) 2-frame spritesheet (two source PNGs combined), (2) frame-based drawImage using `frameW = naturalWidth/maxFrameX` instead of full `naturalWidth`, (3) display size 40×100 (aspect-ratio preservation), (4) score -5 matching all other inert objects, (5) bob+tilt+drift shared with Shoe/Wheel/RedApple, (6) random X via `Enemy.randomSpawnX()`.
- Verify ADR numbering first: `ls docs/adr/ | sort | tail -3` must confirm 0023 is the current highest before naming the file 0024.
- `Trivial:` docs-only, no production code.

**Definition of Done:**

- [ ] `ls docs/adr/ | sort | tail -3` confirms 0023 is the highest existing ADR number.
- [ ] `docs/adr/0024-fishbone-inert-object.md` exists with Context, Decisions, and Consequences sections.
- [ ] Verify: `wc -l docs/adr/0024-fishbone-inert-object.md` shows ≥ 30 lines.
