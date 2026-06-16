# HammerHeadShark Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a HammerHeadShark enemy (extends `CatchableFish`, fight spec `{ strength: 80, escape_rate: 3.0 }`) using the Shark_2 spritesheet built from individual PNGs, hide its sprite element via CSS, and document design decisions in ADR 0012.

## Approach

**Chosen:** Mirror the `LionFish` pattern exactly — `spriteFrameSize` for source-frame stride vs display size, `randomSpawnX` inherited from `CatchableFish`, species-specific `randomSpawnY` for deep-water placement, override `draw()` and `_drawCapturedSprite()`.
**Why:** Every catchable fish already follows this two-layer hierarchy; repeating the exact pattern keeps the delta minimal and avoids introducing new abstractions.

## Context for Implementer

**Spritesheet layout:** Shark_2 assets are 30 individual PNGs. Task 1 builds a 2-row spritesheet (move + die only; attack excluded — no attack state in the game):

| Row | Frames | Source size | Padding to canonical cell |
|-----|--------|-------------|--------------------------|
| 0   | 10     | 773×382 px  | x_offset=12, y_offset=40 (center-pad to 798×463) |
| 1   | 10     | 798×463 px  | none (native = canonical) |

Canonical cell: **798×463 px** (die-frame size). Spritesheet: **7980×926 px** (10 cols × 2 rows).

**`Size(h, w)` constructor:** `new Size(HAMMERHEAD_SHARK_FRAME_HEIGHT, HAMMERHEAD_SHARK_FRAME_WIDTH)` = `new Size(463, 798)` → `getWidth()=798, getHeight()=463` ✓. Same convention as LionFish and Crab.

**FISH_SPECS already has `shark: {strength:60, escape_rate:3.0}`** (reserved). The new entry is `hammerhead_shark: {strength:80, escape_rate:3.0}` — a distinct key.

**Sprite facing direction:** Assumed LEFT (same as LionFish/ButterflyFish). Flip condition: `direction === 1 ? -1 : 1`. Verify visually after Task 3; if wrong, change to `direction === -1 ? -1 : 1` (one-line fix).

**Display size:** 200×116 px (798:463 ratio at ×0.25 scale). Larger than LionFish (124×124) to convey danger.

**Drift speed:** `HAMMERHEAD_SHARK_DRIFT_SPEED = 3.5` px/tick — fastest swimming fish (between LionFish 2.0 and Crab 4.0).

**Spawn zone:** deeper than LionFish — `WATER_SURFACE_Y + 100` to `canvasHeight * 0.8 - fishHeight`. The `Math.max` guard (same as LionFish) prevents a negative range on small canvases.

## Assumptions

- Shark_2 sprite faces LEFT — Task 3 and Task 5 depend on this. If wrong, update `draw()` flipX condition and the direction-flip tests.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shark_2 sprite faces RIGHT (not left) | Medium | Backwards swimming | Flag in Assumptions; Task 3 comment notes it; verify visually in spec-verify |
| Pillow not installed | Low | Blocks Task 1 | Script starts with `pip install Pillow` guard |

## Progress Tracking

- [x] Task 1: Generate hammerhead_shark_sprite.png spritesheet
- [x] Task 2: Add HammerHeadShark constants and fight spec to constants.js
- [x] Task 3: Create src/HammerHeadShark.js
- [x] Task 4: Wire into main.html, main.css, index.js, EnemyFactory.js, Game.js
- [x] Task 5: Add hammerheadshark.test.js unit tests
- [x] Task 6: Create ADR 0012

## Implementation Tasks

### Task 1: Generate hammerhead_shark_sprite.png spritesheet

**Objective:** Run a Python script to stitch the 20 individual Shark_2 PNGs (10 move + 10 die) into a single 7980×926 px spritesheet (10 cols × 2 rows, each cell 798×463 px). Move frames (773×382) are center-padded. Output saved to `images/fishes/hammerhead_shark_sprite.png`.

**Files:**

- Create: `images/fishes/hammerhead_shark_sprite.png` (binary asset)

**Key Decisions / Notes:**

- Cell size: 798×463 (die-frame dimensions — widest and tallest across both rows).
- Move frames center-padded: `x_offset = (798-773)//2 = 12`, `y_offset = (463-382)//2 = 40`.
- Attack frames excluded (same policy as LionFish/Crab).
- Filename convention **verified** at planning time: `Shark_move_2_000.png` … `Shark_die_2_009.png` (3 zero-padded digits, matching `{i:03d}` in the script).
- Script to run from repo root:
  ```python
  # pip install Pillow
  from PIL import Image
  import os

  SRC = '/home/smarcet/Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Shark_2'
  FW, FH = 798, 463
  N = 10

  m0 = Image.open(f'{SRC}/Shark_move_2_000.png'); assert m0.size == (773, 382), f'Move: {m0.size}'
  d0 = Image.open(f'{SRC}/Shark_die_2_000.png');  assert d0.size == (798, 463), f'Die: {d0.size}'
  print('Input dims OK')

  sheet = Image.new('RGBA', (FW * N, FH * 2), (0, 0, 0, 0))
  for i in range(N):
      move = Image.open(f'{SRC}/Shark_move_2_{i:03d}.png').convert('RGBA')
      die  = Image.open(f'{SRC}/Shark_die_2_{i:03d}.png').convert('RGBA')
      cell_m = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_m.paste(move, ((FW - move.width) // 2, (FH - move.height) // 2))
      cell_d = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_d.paste(die, ((FW - die.width) // 2, (FH - die.height) // 2))
      sheet.paste(cell_m, (i * FW, 0))
      sheet.paste(cell_d, (i * FW, FH))

  os.makedirs('images/fishes', exist_ok=True)
  sheet.save('images/fishes/hammerhead_shark_sprite.png')
  print('Saved:', sheet.size)
  ```

**Definition of Done:**

- [ ] `images/fishes/hammerhead_shark_sprite.png` exists with dimensions exactly 7980×926 px.
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/fishes/hammerhead_shark_sprite.png'); assert img.size == (7980, 926), img.size; print('OK', img.size)"`

---

### Task 2: Add HammerHeadShark constants and fight spec to constants.js

**Objective:** Add all tuneable values for the HammerHeadShark to `src/constants.js` — sprite source dimensions, enemy type string, drift speed, and fight spec — following the LION_FISH_* naming convention.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- New constants (add after the LION_FISH_* block, before PLAYER_* block):
  - `HAMMERHEAD_SHARK_FRAME_WIDTH = 798` (die-frame width = canonical cell stride)
  - `HAMMERHEAD_SHARK_FRAME_HEIGHT = 463` (die-frame height = canonical cell stride)
  - `HAMMERHEAD_SHARK_MAX_FRAME_X = 10` (10 frames per row; guard `< maxFrameX-1` → frames 0-9 ✓)
  - `HAMMERHEAD_SHARK_DIE_FRAME_Y = 1` (row 0 = move, row 1 = die)
  - `HAMMERHEAD_SHARK_DRIFT_SPEED = 3.5` (px/tick — fastest fish, between LionFish 2.0 and Crab 4.0)
  - `ENEMY_TYPE_HAMMERHEAD_SHARK = 'hammerhead_shark'` (add near other ENEMY_TYPE_* constants)
- Add to `FISH_SPECS`: `hammerhead_shark: { strength: 80, escape_rate: 3.0 }` (hardest fish, one tier above crab).
- Export all new constants and the new `ENEMY_TYPE_HAMMERHEAD_SHARK` in `module.exports`.

**Definition of Done:**

- [ ] All 5 constants plus `ENEMY_TYPE_HAMMERHEAD_SHARK` exported from `src/constants.js`.
- [ ] `FISH_SPECS['hammerhead_shark']` has `strength: 80` and `escape_rate: 3.0`.
- [ ] Verify: `node -e "const c=require('./src/constants'); console.log(c.HAMMERHEAD_SHARK_FRAME_WIDTH, c.HAMMERHEAD_SHARK_DRIFT_SPEED, c.FISH_SPECS['hammerhead_shark'])"`

---

### Task 3: Create src/HammerHeadShark.js

**Objective:** Implement `HammerHeadShark extends CatchableFish` — a deep-water enemy with a large display size (200×116 px), mid-to-deep spawn zone, and the LionFish `spriteFrameSize` draw pattern. Fight spec pulled from `FISH_SPECS['hammerhead_shark']`.

**Files:**

- Create: `src/HammerHeadShark.js`

**Key Decisions / Notes:**

- Constructor signature mirrors `LionFish` exactly: `(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize)`.
- Sets: `_sw = spriteFrameSize.getWidth()` (798), `_sh = spriteFrameSize.getHeight()` (463), `_staggerFrame = ANIM_STAGGER_SLOW` (6), `_driftSpeed = HAMMERHEAD_SHARK_DRIFT_SPEED` (3.5), `_strength = FISH_SPECS['hammerhead_shark'].strength` (80), `_escapeRate = FISH_SPECS['hammerhead_shark'].escape_rate` (3.0).
- `static randomSpawnY(canvasHeight, fishHeight, rng = Math.random)`:
  ```js
  const minY = WATER_SURFACE_Y + 100;  // deeper than LionFish
  const maxY = Math.max(minY, canvasHeight * 0.8 - fishHeight);
  return minY + rng() * (maxY - minY);
  ```
- `randomSpawnX` inherited from `CatchableFish` (no override needed).
- `update()` direction bootstrap: same as LionFish — set on first frame based on `x < canvasWidth/2`.
- `draw()` flip: `const flipX = this._direction === 1 ? -1 : 1;` (sprite assumed to face LEFT; comment notes the assumption).
- `_drawCapturedSprite(dx, dy, w, h)`: same pattern as LionFish (`dieFrameX * _sw`, `dieFrameY * _sh`).
- CommonJS guard at end of file.

**Definition of Done:**

- [ ] `HammerHeadShark` constructor sets `_strength = 80`, `_escapeRate = 3.0`, `_staggerFrame = 6`.
- [ ] `getFightSpec()` returns `{ strength: 80, escapeRate: 3.0 }` (inherited from CatchableFish).
- [ ] `HammerHeadShark.randomSpawnY(900, 116)` returns value in `[WATER_SURFACE_Y + 100, 900 * 0.8 - 116]`.
- [ ] Verify: `npm test -- --silent` — all existing tests pass.

---

### Task 4: Wire into main.html, main.css, index.js, EnemyFactory.js, and Game.js

**Objective:** Register `HammerHeadShark` in all entry points — HTML preload tag, CSS hide rule, CommonJS harness, factory spec and branch, and game spawn list (1 instance).

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`
- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`

**Key Decisions / Notes:**

- `main.html` — add after `<script src="src/LionFish.js">`:
  ```html
  <script src="src/HammerHeadShark.js"></script>
  ```
  Add before `</body>`:
  ```html
  <img src="images/fishes/hammerhead_shark_sprite.png" id="hammerhead_shark_sprite"/>
  ```
- `main.css` — append `#hammerhead_shark_sprite` to the existing display:none selector (same line as `#lion_fish_sprite`).
- `index.js` — add after the LionFish line:
  ```js
  const { HammerHeadShark } = require('./src/HammerHeadShark'); global.HammerHeadShark = HammerHeadShark;
  ```
  Add `HammerHeadShark` to `module.exports`.
- `EnemyFactory.js` constructor — add spec after `ENEMY_TYPE_LION_FISH` spec:
  ```js
  this.specs[ENEMY_TYPE_HAMMERHEAD_SHARK] = {
    image: (typeof document !== 'undefined') ? document.getElementById('hammerhead_shark_sprite') : null,
    size: new Size(116, 200),                      // display: 200×116 px
    spriteFrameSize: new Size(HAMMERHEAD_SHARK_FRAME_HEIGHT, HAMMERHEAD_SHARK_FRAME_WIDTH), // Size(463,798)
    maxFrameX: HAMMERHEAD_SHARK_MAX_FRAME_X,
    maxFrameY: 1,
    dieFrameX: 0,
    dieFrameY: HAMMERHEAD_SHARK_DIE_FRAME_Y,
  };
  ```
  Add `createEnemy` branch before the final `return new Octopus(...)`:
  ```js
  if (name === ENEMY_TYPE_HAMMERHEAD_SHARK) {
    return new HammerHeadShark(
      game, ctx, spec.size,
      new Point(
        HammerHeadShark.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        HammerHeadShark.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY,
      spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }
  ```
- `Game.js` — spawn 1 HammerHeadShark after the LionFish loop:
  ```js
  this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_HAMMERHEAD_SHARK, this, ctx));
  ```
  1 instance (rarity matches extreme difficulty).

**Definition of Done:**

- [ ] `main.html` loads `hammerhead_shark_sprite.png` and `src/HammerHeadShark.js`.
- [ ] `#hammerhead_shark_sprite` is in the CSS `display: none` rule.
- [ ] `node -e "const { HammerHeadShark } = require('./index.js'); console.log(typeof HammerHeadShark)"` prints `function`.
- [ ] `EnemyFactory.createEnemy(ENEMY_TYPE_HAMMERHEAD_SHARK, game, ctx)` returns a `HammerHeadShark` instance (covered by `hammerheadshark.test.js` factory test).
- [ ] Verify: `node -e "const { HammerHeadShark } = require('./index.js'); console.log(typeof HammerHeadShark)"` prints `function`.
- [ ] Verify: `npm test -- --silent`

---

### Task 5: Add hammerheadshark.test.js unit tests

**Objective:** Unit test the HammerHeadShark behavioural contract — class hierarchy, fight spec, animation cadence, direction flip, and spawn bounds — mirroring the structure of `lionfish.test.js`.

**Files:**

- Create: `__tests__/hammerheadshark.test.js`

**Key Decisions / Notes:**

- Import: `const { Size, Point, CatchableFish, HammerHeadShark } = require('../index.js');`
- Local constants (NOT destructured from index.js exports — same pattern as lionfish.test.js):
  ```js
  const HAMMERHEAD_SHARK_FRAME_WIDTH  = 798;
  const HAMMERHEAD_SHARK_FRAME_HEIGHT = 463;
  const HAMMERHEAD_SHARK_MAX_FRAME_X  = 10;
  const WATER_SURFACE_Y               = 300;
  const CANVAS_W = 800;
  const CANVAS_H = 900;  // must satisfy: CANVAS_H * 0.8 - fishHeight > WATER_SURFACE_Y + 100
  ```
  Check: `900 * 0.8 - 116 = 604 > 400 (= 300+100)` ✓
- `makeHammerHead(startX = 0)` factory:
  ```js
  new HammerHeadShark(
    mockGame, mockCtx,
    new Size(116, 200),          // display: h=116, w=200
    new Point(startX, 400),
    mockImage,
    10, 1, 0, 1,
    new Size(HAMMERHEAD_SHARK_FRAME_HEIGHT, HAMMERHEAD_SHARK_FRAME_WIDTH)  // Size(463,798)
  )
  ```
- `mockGame`: `getSize: () => new Size(CANVAS_H, CANVAS_W)` = `new Size(900, 800)`.
- `mockCtx` must include `set shadowColor(_){}`, `set shadowBlur(_){}`, `set globalAlpha(_){}` for drawCaptured glow. `scale: jest.fn()`.
- `mockCtx` must include (mirror `lionfish.test.js` exactly):
  ```js
  const mockCtx = {
    drawImage: () => {}, beginPath: () => {}, stroke: () => {},
    fillRect: () => {}, fillText: () => {}, save: () => {}, restore: () => {},
    translate: () => {}, rotate: () => {}, scale: jest.fn(),
    setLineDash: () => {},
    set shadowColor(_) {}, set shadowBlur(_) {}, set globalAlpha(_) {},
  };
  ```
- 4 describe blocks:
  1. **Class hierarchy** — `instanceof CatchableFish`; `getFightSpec()` returns `{ strength: 80, escapeRate: 3.0 }`.
  2. **Animation cadence** — `_frameX` stays 0 for 5 updates, becomes 1 on 6th (staggerFrame=6).
  3. **Direction flip** — `draw()` calls `ctx.scale(1,1)` when `_direction === -1` (faces left naturally); `ctx.scale(-1,1)` when `_direction === 1`. **⚠ Assumption-dependent:** if the sprite actually faces RIGHT, invert these assertions — `scale(1,1)` when `direction===1`, `scale(-1,1)` when `direction===-1`. Update `draw()` and tests together.
  4. **Spawn bounds** — `randomSpawnY` in `[WATER_SURFACE_Y+100, CANVAS_H*0.8-fishHeight]`; deterministic with fixed rng; `randomSpawnX` (inherited) returns value in `[0, CANVAS_W-fishWidth]`.

**Definition of Done:**

- [ ] All hammerheadshark tests pass with correct assertions.
- [ ] Full suite: `npm test -- --silent` reports 0 failures.
- [ ] Verify: `npm test -- --silent`

---

### Task 6: Create ADR 0012

**Objective:** Write `docs/adr/0012-hammerhead-shark-enemy-deep-water.md` documenting the key design decisions for the HammerHeadShark enemy — spritesheet assembly, canonical cell derivation, deep-water spawn zone, display size, fight spec tier placement, and reuse of `CatchableFish.randomSpawnX`.

**Files:**

- Create: `docs/adr/0012-hammerhead-shark-enemy-deep-water.md`

**Key Decisions / Notes:**

- `Trivial:` ADR is pure documentation — no production code, no new branch/loop/try. No test needed. Covered by visual inspection.
- Follow the same heading structure as ADR 0011 (`docs/adr/0011-lionfish-enemy-mid-water-and-spawn-refactor.md`): Context → Decisions (numbered) → Consequences.
- Decisions to document: (1) extends CatchableFish / spriteFrameSize pattern; (2) canonical cell = 798×463 (die-frame, largest); (3) move-frame center-padding; (4) attack row excluded; (5) deep-water spawn minY = WATER_SURFACE_Y+100; (6) display size 200×116 and why; (7) fight spec tier (strength=80 > Crab 40 > LionFish 15); (8) drift speed 3.5 px/tick; (9) sprite-facing assumption (LEFT) and how to flip if wrong.

**Definition of Done:**

- [ ] `docs/adr/0012-hammerhead-shark-enemy-deep-water.md` exists and follows ADR 0011 structure.
- [ ] All 9 decisions are documented.
- [ ] Verify: `ls -la docs/adr/0012-hammerhead-shark-enemy-deep-water.md`

## E2E Test Scenarios

### TS-001: HammerHeadShark appears in deep water and is catchable
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8000/main.html`
**Mapped Tasks:** Tasks 3, 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Ocean scene loads; 1 HammerHeadShark visible swimming at deep-water depth (below mid-water LionFish) |
| 2 | Observe HammerHeadShark sprite | Animated shark (~200×116 px, larger than LionFish) swimming left or right, NOT backwards |
| 3 | Cast hook toward the shark | Hook descends past mid-water LionFish zone into deep water |
| 4 | Wait for hook to collide with HammerHeadShark | Hook attaches; shark enters captured state with gold glow |
| 5 | Observe struggle difficulty | Escape bar fills faster than LionFish; requires rapid Space presses |
