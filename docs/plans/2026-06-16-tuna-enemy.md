# Tuna Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `Tuna` enemy (extends `CatchableFish`) using individual PNG sprites assembled into a spritesheet via a PIL script. Fight spec: `{ strength: 90, escape_rate: 3.5 }` (hardest catchable fish, above SwordFish). The spritesheet `<img>` tag is hidden via `main.css`. Includes full wiring (constants, EnemyFactory, Game.js, main.html, main.css, index.js), unit tests, and an ADR.

---

## Context

The fishing game currently has ButterflyFish, LionFish, HammerHeadShark, and SwordFish as `CatchableFish` enemies. Tuna fills the top difficulty tier slot (`strength: 90, escape_rate: 3.5`) with a pre-existing placeholder comment in `src/constants.js:83`. The sprite pack ships as individual 512×300 PNGs across per-animation folders; they must be assembled into a single spritesheet before use.

---

## Workspace Scan

- Entry points: `src/EnemyFactory.js`, `src/Game.js`, `src/constants.js`, `main.html`, `main.css`, `index.js`
- Pattern template: `src/SwordFish.js` (extends CatchableFish, spriteFrameSize pattern, row 0 = swim, row 1 = rest/captured)
- Test pattern: `__tests__/swordfish.test.js`
- ADR next number: `0014`
- Greenfield: No — strictly additive, following established SwordFish pattern

---

## Sprite Asset Analysis

- Source: `/home/smarcet/Downloads/game_assets/game_assets/Tunafishsprite--1c4s3d4s198p7u3556/pngs/`
- `swim_left/`: 8 frames (1.png – 8.png), all **512×300 px** (uniform, no padding needed)
- `rest_movement_left/`: 6 frames (1.png – 6.png), all **512×300 px** (pad to 8 by repeating frame 6 twice)
- Final spritesheet: **4096×600 px** (8 cols × 512, 2 rows × 300)
  - Row 0 = swim_left (frames 1–8)
  - Row 1 = rest_movement_left (frames 1–6 + 6 + 6)

---

## Key Decisions

- `TUNA_FRAME_WIDTH = 512`, `TUNA_FRAME_HEIGHT = 300` (canonical cell = source frame, no padding)
- `TUNA_MAX_FRAME_X = 8` (0-indexed max: 7; EnemyFactory passes 8 columns → base class cycles 0–7)
- `TUNA_DIE_FRAME_Y = 1` (row 1 = rest, accessed during capture only)
- `TUNA_DRIFT_SPEED = 4.0` (slightly below SwordFish's 4.5; tuna are fast but not the fastest)
- Display size: `new Size(225, 384)` ≈ 75% of the 512×300 cell (adjustable after visual review)
- `ENEMY_TYPE_TUNA = 'tuna'` — matches the FISH_SPECS key
- Replace existing `// tuna: reserved` comment at `src/constants.js:83` (not insert)
- Spritesheet saved to `images/fishes/tuna_sprite.png`

---

## Progress Tracking

Done: 6 / Left: 0

- [x] Task 1: Assemble tuna spritesheet from individual PNGs
- [x] Task 2: Add Tuna constants to src/constants.js
- [x] Task 3: Implement Tuna class (src/Tuna.js)
- [x] Task 4: Wire Tuna into EnemyFactory, Game.js, main.html, main.css, index.js
- [x] Task 5: Unit tests (__tests__/tuna.test.js)
- [x] Task 6: ADR (docs/adr/0014-tuna-enemy.md)

---

## Task 1: Assemble Tuna Spritesheet

**Objective:** Produce `images/fishes/tuna_sprite.png` (4096×600) from individual PNGs using PIL.

**Files:**
- `scripts/assemble_tuna_sprite.py` (new, single-use script — delete after running)
- `images/fishes/tuna_sprite.png` (generated output)

**Trivial:** No — new file generation requires a script + verification step.

**Algorithm:**
```
canvas = 4096 × 600 (RGBA)
Row 0: paste swim_left/1.png … swim_left/8.png at (col*512, 0)
Row 1: paste rest_movement_left/1.png … rest_movement_left/6.png at (col*512, 300)
        then paste rest_movement_left/6.png again at (6*512, 300) and (7*512, 300)
save as images/fishes/tuna_sprite.png
```

**Verify:** `python3 -c "from PIL import Image; i=Image.open('images/fishes/tuna_sprite.png'); print(i.size)"` → `(4096, 600)`

**DoD:**
- [x] Script runs without errors
- [x] Output file is exactly 4096×600 pixels

---

## Task 2: Add Tuna Constants

**Objective:** Add Tuna-specific constants to `src/constants.js` and replace the placeholder FISH_SPECS comment.

**Files:** `src/constants.js`

**Trivial:** No — adds new public constants and modifies the FISH_SPECS object.

**RED test:** Verify that after the change, `require('./src/constants').TUNA_FRAME_WIDTH` equals 512 (or assert via a constants test — but constants are already exercised transitively by the Tuna class test; the unit test in Task 5 covers this).

**Changes:**
1. After line 56 (SWORDFISH block), add:
   ```js
   const TUNA_FRAME_WIDTH   = 512;   // px - canonical cell horizontal stride
   const TUNA_FRAME_HEIGHT  = 300;   // px - canonical cell vertical stride
   const TUNA_MAX_FRAME_X   = 8;     // 8 frames per row (swim + rest both padded to 8)
   const TUNA_DIE_FRAME_Y   = 1;     // row 0 = swim, row 1 = rest (captured animation)
   const TUNA_DRIFT_SPEED   = 4.0;   // px/tick - fast but below SwordFish (4.5)
   ```

2. Replace line 83 (`// tuna: reserved...`) with:
   ```js
   tuna: { strength: 90, escape_rate: 3.5 },  // hardest — above SwordFish
   ```

3. After ENEMY_TYPE_SWORDFISH (line 100), add:
   ```js
   const ENEMY_TYPE_TUNA = 'tuna';
   ```

**DoD:**
- [x] `TUNA_FRAME_WIDTH`, `TUNA_FRAME_HEIGHT`, `TUNA_MAX_FRAME_X`, `TUNA_DIE_FRAME_Y`, `TUNA_DRIFT_SPEED`, `ENEMY_TYPE_TUNA` defined
- [x] `FISH_SPECS.tuna = { strength: 90, escape_rate: 3.5 }`
- [x] No duplicate key (old placeholder comment removed)

---

## Task 3: Implement Tuna Class

**Objective:** Create `src/Tuna.js` following the SwordFish template exactly.

**Files:** `src/Tuna.js` (new)

**RED test:** Write failing test that instantiates `Tuna` → confirm `ReferenceError: Tuna is not defined`, then implement.

**Implementation pattern (identical to SwordFish except keys/speeds):**
```js
class Tuna extends CatchableFish {
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();   // TUNA_FRAME_WIDTH = 512
    this._sh = this._spriteFrameSize.getHeight();  // TUNA_FRAME_HEIGHT = 300
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed   = TUNA_DRIFT_SPEED;
    this._strength     = FISH_SPECS['tuna'].strength;
    this._escapeRate   = FISH_SPECS['tuna'].escape_rate;
  }

  static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
    const minY = WATER_SURFACE_Y + 100;  // deep-water zone (same as HammerHeadShark & SwordFish)
    const maxY = Math.max(minY, canvasHeight - fishHeight);
    return minY + rng() * (maxY - minY);
  }

  update() { ... }         // same as SwordFish
  captured(hook) { ... }  // same as SwordFish
  _drawCapturedSprite(dx, dy, w, h) { ... }  // same as SwordFish
  draw() { ... }           // same as SwordFish (row-based spriteFrameSize, flipX)
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { Tuna }; }
```

**DoD:**
- [x] `Tuna instanceof CatchableFish` → true
- [x] `getFightSpec()` returns `{ strength: 90, escapeRate: 3.5 }`
- [x] `draw()` calls `ctx.scale(-1, 1)` when `_direction === 1`
- [x] Animation stagger is `ANIM_STAGGER_SLOW` (6 ticks)
- [x] `_sw = 512`, `_sh = 300`

---

## Task 4: Wire Tuna Into the Game

**Objective:** Register `Tuna` everywhere it needs to appear so the game loads and spawns it.

**Files:**
- `src/EnemyFactory.js` — add spec + `createEnemy` branch
- `src/Game.js` — add 1× `ENEMY_TYPE_TUNA` push
- `main.html` — add `<script src="src/Tuna.js">` + `<img id="tuna_sprite">`
- `main.css` — add `#tuna_sprite` to the `display: none` selector
- `index.js` — add `Tuna` require + export

**Trivial:** No — touches 5 files with DOM-preload dependency ordering.

**EnemyFactory spec:**
```js
this.specs[ENEMY_TYPE_TUNA] = {
  image: (typeof document !== 'undefined') ? document.getElementById('tuna_sprite') : null,
  size: new Size(225, 384),
  spriteFrameSize: new Size(TUNA_FRAME_HEIGHT, TUNA_FRAME_WIDTH),
  maxFrameX: TUNA_MAX_FRAME_X,
  maxFrameY: 1,
  dieFrameX: 0,
  dieFrameY: TUNA_DIE_FRAME_Y,
};
```

**EnemyFactory createEnemy branch** (after ENEMY_TYPE_SWORDFISH block):
```js
if (name === ENEMY_TYPE_TUNA) {
  return new Tuna(
    game, ctx, spec.size,
    new Point(
      Tuna.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
      Tuna.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
    ),
    spec.image, spec.maxFrameX, spec.maxFrameY,
    spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
  );
}
```

**Game.js** — add after the `ENEMY_TYPE_SWORDFISH` push (line 34):
```js
this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_TUNA, this, ctx));
```

**main.html** — ordering: `<script src="src/Tuna.js">` after SwordFish script (line 22), `<img src="images/fishes/tuna_sprite.png" id="tuna_sprite"/>` after swordfish img (line 53).

**main.css** — append `#tuna_sprite` to the existing `display: none` selector.

**index.js** — add `Tuna` require+global after SwordFish line (19), add to `module.exports`.

**DoD:**
- [x] `document.getElementById('tuna_sprite').naturalWidth` → 4096 (in browser)
- [x] Tuna appears and swims in the canvas
- [x] No console errors on load

---

## Task 5: Unit Tests

**Objective:** Cover key Tuna behaviors with a single test file following `__tests__/swordfish.test.js`.

**Files:** `__tests__/tuna.test.js` (new)

**RED:** Write describe blocks → `Tuna is not defined` or `Cannot read property` → import works after Task 3.

**Test coverage (1 test class, behaviour-focused):**
```js
describe('Tuna class hierarchy', () => {
  test('instanceof CatchableFish')
  test('getFightSpec() returns { strength: 90, escapeRate: 3.5 }')
})
describe('Tuna animation cadence (ANIM_STAGGER_SLOW = 6)', () => {
  test('_frameX stays 0 for first 5 updates')
  test('_frameX becomes 1 on 6th update')
})
describe('Tuna direction flip in draw()', () => {
  test('ctx.scale(1, 1) when _direction = -1 (natural left-facing)')
  test('ctx.scale(-1, 1) when _direction = 1 (mirror for right-travel)')
})
describe('Tuna spawn bounds', () => {
  test('randomSpawnY in [WATER_SURFACE_Y+100, canvasHeight-fishHeight]')
  test('randomSpawnY deterministic with fixed rng')
  test('randomSpawnX (inherited) deterministic with fixed rng')
})
```

**Verify:** `npm test -- --testPathPattern=tuna` → all tests pass, 0 failures.

**DoD:**
- [x] ≤1 test class per production class (one describe tree)
- [x] Tests assert observable behavior, not internals (except `_frameX` — animation frame state is the observable output)
- [x] Full suite: `npm test` → 0 failures

---

## Task 6: ADR

**Objective:** Document key decisions in `docs/adr/0014-tuna-enemy-spritesheet-and-fight-tier.md`.

**Files:** `docs/adr/0014-tuna-enemy-spritesheet-and-fight-tier.md` (new)

**Trivial:** Yes — documentation only. Existing covering verification: `npm test` still passes.

**Topics to cover:**
1. Tuna extends CatchableFish via `spriteFrameSize` pattern (same as SwordFish)
2. Spritesheet layout: 8 cols × 2 rows, 4096×600 px; rest row padded from 6 to 8 frames
3. No padding needed (all source frames are uniform 512×300 px)
4. Fight spec tier: strength=90, escape_rate=3.5 (above SwordFish 88/3.5)
5. Deep-water spawn zone (same as HammerHeadShark + SwordFish: WATER_SURFACE_Y+100)
6. Display size: 225×384 px (75% of cell, adjustable)
7. `TUNA_DRIFT_SPEED = 4.0` (fast but below SwordFish 4.5)

---

## Runtime Environment

No server required. Verify with:
- `npm test` — Jest unit tests (no canvas, no DOM)
- `python3 -m http.server 8000` → `http://localhost:8000/main.html` — browser visual check

---

## Goal Verification

- [x] `npm test` passes all tests (including new tuna tests), 0 failures
- [x] `images/fishes/tuna_sprite.png` is exactly 4096×600 px
- [x] Tuna swims in deep water, direction-flips correctly, can be caught
- [x] `#tuna_sprite` is hidden in the browser (no stray img visible)
- [x] ADR 0014 exists at `docs/adr/0014-tuna-enemy-spritesheet-and-fight-tier.md`

---

## Risks

| Risk | Mitigation |
|------|-----------|
| PIL not installed | `pip install Pillow` before running spritesheet script |
| `display: none` selector ID mismatch | CSS uses `#tuna_sprite`; HTML `id="tuna_sprite"` — must match exactly |
| Script load order in main.html | `src/Tuna.js` must come after `src/SwordFish.js` and before `src/Hook.js` |
| Duplicate FISH_SPECS key | Replace comment at line 83 (not insert); verify no `tuna:` remains twice |

---

## Out of Scope

- Tuna snapping animation (open/close mouth folders exist but are not wired)
- Tuna swim_right, swim_right_snapping (unused; game handles direction via canvas flip)
- Score points or catch counter UI changes
