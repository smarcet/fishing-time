# LionFish Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a LionFish enemy that swims at mid-water depth, uses the Fish_4 spritesheet (move + die rows), and has fight spec `{ strength: 15, escape_rate: 2.5 }` — harder to land than ButterflyFish, easier than Crab. Also moves the shared `randomSpawnX` helper to `CatchableFish` as a static method (user request during planning).

## Approach

**Chosen:** Extend `CatchableFish` following the `Crab` pattern (`spriteFrameSize` for source dimensions, separate `size` for display) — identical class hierarchy, mid-water spawn logic from `ButterflyFish`.

**Why:** All three existing fish types use this two-layer hierarchy (`CatchableFish → EnemyWithAnimation`). The Crab pattern handles source-frame ≠ display-size (needed here because the Fish_4 frames are 452×437 px source but displayed at 124×124 px). Reusing both patterns keeps the delta minimal.

## Context for Implementer

**Spritesheet layout:** The Fish_4 assets are 30 individual PNGs (not a spritesheet). Task 1 builds the spritesheet with Pillow. Canonical cell size: **452×437 px** (the die-frame size). Move frames (423×336) are center-padded with transparency. Row 0 = move (swim), Row 1 = die (captured). `EnemyWithAnimation.drawCaptured()` picks row 1 via `dieFrameY=1`.

**`spriteFrameSize` convention** (confirmed against Crab pattern): `Size(h, w)` constructor stores h→`_h`, w→`_w`. `getWidth()` returns `_w`. So `new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH)` = `new Size(437, 452)` → `getWidth()=452` (horizontal stride = frame width ✓), `getHeight()=437` (vertical stride = frame height ✓). This is the same convention as all existing enemies.

**`maxFrameX=10`:** `EnemyWithAnimation.updateCaptured()` and `update()` both use `if (this._frameX < this._maxFrameX - 1)` — the guard is `< maxFrameX-1`, so frames cycle 0..9 when maxFrameX=10. Correct for a 10-frame animation.

**`EnemyFactory`** uses `document.getElementById(...)` inside the constructor — the `<img>` tag in `main.html` must be present before the factory constructs. All existing enemies follow this pattern.

## Assumptions

- Fish_4 sprite faces RIGHT by default (same as Crab). If it faces left, flip the `flipX` condition in `LionFish.draw()`. — Tasks 3 and 5 depend on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pillow not installed on dev machine | Low | Blocks Task 1 | Task 1 script includes a `pip install Pillow` guard |
| Sprite actually faces left | Low | Wrong flip direction | `// sprite faces right; flip when going left` comment in LionFish.draw() — trivial one-line fix after visual check |

## Progress Tracking

- [x] Task 1: Generate lion_fish_sprite.png spritesheet
- [x] Task 2: Add LionFish constants and fight spec to constants.js
- [x] Task 3: Move randomSpawnX to CatchableFish; create src/LionFish.js
- [x] Task 4: Wire into main.html, index.js, EnemyFactory, Game.js
- [x] Task 5: Add lionfish.test.js unit tests

## Implementation Tasks

### Task 1: Generate lion_fish_sprite.png spritesheet

**Objective:** Run a Python script to stitch the 20 individual Fish_4 PNGs (10 move + 10 die) into a single spritesheet at 4520×874 px (10 columns × 2 rows, each cell 452×437). Move frames (423×336) are center-padded with transparency to fill the 452×437 cell. Output saved to `images/fishes/lion_fish_sprite.png` (the `images/fishes/` directory already exists).

**Files:**

- Create: `images/fishes/lion_fish_sprite.png` (binary asset, committed to repo)

**Key Decisions / Notes:**

- Cell size: 452×437 (max of die-frame 452×437 and move-frame 423×336). Move frames are center-padded: x-offset = `(452-423)//2 = 14`, y-offset = `(437-336)//2 = 50`.
- Row 0 = move (swim animation), Row 1 = die (captured animation) — matches `dieFrameY=1` in Task 2.
- Attack frames (`Fish_attack_4_*.png`) are NOT included — no attack state in the game.
- Script to run from repo root (copy-paste as-is):
  ```python
  # pip install Pillow  (if not already installed)
  from PIL import Image, UnidentifiedImageError
  import os

  SRC = '/home/smarcet/Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Fish_4'
  FW, FH = 452, 437   # canonical cell size (die-frame dimensions)
  N = 10              # frames per row

  # Pre-flight: assert expected input dimensions
  m0 = Image.open(f'{SRC}/Fish_move_4_000.png'); assert m0.size == (423, 336), f'Move frame wrong size: {m0.size}'
  d0 = Image.open(f'{SRC}/Fish_die_4_000.png');  assert d0.size == (452, 437), f'Die frame wrong size: {d0.size}'
  print('Input dims OK')

  sheet = Image.new('RGBA', (FW * N, FH * 2), (0, 0, 0, 0))
  for i in range(N):
      move = Image.open(f'{SRC}/Fish_move_4_{i:03d}.png').convert('RGBA')
      die  = Image.open(f'{SRC}/Fish_die_4_{i:03d}.png').convert('RGBA')
      cell_m = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_m.paste(move, ((FW - move.width) // 2, (FH - move.height) // 2))
      cell_d = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_d.paste(die, ((FW - die.width) // 2, (FH - die.height) // 2))
      sheet.paste(cell_m, (i * FW, 0))
      sheet.paste(cell_d, (i * FW, FH))

  os.makedirs('images/fishes', exist_ok=True)
  sheet.save('images/fishes/lion_fish_sprite.png')
  print('Spritesheet saved:', sheet.size)
  ```

**Definition of Done:**

- [ ] `images/fishes/lion_fish_sprite.png` exists with dimensions exactly 4520×874 px.
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/fishes/lion_fish_sprite.png'); assert img.size == (4520, 874), img.size; print('OK', img.size)"`

---

### Task 2: Add LionFish constants and fight spec to constants.js

**Objective:** Add all tuneable values for the LionFish to `src/constants.js` — sprite source dimensions, enemy type string, drift speed, and fight spec — following the same naming conventions as the existing CRAB and FISH constants.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- New constants (add near existing CRAB_* block):
  - `LION_FISH_FRAME_WIDTH = 452` (spritesheet cell width = horizontal stride per frame)
  - `LION_FISH_FRAME_HEIGHT = 437` (spritesheet cell height = vertical stride per row)
  - `LION_FISH_MAX_FRAME_X = 10` (10 frames per row; guard in EnemyWithAnimation is `< maxFrameX-1`, so 10 → frames 0-9 ✓)
  - `LION_FISH_DIE_FRAME_Y = 1` (row index of die animation — row 0 = move, row 1 = die)
  - `LION_FISH_DRIFT_SPEED = 2.0` (px/tick — between butterfly_fish 1.5 and crab 4.0)
  - `ENEMY_TYPE_LION_FISH = 'lion_fish'` (add near other ENEMY_TYPE_* constants)
- Add to `FISH_SPECS`: `lion_fish: { strength: 15, escape_rate: 2.5 }`
- Export all new constants in the `module.exports` block, grouped with existing CRAB/FISH constants.

**Definition of Done:**

- [ ] All 6 constants plus `ENEMY_TYPE_LION_FISH` exported from `src/constants.js`.
- [ ] `FISH_SPECS['lion_fish']` has `strength: 15` and `escape_rate: 2.5`.
- [ ] Verify: `node -e "const c=require('./src/constants'); console.log(c.LION_FISH_FRAME_WIDTH, c.LION_FISH_DRIFT_SPEED, c.FISH_SPECS['lion_fish'])"`

---

### Task 3: Move randomSpawnX to CatchableFish; create src/LionFish.js

**Objective:** Add a shared `static randomSpawnX(canvasWidth, fishWidth, rng = Math.random)` to `CatchableFish` (eliminating the duplication between ButterflyFish and the new LionFish). Remove the now-redundant override from `ButterflyFish`. Then create `LionFish` — a mid-water `CatchableFish` that reads fight spec from `FISH_SPECS['lion_fish']`, uses the `spriteFrameSize` pattern for scaled source drawing, and defines only `randomSpawnY` as a species-specific static method.

**Files:**

- Modify: `src/CatchableFish.js`
- Modify: `src/ButterflyFish.js` (delete its `randomSpawnX` override — inherited from CatchableFish)
- Create: `src/LionFish.js`

**Key Decisions / Notes:**

- `CatchableFish` gains exactly one static method:
  ```js
  static randomSpawnX(canvasWidth, fishWidth, rng = Math.random) {
    return rng() * (canvasWidth - fishWidth);
  }
  ```
  Remove the identical method from `ButterflyFish`. All tests that call `ButterflyFish.randomSpawnX(...)` continue working via inheritance.

- `LionFish` constructor signature (identical to Crab):
  ```js
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize)
  ```
  Sets: `_sw = spriteFrameSize.getWidth()`, `_sh = spriteFrameSize.getHeight()`, `_staggerFrame = ANIM_STAGGER_SLOW`, `_driftSpeed = LION_FISH_DRIFT_SPEED`, `_strength = FISH_SPECS['lion_fish'].strength`, `_escapeRate = FISH_SPECS['lion_fish'].escape_rate`.

- Direction bootstrap (in `update()` and `captured()`): same pattern as `ButterflyFish` — set on first frame based on `x < canvasWidth/2`.

- `draw()` flip logic (sprite faces RIGHT — same as Crab):
  ```js
  const flipX = this._direction === -1 ? -1 : 1; // sprite faces right; flip when going left
  ```
  Full draw: `ctx.save() → translate(cx, cy) → scale(flipX, 1) → drawImage(image, frameX*sw, frameY*sh, sw, sh, -w/2, -h/2, w, h) → restore()`

- `_drawCapturedSprite(dx, dy, w, h)` (same as Crab):
  ```js
  this._ctx.drawImage(this._image, this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh, dx, dy, w, h);
  ```

- `static randomSpawnY(canvasHeight, fishHeight, rng = Math.random)`: spawns between `WATER_SURFACE_Y` and `canvasHeight * 0.7 - fishHeight` (mid-water, not seabed).

- CommonJS guard: `if (typeof module !== 'undefined' && module.exports) { module.exports = { LionFish }; }`

**Definition of Done:**

- [ ] `LionFish` constructor sets `_strength = 15`, `_escapeRate = 2.5`, `_staggerFrame = 6`.
- [ ] `getFightSpec()` returns `{ strength: 15, escapeRate: 2.5 }` (inherited from CatchableFish).
- [ ] `CatchableFish.randomSpawnX` exists as a static method; `ButterflyFish.randomSpawnX` is removed (ButterflyFish inherits it).
- [ ] `LionFish.randomSpawnY` returns a value in `[WATER_SURFACE_Y, canvasHeight * 0.7 - fishHeight]`.
- [ ] Verify: `npm test -- --silent` — existing 108 tests pass (ButterflyFish.randomSpawnX tests still work via inheritance).

---

### Task 4: Wire into main.html, index.js, EnemyFactory, and Game.js

**Objective:** Register the LionFish in every entry point that needs to know about it: the HTML preload tag, the CommonJS test harness, the factory, and the game's initial spawn list.

**Files:**

- Modify: `main.html`
- Modify: `index.js`
- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`

**Key Decisions / Notes:**

- `main.html`:
  - Add `<img src="images/fishes/lion_fish_sprite.png" id="lion_fish_sprite"/>` after `<img id="crab"/>`.
  - Add `<script src="src/LionFish.js"></script>` after `<script src="src/ButterflyFish.js"></script>`.

- `index.js`: add two lines following the exact ButterflyFish pattern:
  ```js
  const { LionFish } = require('./src/LionFish');   global.LionFish = LionFish;
  // and add LionFish to module.exports
  ```

- `EnemyFactory` constructor — add spec:
  ```js
  this.specs[ENEMY_TYPE_LION_FISH] = {
    image: (typeof document !== 'undefined') ? document.getElementById('lion_fish_sprite') : null,
    size: new Size(124, 124),                                          // display: 124×124 px (near-square, matches 452:437 ratio)
    spriteFrameSize: new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH),  // Size(437,452) → getWidth()=452, getHeight()=437 ✓
    maxFrameX: LION_FISH_MAX_FRAME_X,
    maxFrameY: 1,
    dieFrameX: 0,
    dieFrameY: LION_FISH_DIE_FRAME_Y,
  };
  ```

- `EnemyFactory.createEnemy` — add branch before the final `return new Octopus(...)`:
  ```js
  if (name === ENEMY_TYPE_LION_FISH) {
    return new LionFish(
      game, ctx, spec.size,
      new Point(
        LionFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        LionFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY,
      spec.spriteFrameSize
    );
  }
  ```

- `Game.js` constructor — spawn 2 LionFish after the ButterflyFish loop, before the DiscardedBottle line:
  ```js
  for (let i = 0; i < 2; i++) {
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_LION_FISH, this, ctx));
  }
  ```

**Definition of Done:**

- [ ] `main.html` loads `images/fishes/lion_fish_sprite.png` and `src/LionFish.js`.
- [ ] `index.js` exports `LionFish`: `node -e "const { LionFish } = require('./index.js'); console.log(typeof LionFish)"` prints `function`.
- [ ] `EnemyFactory.createEnemy(ENEMY_TYPE_LION_FISH, game, ctx)` returns a `LionFish` instance.
- [ ] Game spawns 2 LionFish on startup.
- [ ] Verify: `npm test -- --silent`

---

### Task 5: Add lionfish.test.js unit tests

**Objective:** Unit test the LionFish behavioural contract: class hierarchy, fight spec, animation cadence, direction flip, and spawn bounds — following the exact structure of `butterflyfish.test.js` and `crab.test.js`.

**Files:**

- Create: `__tests__/lionfish.test.js`

**Key Decisions / Notes:**

- Import: `const { Size, Point, CatchableFish, LionFish } = require('../index.js');`
- `makeLionFish(startX = 0)` factory:
  ```js
  new LionFish(
    mockGame, mockCtx,
    new Size(124, 124),           // display size
    new Point(startX, 400),
    mockImage,
    10, 1, 0, 1,                  // maxFrameX, maxFrameY, dieFrameX, dieFrameY
    new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH)  // spriteFrameSize: Size(437,452)
  )
  ```
  (Note: `new Size(437, 452)` → `getWidth()=452, getHeight()=437` — correct source frame dimensions.)
- Test groups (4 describe blocks):
  1. **Class hierarchy** — `instanceof CatchableFish`; `getFightSpec()` returns `{ strength: 15, escapeRate: 2.5 }`.
  2. **Animation cadence** — `_frameX` stays 0 for first 5 updates, becomes 1 on 6th (staggerFrame=6).
  3. **Direction flip** — `draw()` calls `ctx.scale(-1, 1)` when `_direction === -1` (going left, sprite faces right); `ctx.scale(1, 1)` when `_direction === 1`.
  4. **Spawn bounds** — `randomSpawnY` returns value in `[WATER_SURFACE_Y, canvasHeight*0.7 - fishHeight]`; `randomSpawnX` (inherited from CatchableFish) returns value in `[0, canvasWidth - fishWidth]`.
- Mock `ctx` must include `shadowColor`, `shadowBlur` setters (used by `drawCaptured()` glow):
  ```js
  const mockCtx = {
    drawImage: () => {}, beginPath: () => {}, stroke: () => {},
    fillRect: () => {}, fillText: () => {}, save: () => {}, restore: () => {},
    translate: () => {}, rotate: () => {}, scale: jest.fn(),
    setLineDash: () => {},
    set shadowColor(_) {}, set shadowBlur(_) {}, set globalAlpha(_) {},
  };
  ```

**Definition of Done:**

- [ ] All new lionfish tests pass with correct assertions.
- [ ] Full suite `npm test -- --silent` reports 0 failures across all 9 test suites + new suite.
- [ ] Verify: `npm test -- --silent`

## E2E Test Scenarios

### TS-001: LionFish appears in the ocean and is catchable
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8000/main.html`
**Mapped Tasks:** Tasks 3, 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Ocean scene loads; 2 LionFish visible swimming at mid-water depth |
| 2 | Observe LionFish sprite | Animated fish (not blank/broken image) swimming left or right, roughly 124×124 px |
| 3 | Press Space to cast hook toward a LionFish | Hook descends |
| 4 | Wait for hook to collide with a LionFish | Hook attaches; LionFish enters captured state with gold glow border |
| 5 | Tap Space repeatedly to reel in | LionFish reels up with die-row animation (row 1) and gold→red glow |
| 6 | Let escape progress build without pressing Space | Glow turns red; fish escapes with particle burst |
