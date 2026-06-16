# PufferFish Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a PufferFish enemy (score=25, strength=30, escape_rate=2.2) that extends CatchableFish, using a spritesheet assembled from the 30 individual PNG frames in Fish_3/, with all integration points wired: constants, EnemyFactory, ScoreSystem, main.html, main.css, and an ADR.

## Approach

**Chosen:** Mirror the ClownFish/Shark pattern — new class extending CatchableFish, 2-row spritesheet built via Pillow from Fish_move_3_* (row 0) and Fish_die_3_* (row 1).
**Why:** Every CatchableFish-based enemy in the codebase uses this exact shape (class → constants → EnemyFactory entry → img tag → CSS hide), so the implementation is mechanical and verifiable against existing fish.

## Context for Implementer

- `Size(h, w)` — height is the FIRST argument (all display sizes use this convention).
- `SCORE_MAP` in `src/ScoreSystem.js` is keyed by `constructor.name`; the key must be exactly `'PufferFish'`.
- The Fish_3 asset has 3 animation sets (attack, move, die); use **move** for row 0 (swim) and **die** for row 1 (captured). The attack frames are excluded — the 2-row layout matches every other CatchableFish in the codebase.
- Frame dimensions: die frames 358×305 (canonical cell), attack frames 324×235 (padded to fill cell). Spritesheet = 3580×610 px (10 cols × 2 rows). Move frames (208×111) excluded — too small relative to die frames.

## File Structure

- `images/fishes/puffer_fish_sprite.png` (create) — 2-row spritesheet (move row 0, die row 1).
- `src/constants.js` (modify) — PUFFER_FISH_* frame/drift constants + DOM_ID + ENEMY_TYPE + FISH_SPECS entry. Display constants live in EnemyFactory.js, not here.
- `src/ScoreSystem.js` (modify) — add `PufferFish: 25` to SCORE_MAP.
- `src/EnemyFactory.js` (modify) — PUFFER_FISH_DISPLAY_H/W local consts + spec entry + createEnemy branch.
- `src/PufferFish.js` (create) — class extending CatchableFish.
- `index.js` (modify) — require/global/export PufferFish alongside existing fish (after JellyFish line).
- `main.html` (modify) — `<script>` tag for PufferFish.js (after JellyFish.js, before Shark.js) + `<img>` for the sprite.
- `main.css` (modify) — add `#puffer_fish_sprite` to the display:none rule.
- `docs/adr/0022-pufferfish-enemy.md` (create) — ADR documenting the decisions.

## Progress Tracking

- [x] Task 1: Assemble PufferFish spritesheet from PNG frames
- [x] Task 2: Add PufferFish constants and FISH_SPECS entry
- [x] Task 3: Create PufferFish class
- [x] Task 4: Wire PufferFish into EnemyFactory and ScoreSystem
- [x] Task 5: Update main.html, main.css, and index.js
- [x] Task 6: Write ADR 0022

## Implementation Tasks

---

### Task 1: Assemble PufferFish spritesheet from PNG frames

**Objective:** Build `images/fishes/puffer_fish_sprite.png` from the 30 individual PNG files in Fish_3/. Row 0 = Fish_move_3_000–009 (swim animation), row 1 = Fish_die_3_000–009 (captured/die animation). The Fish_attack_3_* frames are excluded — the standard 2-row layout matches every other CatchableFish in this codebase. Result: 3240×470 px RGBA PNG.

**Files:**

- Create: `images/fishes/puffer_fish_sprite.png`

**Key Decisions / Notes:**

- Frame size: 324×235 px (verified via PIL). Sheet = 10 cols × 2 rows.
- Use Python + Pillow to stitch frames in filename-sort order (000–009 for each row).
- Source dir: `/home/smarcet/Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Fish_3/`
- Output: `images/fishes/puffer_fish_sprite.png` relative to repo root.

**Definition of Done:**

- [x] Pre-flight: attack (10) and die (10) frame counts verified.
- [x] `puffer_fish_sprite.png` exists in `images/fishes/` — size 3580×610 px (cell 358×305, 10 cols × 2 rows).
- [x] Row 0: 10 attack frames padded to 358×305; row 1: 10 die frames at natural 358×305.
- [x] Verify: `python3 -c "from PIL import Image; img=Image.open('images/fishes/puffer_fish_sprite.png'); assert img.size==(3580,610); print('OK')"` — passed.

---

### Task 2: Add PufferFish constants and FISH_SPECS entry

**Objective:** Add all named constants for the PufferFish sprite layout, display size, drift speed, DOM id, and enemy type to `src/constants.js`, and add `puffer_fish` to the FISH_SPECS lookup. These constants are consumed by EnemyFactory and PufferFish.js.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Display size (`PUFFER_FISH_DISPLAY_H/W`) lives in `EnemyFactory.js` only — every other fish's display constants are local to that file (`SHARK_DISPLAY_H`, `CLOWN_FISH_DISPLAY_H`, etc.). Do NOT add them to constants.js.
- Frame constants for constants.js: `PUFFER_FISH_FRAME_WIDTH = 358`, `PUFFER_FISH_FRAME_HEIGHT = 305`, `PUFFER_FISH_MAX_FRAME_X = 10`, `PUFFER_FISH_DIE_FRAME_Y = 1`.
- `PUFFER_FISH_DRIFT_SPEED = 1.5` — same tier as ButterflyFish/ClownFish (easy drift, difficulty comes from escape mechanic, not speed).
- `DOM_ID_PUFFER_FISH = 'puffer_fish_sprite'` — placed in the DOM IDs block alongside other `DOM_ID_*` constants.
- `ENEMY_TYPE_PUFFER_FISH = 'puffer_fish'` — placed alongside other `ENEMY_TYPE_*` constants.
- `puffer_fish: { strength: 30, escape_rate: 2.2 }` in FISH_SPECS — between `lion_fish` (15/2.5) and `crab` (40/2.2).
- Export `ENEMY_TYPE_PUFFER_FISH` and `PUFFER_FISH_FRAME_*`, `PUFFER_FISH_DRIFT_SPEED`, `DOM_ID_PUFFER_FISH` in the existing `module.exports` block at the bottom of constants.js.

**Definition of Done:**

- [ ] `PUFFER_FISH_FRAME_WIDTH`, `PUFFER_FISH_FRAME_HEIGHT`, `PUFFER_FISH_MAX_FRAME_X`, `PUFFER_FISH_DIE_FRAME_Y`, `PUFFER_FISH_DRIFT_SPEED` are defined in constants.js.
- [ ] `DOM_ID_PUFFER_FISH` and `ENEMY_TYPE_PUFFER_FISH` are defined in constants.js.
- [ ] `FISH_SPECS.puffer_fish` = `{ strength: 30, escape_rate: 2.2 }`.
- [ ] Verify: `node -e "const c=require('./src/constants.js'); console.log(c.FISH_SPECS.puffer_fish, c.ENEMY_TYPE_PUFFER_FISH)"`

---

### Task 3: Create PufferFish class

**Objective:** Implement `src/PufferFish.js` extending `CatchableFish`. The class reads strength/escapeRate from `FISH_SPECS['puffer_fish']`, uses `PUFFER_FISH_DRIFT_SPEED`, inherits `randomSpawnX` from `Enemy`, and defines `randomSpawnY` to spawn anywhere below `WATER_SURFACE_Y` (same range as ClownFish). The draw/captured methods mirror `ClownFish.js` and `Shark.js`.

**Files:**

- Create: `src/PufferFish.js`

**Key Decisions / Notes:**

- Copy the ClownFish/Shark draw pattern exactly: `flipX = direction===1 ? -1 : 1`, save/translate/scale/drawImage/restore. See `src/ClownFish.js:55–65` and `src/Shark.js:55–65`.
- `randomSpawnY`: `minY = WATER_SURFACE_Y`, `maxY = Math.max(minY, canvasHeight - fishHeight)` — same as ClownFish (full mid-water range).
- `randomSpawnX` is inherited from `Enemy` (see `src/Enemy.js:76`) — do NOT redefine it.
- `_drawCapturedSprite` uses `this._dieFrameX * this._sw, this._dieFrameY * this._sh` — same as ClownFish.
- Module export tail: `if (typeof module !== 'undefined' && module.exports) { module.exports = { PufferFish }; }`

**Definition of Done:**

- [ ] `src/PufferFish.js` exists and exports `PufferFish`.
- [ ] `new PufferFish(...)` sets `_strength=30`, `_escapeRate=2.2`, `_driftSpeed=1.5`.
- [ ] Verify: `node -e "const {PufferFish}=require('./src/PufferFish.js'); console.log('ok')"` (requires mock deps — use the Jest test below instead).
- [ ] Verify: `npm test -- --testPathPattern=PufferFish` passes.

---

### Task 4: Wire PufferFish into EnemyFactory and ScoreSystem

**Objective:** Register PufferFish in `src/EnemyFactory.js` (display constants + spec array entry + `createEnemy` branch) and add `PufferFish: 25` to `SCORE_MAP` in `src/ScoreSystem.js`.

**Files:**

- Modify: `src/EnemyFactory.js`
- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- EnemyFactory display constants: `const PUFFER_FISH_DISPLAY_H = 152` and `PUFFER_FISH_DISPLAY_W = 179` — half the canonical 305×358 cell (same halving as Shark: 512→256, 1060→530). Add near other display constants at top of file (block with `SHARK_DISPLAY_H = 256`).
- Spec entry in constructor: follow the LionFish/ClownFish pattern (has `spriteFrameSize` because canonical frame size ≠ display size):
  ```js
  this.specs[ENEMY_TYPE_PUFFER_FISH] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_PUFFER_FISH) : null,
    size: new Size(PUFFER_FISH_DISPLAY_H, PUFFER_FISH_DISPLAY_W),
    spriteFrameSize: new Size(PUFFER_FISH_FRAME_HEIGHT, PUFFER_FISH_FRAME_WIDTH),
    maxFrameX: PUFFER_FISH_MAX_FRAME_X,
    maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
    dieFrameX: SPRITE_DIE_FRAME_X,
    dieFrameY: PUFFER_FISH_DIE_FRAME_Y,
  };
  ```
- `createEnemy` branch: add before the final `return new Octopus(...)` fallback, following the Shark branch pattern (`src/EnemyFactory.js` around line 295):
  ```js
  if (name === ENEMY_TYPE_PUFFER_FISH) {
    return new PufferFish(
      game, ctx, spec.size,
      new Point(
        PufferFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        PufferFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY,
      spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }
  ```
- ScoreSystem: add `PufferFish: 25,` to `SCORE_MAP` (key = `constructor.name`).

**Definition of Done:**

- [ ] `EnemyFactory.specs[ENEMY_TYPE_PUFFER_FISH]` is defined with correct size and spriteFrameSize.
- [ ] `createEnemy('puffer_fish', ...)` returns a PufferFish instance.
- [ ] `SCORE_MAP['PufferFish'] === 25`.
- [ ] Verify: `npm test` passes (all existing tests + new PufferFish unit tests).

---

### Task 5: Update main.html, main.css, and index.js

**Objective:** Wire PufferFish into the three bootstrap files: (1) add `<script>` and `<img>` tags to `main.html`, (2) add `#puffer_fish_sprite` to the display:none rule in `main.css`, and (3) add the PufferFish require/global/export to `index.js` so Jest can find it.

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`

**Key Decisions / Notes:**

- `<script>` insertion: after `src/JellyFish.js` (line 31), before `src/Shark.js` (line 32) — PufferFish.js must load before EnemyFactory.js (line 36).
- `<img>` insertion: after `<img src="images/fishes/shark_sprite.png" id="shark_sprite"/>` (last line before `</body>`).
- `main.css`: add `#puffer_fish_sprite` to the existing comma-separated display:none selector block (lines 20–23).
- `index.js`: add `const { PufferFish } = require('./src/PufferFish.js'); global.PufferFish = PufferFish;` after the JellyFish line (line 24), and add `PufferFish` to the `module.exports` object on the final line.

**Definition of Done:**

- [ ] `main.html` has `<script src="src/PufferFish.js"></script>` before `EnemyFactory.js`.
- [ ] `main.html` has `<img src="images/fishes/puffer_fish_sprite.png" id="puffer_fish_sprite"/>`.
- [ ] `main.css` has `#puffer_fish_sprite` in the `display: none` selector.
- [ ] `index.js` requires, globalizes, and exports `PufferFish`.
- [ ] Load-order: `python3 -c "lines=open('main.html').readlines(); idx=lambda s: next(i for i,l in enumerate(lines) if s in l); assert idx('PufferFish.js') < idx('EnemyFactory.js'), 'Load order wrong'; print('OK')"`
- [ ] `node -e "const {PufferFish}=require('./index.js'); console.log(typeof PufferFish)"` prints `function`.
- [ ] Start dev server, open main.html in browser — no console errors, PufferFish appears during gameplay (or verify via `game._debug=true` bounding box).

---

### Task 6: Write ADR 0022

**Objective:** Document the PufferFish design decisions in `docs/adr/0022-pufferfish-enemy.md`: why move+die rows were chosen over attack+die, display size selection (halving natural frame), drift speed rationale, score value relative to other fish, and spawn Y tier.

**Files:**

- Create: `docs/adr/0022-pufferfish-enemy.md`

**Key Decisions / Notes:**

- Follow the format of `docs/adr/0021-wheel-inert-object.md`: title, date, status, context, decisions, consequences.
- Decisions to document: (1) spritesheet row selection (move/die vs attack/die), (2) display size (half natural), (3) drift speed tier, (4) spawn Y range, (5) score value placement.

**Definition of Done:**

- [ ] `docs/adr/0022-pufferfish-enemy.md` exists with Context, Decisions, and Consequences sections.
- [ ] Verify: `ls docs/adr/0022-pufferfish-enemy.md` and `wc -l docs/adr/0022-pufferfish-enemy.md` shows > 30 lines.
