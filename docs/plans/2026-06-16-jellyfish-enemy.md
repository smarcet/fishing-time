# JellyFish Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `JellyFish` enemy (extends `CatchableFish`) with fight spec `{ strength: 5, escape_rate: 1.0 }`, score `-25` (penalty), animated from a generated spritesheet stitched from the 20 `Jellyfish_3` individual PNGs (10 move + 10 die), and register it as `#jelly_fish_sprite` with `display: none` in `main.css`.

## Approach

**Chosen:** Extend `CatchableFish` following the `ClownFish`/`LionFish` `spriteFrameSize` pattern — same two-layer hierarchy, same constructor signature, separate source-stride (`_sw`/`_sh`) vs display size.

**Why:** All existing fish enemies use this pattern; it decouples source-frame cell dimensions (221×294 px) from display size (80×106 px) without changing the base class. Reusing the pattern keeps the delta minimal and the verification scope bounded.

## Context for Implementer

**Sprite dimensions (measured):**
- Move frames (`Jellyfish_move_3_000..009.png`): 196×294 px
- Die frames (`Jellyfish_die_3_000..009.png`): 221×293 px
- Canonical cell (max of both): **221×294 px** (JELLY_FISH_FRAME_WIDTH=221, JELLY_FISH_FRAME_HEIGHT=294)

**Spritesheet layout:** Row 0 = move (swim), Row 1 = die (captured). Total: 2210×588 px (10 cols × 2 rows).
- Move frames: x-pad = (221-196)//2 = 12 px, y-pad = 0 (heights match)
- Die frames: x-pad = 0, y-pad = (294-293)//2 = 0 (heights differ by 1; floor = 0, top-aligned)

**`Size(h, w)` constructor convention** (confirmed in existing code): `new Size(JELLY_FISH_FRAME_HEIGHT, JELLY_FISH_FRAME_WIDTH)` = `new Size(294, 221)` → `getWidth()=221`, `getHeight()=294`. This is the consistent convention for `spriteFrameSize` across all enemies.

**Direction flip:** Jellyfish_3 sprite appears to be nearly symmetrical. Following `ClownFish`/`LionFish` convention (left-facing): `flipX = this._direction === 1 ? -1 : 1`. If visual verification shows backwards drift, invert to `direction === -1 ? -1 : 1` (Crab convention).

**SCORE_MAP key source:** `Hook.js:94` dispatches `enemyCaptured` with `enemyType: this._catch.constructor.name`. So `SCORE_MAP` is keyed by the JS class name — `JellyFish: -25` is correct (not snake_case). Negative score means catching a jellyfish is a penalty (like DiscardedBottle).

**Current test baseline:** 20 suites, 250 tests.

## Assumptions

- JellyFish_3 sprite faces LEFT (same as ClownFish/LionFish). If visual check shows backwards motion, flip to `direction === -1 ? -1 : 1`. — Task 3 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sprite faces right (not left) | Low | Backwards swim until fixed | Flip assumption documented; trivial 1-line fix after E2E visual check |
| Pillow not installed | Low | Blocks Task 1 | Task 1 script includes install note |

## Progress Tracking

- [x] Task 1: Generate jelly_fish_sprite.png spritesheet
- [x] Task 2: Add JellyFish constants and fight spec to constants.js
- [x] Task 3: Create src/JellyFish.js
- [x] Task 4: Wire into main.html, main.css, index.js, EnemyFactory, Game.js, ScoreSystem.js
- [x] Task 5: Add jellyfish.test.js unit tests
- [x] Task 6: Create ADR 0020-jellyfish-enemy.md

## Implementation Tasks

### Task 1: Generate jelly_fish_sprite.png spritesheet

**Objective:** Run a Python script to stitch the 20 individual Jellyfish_3 PNGs into a single spritesheet at 2210×588 px (10 columns × 2 rows, each cell 221×294). Move frames (196×294) are center-padded horizontally (+12 px each side); die frames (221×293) are top-aligned with no padding. Output saved to `images/fishes/jelly_fish_sprite.png`.

**Files:**

- Create: `images/fishes/jelly_fish_sprite.png` (binary asset)

**Key Decisions / Notes:**

- Cell size: 221×294 (JELLY_FISH_FRAME_WIDTH × JELLY_FISH_FRAME_HEIGHT)
- Row 0 = move (swim animation), Row 1 = die (captured) — matches `dieFrameY=1`
- Script to run from repo root:
  ```python
  # pip install Pillow  (if needed)
  from PIL import Image
  import glob, os

  SRC = '/home/smarcet/Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Jellyfish_3'
  FW, FH = 221, 294  # canonical cell: max(move_w=196, die_w=221) x max(move_h=294, die_h=293)
  N = 10

  # Pre-flight: verify source files present
  assert len(glob.glob(f'{SRC}/Jellyfish_move_3_*.png')) == N, 'Missing move frames'
  assert len(glob.glob(f'{SRC}/Jellyfish_die_3_*.png'))  == N, 'Missing die frames'

  sheet = Image.new('RGBA', (FW * N, FH * 2), (0, 0, 0, 0))
  for i in range(N):
      move = Image.open(f'{SRC}/Jellyfish_move_3_{i:03d}.png').convert('RGBA')
      die  = Image.open(f'{SRC}/Jellyfish_die_3_{i:03d}.png').convert('RGBA')
      cell_m = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_m.paste(move, ((FW - move.width) // 2, 0))   # center horizontally, top-align
      cell_d = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
      cell_d.paste(die, (0, 0))                          # die frames fill full width
      sheet.paste(cell_m, (i * FW, 0))
      sheet.paste(cell_d, (i * FW, FH))

  os.makedirs('images/fishes', exist_ok=True)
  sheet.save('images/fishes/jelly_fish_sprite.png')
  print('Saved:', sheet.size)
  ```

**Definition of Done:**

- [ ] `images/fishes/jelly_fish_sprite.png` exists with dimensions exactly 2210×588 px.
- [ ] Verify: `python3 -c "from PIL import Image; img=Image.open('images/fishes/jelly_fish_sprite.png'); assert img.size == (2210, 588), img.size; print('OK', img.size)"`

---

### Task 2: Add JellyFish constants and fight spec to constants.js

**Objective:** Add all tuneable values for JellyFish to `src/constants.js` — sprite source dimensions, enemy type string, drift speed, and fight spec — grouped with the existing CLOWN_FISH_* block.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- New constants (add after CLOWN_FISH_* block):
  - `JELLY_FISH_FRAME_WIDTH  = 221`
  - `JELLY_FISH_FRAME_HEIGHT = 294`
  - `JELLY_FISH_MAX_FRAME_X  = 10`
  - `JELLY_FISH_DIE_FRAME_Y  = 1`
  - `JELLY_FISH_DRIFT_SPEED  = 0.8`   — jellyfish drift slowly (< ButterflyFish 1.5)
  - `ENEMY_TYPE_JELLY_FISH   = 'jelly_fish'` (add near other ENEMY_TYPE_* constants)
- Add to `FISH_SPECS`: `jelly_fish: { strength: 5, escape_rate: 1.0 }`
- Export all new constants in the `module.exports` block.

**Definition of Done:**

- [ ] All 5 constants plus `ENEMY_TYPE_JELLY_FISH` exported from `src/constants.js`.
- [ ] `FISH_SPECS['jelly_fish']` has `strength: 5` and `escape_rate: 1.0`.
- [ ] Verify: `node -e "const c=require('./src/constants'); console.log(c.JELLY_FISH_FRAME_WIDTH, c.JELLY_FISH_DRIFT_SPEED, c.FISH_SPECS['jelly_fish'])"`

---

### Task 3: Create src/JellyFish.js

**Objective:** Create `JellyFish` — a `CatchableFish` that reads fight spec from `FISH_SPECS['jelly_fish']`, uses the `spriteFrameSize` pattern for scaled source drawing, drifts slowly across the full water column, and matches the `ClownFish` class structure exactly.

**Files:**

- Create: `src/JellyFish.js`

**Key Decisions / Notes:**

- Constructor signature identical to `ClownFish`:
  ```js
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize)
  ```
  Sets: `_sw = spriteFrameSize.getWidth()`, `_sh = spriteFrameSize.getHeight()`, `_staggerFrame = ANIM_STAGGER_SLOW`, `_driftSpeed = JELLY_FISH_DRIFT_SPEED`, `_strength = FISH_SPECS['jelly_fish'].strength`, `_escapeRate = FISH_SPECS['jelly_fish'].escape_rate`.

- `update()` — direction bootstrap same as ClownFish (set on first frame from x position).

- `captured(hook)` — same pattern as ClownFish: `super.captured(hook)` then direction bootstrap.

- `_drawCapturedSprite(dx, dy, w, h)` — identical pattern to ClownFish:
  ```js
  this._ctx.drawImage(this._image,
    this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh,
    dx, dy, w, h);
  ```

- `draw()` flip logic (sprite faces LEFT — same as ClownFish):
  ```js
  const flipX = this._direction === 1 ? -1 : 1;
  ```
  Full draw: `ctx.save() → translate(cx, cy) → scale(flipX, 1) → drawImage(…) → restore()`

- `static randomSpawnY(canvasHeight, fishHeight, rng = Math.random)`:
  Spawn across mid-water column (WATER_SURFACE_Y to 80% canvas height — jellyfish roam freely):
  ```js
  const minY = WATER_SURFACE_Y;
  const maxY = Math.max(minY, canvasHeight * 0.8 - fishHeight);
  return minY + rng() * (maxY - minY);
  ```

- CommonJS guard: `if (typeof module !== 'undefined' && module.exports) { module.exports = { JellyFish }; }`

**Definition of Done:**

- [ ] `JellyFish` constructor sets `_strength = 5`, `_escapeRate = 1.0`, `_staggerFrame = 6`, `_driftSpeed = 0.8`.
- [ ] `getFightSpec()` returns `{ strength: 5, escapeRate: 1.0 }` (inherited from CatchableFish).
- [ ] `JellyFish.randomSpawnY` returns value in `[WATER_SURFACE_Y, canvasHeight * 0.8 - fishHeight]`.
- [ ] Verify: `npm test -- --silent` (250 tests still pass; JellyFish file exists but not yet tested — Task 5 adds tests).

---

### Task 4: Wire into main.html, main.css, index.js, EnemyFactory, Game.js, ScoreSystem.js

**Objective:** Register JellyFish in every entry point: HTML preload, CSS display:none, CommonJS harness, factory, game spawn list, and score map.

**Files:**

- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`
- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`
- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- `main.html`:
  - Add `<img src="images/fishes/jelly_fish_sprite.png" id="jelly_fish_sprite"/>` after the `clown_fish_sprite` line.
  - Add `<script src="src/JellyFish.js"></script>` after `<script src="src/ClownFish.js"></script>`.

- `main.css`: add `#jelly_fish_sprite` to the existing grouped `display: none` selector (append to the last selector line before `{`). Note: `#butterfly_fish_sprite` is already absent from this list (pre-existing gap, out of scope) — do not treat the existing list as authoritative for all sprites.

- `index.js`: add after the ClownFish line:
  ```js
  const { JellyFish } = require('./src/JellyFish'); global.JellyFish = JellyFish;
  ```
  and add `JellyFish` to `module.exports`.

- `EnemyFactory.js` — add two DOM_ID and display constants near ClownFish block:
  ```js
  const DOM_ID_JELLY_FISH = 'jelly_fish_sprite';
  const JELLY_FISH_DISPLAY_H = 106;
  const JELLY_FISH_DISPLAY_W = 80;
  ```
  Add spec (after CLOWN_FISH spec):
  ```js
  this.specs[ENEMY_TYPE_JELLY_FISH] = {
    image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_JELLY_FISH) : null,
    size: new Size(JELLY_FISH_DISPLAY_H, JELLY_FISH_DISPLAY_W),
    spriteFrameSize: new Size(JELLY_FISH_FRAME_HEIGHT, JELLY_FISH_FRAME_WIDTH),
    maxFrameX: JELLY_FISH_MAX_FRAME_X,
    maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
    dieFrameX: SPRITE_DIE_FRAME_X,
    dieFrameY: JELLY_FISH_DIE_FRAME_Y,
  };
  ```
  Add `createEnemy` branch (after ClownFish branch):
  ```js
  if (name === ENEMY_TYPE_JELLY_FISH) {
    return new JellyFish(
      game, ctx, spec.size,
      new Point(
        JellyFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        JellyFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY,
      spec.spriteFrameSize
    );
  }
  ```

- `Game.js` — add after ClownFish spawn block:
  ```js
  const ENEMY_COUNT_JELLY_FISH = 3;
  // ...
  for (let i = 0; i < ENEMY_COUNT_JELLY_FISH; i++) {
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_JELLY_FISH, this, ctx));
  }
  ```
  Import `ENEMY_TYPE_JELLY_FISH` in the destructured require at the top.

- `ScoreSystem.js` — add to `SCORE_MAP`:
  ```js
  JellyFish: -25,
  ```
  Key is `JellyFish` because `Hook.js:94` dispatches `enemyType: this._catch.constructor.name`, and `JellyFish.constructor.name === 'JellyFish'`.

- `EnemyFactory.js` display size note: `new Size(JELLY_FISH_DISPLAY_H, JELLY_FISH_DISPLAY_W)` = `new Size(106, 80)` — Size(h,w) convention → `getWidth()=80, getHeight()=106`.

**Definition of Done:**

- [ ] `main.html` loads `images/fishes/jelly_fish_sprite.png` and `src/JellyFish.js`.
- [ ] `main.css` grouped selector includes `#jelly_fish_sprite`: `grep '#jelly_fish_sprite' main.css` returns a match inside the selector block.
- [ ] `node -e "const { JellyFish } = require('./index.js'); console.log(typeof JellyFish)"` prints `function`.
- [ ] `node -e "const {SCORE_MAP}=require('./src/ScoreSystem'); console.log(SCORE_MAP.JellyFish)"` prints `-25`.
- [ ] Verify: `npm test -- --silent`

---

### Task 5: Add jellyfish.test.js unit tests

**Objective:** Unit test the JellyFish behavioural contract: class hierarchy, fight spec, animation cadence, direction flip, spawn bounds, and score map entry — following the structure of `clownfish.test.js`.

**Files:**

- Create: `__tests__/jellyfish.test.js`

**Key Decisions / Notes:**

- Import: `const { Size, Point, CatchableFish, JellyFish, SCORE_MAP } = require('../index.js');`
- `makeJellyFish(startX = 0)` factory:
  ```js
  new JellyFish(
    mockGame, mockCtx,
    new Size(106, 80),
    new Point(startX, 400),
    mockImage,
    10, 1, 0, 1,
    new Size(294, 221)   // spriteFrameSize: Size(h, w) → getWidth()=221, getHeight()=294
  )
  ```
- Test groups (5 describe blocks):
  1. **Class hierarchy** — `instanceof CatchableFish`; `getFightSpec()` returns `{ strength: 5, escapeRate: 1.0 }`.
  2. **Animation cadence** — `_frameX` stays 0 for first 5 updates, becomes 1 on 6th (staggerFrame=6).
  3. **Direction flip** — `draw()` calls `ctx.scale(-1, 1)` when `_direction === 1` (going right, sprite faces left); `ctx.scale(1, 1)` when `_direction === -1`.
  4. **Spawn bounds** — `randomSpawnY` returns value in `[300, canvasHeight*0.8 - fishHeight]`; `randomSpawnX` (inherited) returns value in `[0, canvasWidth - fishWidth]`.
  5. **Score map** — `SCORE_MAP.JellyFish === -25`.
- Mock `ctx` must include `shadowColor`, `shadowBlur` setters (same as `clownfish.test.js`).

**Definition of Done:**

- [ ] All JellyFish tests pass with correct assertions (5 describe blocks, 8 new test cases: 2+1+2+2+1).
- [ ] Full suite `npm test -- --silent` reports 0 failures: 21 suites, ≥258 tests (250 baseline + 8 new).
- [ ] Verify: `npm test -- --silent`

---

### Task 6: Create ADR 0020-jellyfish-enemy.md

**Objective:** Document the JellyFish design decisions in `docs/adr/0020-jellyfish-enemy.md` following the existing ADR format — covering sprite stitching, the penalty score rationale, fight spec tier, and spawn zone choice.

**Files:**

- Create: `docs/adr/0020-jellyfish-enemy.md`

**Key Decisions / Notes:**

- ADR sections: Context, Decisions (numbered), Consequences.
- Decisions to document:
  1. Spritesheet layout: 10 cols × 2 rows at 221×294 canonical cell (move frames center-padded 12 px).
  2. Score -25 (penalty) — JellyFish is a hazard/nuisance, similar rationale to DiscardedBottle.
  3. Fight spec `strength=5, escape_rate=1.0` — easy to land (same strength as ButterflyFish), slowest escape bar of all fish.
  4. Spawn zone: WATER_SURFACE_Y to 80% canvas height — jellyfish float throughout the water column.
  5. Sprite faces LEFT (ClownFish/LionFish convention): `flipX = direction === 1 ? -1 : 1`.
  6. `Trivial:` — This task has no test; it is documentation only.

**Definition of Done:**

- [ ] `docs/adr/0020-jellyfish-enemy.md` exists and follows the ADR format (Context / Decisions / Consequences).
- [ ] Verify: `ls docs/adr/0020-jellyfish-enemy.md`

## E2E Test Scenarios

### TS-001: JellyFish appears in the ocean and is catchable (with penalty score)
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8000/main.html`
**Mapped Tasks:** Tasks 3, 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Ocean scene loads; 3 JellyFish visible drifting at various water-column depths |
| 2 | Observe JellyFish sprite | Animated jellyfish (not blank/broken) drifting slowly, ~80×106 px |
| 3 | Note current score (top-right) | Score displayed, initially 0 |
| 4 | Cast hook (Space) toward a JellyFish | Hook descends |
| 5 | Wait for hook to collide with JellyFish | Hook attaches; JellyFish enters captured state with glow border |
| 6 | Reel in completely | JellyFish caught; score decreases by 25 (e.g. 0 → -25) |
