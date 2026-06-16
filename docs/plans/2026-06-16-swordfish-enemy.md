# SwordFish Enemy Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `SwordFish` enemy (extends `CatchableFish`) that appears in deep water, assembled from 16 swim + 16 rest keyframe PNGs into a 2-row spritesheet, with `sword_fish: { strength: 88, escape_rate: 3.5 }` fight spec, full EnemyFactory/Game.js wiring, unit tests, and ADR-0013.

## Approach

**Chosen:** Follow the `LionFish`/`HammerHeadShark` `spriteFrameSize` pattern exactly — `SwordFish extends CatchableFish`, overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields from `spriteFrameSize`, inherits all capture animation logic for free.
**Why:** Zero base-class changes, consistent with the two most recently added enemies, and the 2-row spritesheet (swim row 0 + rest row 1) gives a proper captured-state animation at no extra runtime cost.

## Context for Implementer

**Spritesheet layout** (assembled in Task 1):
- Source frames: `swim/keyframes/` — 16 PNGs at 1033×413 px each
- Source frames: `rest/keyframes/` — 16 PNGs at 1033×416 px each
- Canonical cell = **1033×416 px** (rest-frame height is the larger of the two)
- Swim frames are center-padded 3 px vertically (2 px top, 1 px bottom) to reach 416 px
- Final spritesheet: **16528×832 px** (16 cols × 2 rows)
- Row 0 = swim (move animation), Row 1 = rest (captured/die animation)
- `maxFrameX=16, maxFrameY=2, dieFrameX=0, dieFrameY=1`

**`Size(h, w)` convention** (project-wide): `new Size(125, 310)` means height=125, width=310.

## Runtime Environment

- Start: `python3 -m http.server 8000`
- URL: `http://localhost:8000/main.html`
- Tests: `npm test`

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Swim/rest frame height mismatch causes misaligned rows | Low | High | Task 1 PIL script explicitly pads swim frames to 416 px; Task 1 DoD checks assembled dimensions |
| Sprite faces RIGHT instead of assumed LEFT | Medium | Low | ADR documents assumption; flip condition can be reversed in one line if visual check fails |

## E2E Test Scenarios

### TS-001: SwordFish appears in game and is catchable
**Priority:** Critical
**Preconditions:** Server running at port 8000
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Canvas loads, ocean scene visible |
| 2 | Observe deep-water zone (below mid-water) | SwordFish sprite visible, larger than LionFish (310×125 vs 124×124) |
| 3 | Verify animation plays | Fish frames cycle visibly (not stuck on frame 0) |
| 4 | Observe fish drifting | Fish moves horizontally and flips direction at edges |

## Progress Tracking

- [x] Task 1: Assemble swordfish_sprite.png from swim + rest keyframes
- [x] Task 2: Add SwordFish constants to src/constants.js
- [x] Task 3: Implement SwordFish class (TDD: RED → GREEN)
- [x] Task 4: Wire into EnemyFactory, Game.js, main.html, main.css, index.js
- [x] Task 5: Expand unit test suite
- [x] Task 6: Write ADR-0013

## Implementation Tasks

---

### Task 1: Assemble swordfish_sprite.png from swim + rest keyframes

**Objective:** Build `images/fishes/swordfish_sprite.png` by stitching 16 swim frames (1033×413 px) and 16 rest frames (1033×416 px) into a 2-row, 16-column spritesheet with canonical cell 1033×416. Swim frames are center-padded 3 px vertically (2 top, 1 bottom). Output: 16528×832 px.

**Files:**

- Create: `images/fishes/swordfish_sprite.png`

**Key Decisions / Notes:**

- Run this Python PIL script (do NOT commit the script itself):
```python
from PIL import Image
import os

SWIM_DIR  = '/home/smarcet/Downloads/game_assets/game_assets/Animatedswordfish--13445c9v6r7y9r3e0a/animations/swim/keyframes/'
REST_DIR  = '/home/smarcet/Downloads/game_assets/game_assets/Animatedswordfish--13445c9v6r7y9r3e0a/animations/rest/keyframes/'
OUT_PATH  = '/home/smarcet/git/personal/fishing-time/images/fishes/swordfish_sprite.png'

CELL_W, CELL_H = 1033, 416
COLS, ROWS = 16, 2
PAD_TOP, PAD_BOT = 2, 1  # swim frames are 413 px tall; pad to 416

swim_files = sorted(f for f in os.listdir(SWIM_DIR) if f.endswith('.png'))
rest_files = sorted(f for f in os.listdir(REST_DIR) if f.endswith('.png'))
assert len(swim_files) == 16 and len(rest_files) == 16

sheet = Image.new('RGBA', (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))

for i, fname in enumerate(swim_files):
    frame = Image.open(SWIM_DIR + fname).convert('RGBA')
    assert frame.size == (1033, 413), f'Swim frame {fname}: expected (1033,413) got {frame.size}'
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.paste(frame, (0, PAD_TOP))
    sheet.paste(cell, (i * CELL_W, 0))

for i, fname in enumerate(rest_files):
    frame = Image.open(REST_DIR + fname).convert('RGBA')
    assert frame.size == (1033, 416), f'Rest frame {fname}: expected (1033,416) got {frame.size}'
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.paste(frame, (0, 0))
    sheet.paste(cell, (i * CELL_W, CELL_H))

sheet.save(OUT_PATH, 'PNG')
print('Saved:', sheet.size)
```
- Verify output dimensions = (16528, 832) and file exists before proceeding

**Definition of Done:**

- [ ] `images/fishes/swordfish_sprite.png` exists
- [ ] `python3 -c "from PIL import Image; img=Image.open('images/fishes/swordfish_sprite.png'); assert img.size==(16528,832), img.size; print('OK', img.size)"` passes from repo root

---

### Task 2: Add SwordFish constants to src/constants.js

**Objective:** Add all SwordFish constants (frame dimensions, drift speed, enemy type) and the `sword_fish` FISH_SPECS entry. No production code yet — constants only.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add after the `HAMMERHEAD_SHARK_*` block (around line 50):
  ```js
  const SWORDFISH_FRAME_WIDTH  = 1033;  // px - canonical cell horizontal stride
  const SWORDFISH_FRAME_HEIGHT = 416;   // px - canonical cell vertical stride (rest-frame height)
  const SWORDFISH_MAX_FRAME_X  = 16;    // 16 frames per row
  const SWORDFISH_DIE_FRAME_Y  = 1;     // row 0 = swim, row 1 = rest (captured animation)
  const SWORDFISH_DRIFT_SPEED  = 4.5;   // px/tick - genuinely fastest fish (above crab 4.0)
  ```
- Add `ENEMY_TYPE_SWORDFISH = 'sword_fish'` after `ENEMY_TYPE_HAMMERHEAD_SHARK`
- Add `sword_fish: { strength: 88, escape_rate: 3.5 }` to `FISH_SPECS` after `hammerhead_shark`
- Export all new symbols in `module.exports` (CommonJS block at the bottom)

**Definition of Done:**

- [ ] `SWORDFISH_FRAME_WIDTH`, `SWORDFISH_FRAME_HEIGHT`, `SWORDFISH_MAX_FRAME_X`, `SWORDFISH_DIE_FRAME_Y`, `SWORDFISH_DRIFT_SPEED`, `ENEMY_TYPE_SWORDFISH` declared and exported
- [ ] `FISH_SPECS['sword_fish']` entry present with `strength:88, escape_rate:3.5`
- [ ] Verify: `node -e "const c=require('./src/constants.js'); console.log(c.SWORDFISH_FRAME_WIDTH, c.FISH_SPECS.sword_fish)"` prints `1033 { strength: 88, escape_rate: 3.5 }`

---

### Task 3: Implement SwordFish class (TDD: RED → GREEN)

**Objective:** Create `src/SwordFish.js` using the same `spriteFrameSize`-pattern as `src/LionFish.js` (lines 1-68) and `src/HammerHeadShark.js`. The class handles swim animation, directional drift, deep-water spawn (WATER_SURFACE_Y+80 to canvasH−fishH), and captured-state rendering. TDD: write a failing test first.

**Files:**

- Create: `src/SwordFish.js`
- Create: `__tests__/swordfish.test.js`

**Key Decisions / Notes:**

- **RED**: write `__tests__/swordfish.test.js` with at minimum:
  - `instanceof CatchableFish` assertion
  - `getFightSpec()` returns `{ strength: 88, escapeRate: 3.5 }`
  - Run `npm test -- --testPathPattern=swordfish` → must FAIL (module not found)
- **GREEN**: implement `src/SwordFish.js`:
  ```js
  class SwordFish extends CatchableFish {
    constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
      super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
      this._spriteFrameSize = spriteFrameSize || size;
      this._sw = this._spriteFrameSize.getWidth();   // 1033
      this._sh = this._spriteFrameSize.getHeight();  // 416
      this._staggerFrame = ANIM_STAGGER_SLOW;
      this._driftSpeed   = SWORDFISH_DRIFT_SPEED;
      this._strength     = FISH_SPECS['sword_fish'].strength;
      this._escapeRate   = FISH_SPECS['sword_fish'].escape_rate;
    }
    static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
      const minY = WATER_SURFACE_Y + 100;  // same depth zone as HammerHeadShark
      const maxY = Math.max(minY, canvasHeight - fishHeight);
      return minY + rng() * (maxY - minY);
    }
    update() {
      if (this._direction === null) {
        this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;
        this._speedX = this._direction * this._driftSpeed;
      }
      super.update();
    }
    captured(hook) {
      super.captured(hook);
      if (this._direction === null) {
        this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;
      }
    }
    _drawCapturedSprite(dx, dy, w, h) {
      this._ctx.drawImage(this._image, this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh, dx, dy, w, h);
    }
    draw() {
      const w = this._size.getWidth(), h = this._size.getHeight();
      const dx = this._position.getX(), dy = this._position.getY();
      if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }
      if (this._game.isDebug()) { /* debug overlay same as HammerHeadShark */ }
      // sprite assumed to face LEFT; flip when going right
      const flipX = this._direction === 1 ? -1 : 1;
      this._ctx.save();
      this._ctx.translate(dx + w / 2, dy + h / 2);
      this._ctx.scale(flipX, 1);
      this._ctx.drawImage(this._image, this._frameX * this._sw, this._frameY * this._sh, this._sw, this._sh, -w / 2, -h / 2, w, h);
      this._ctx.restore();
    }
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { SwordFish }; }
  ```
- **`Size(h,w)` convention**: EnemyFactory passes `new Size(SWORDFISH_FRAME_HEIGHT, SWORDFISH_FRAME_WIDTH)` = `new Size(416, 1033)`. So `getHeight()=416=_sh` (vertical stride) and `getWidth()=1033=_sw` (horizontal stride). Swap → every frame renders the wrong column.
- `randomSpawnX` is inherited from `CatchableFish` (same static-method ES6 inheritance as HammerHeadShark — no override needed)
- Display size passed from EnemyFactory: `new Size(125, 310)` (height=125, width=310, ~0.30× of 416×1033)

**Definition of Done:**

- [ ] RED confirmed: `npm test -- --testPathPattern=swordfish` exits non-zero before `src/SwordFish.js` is created
- [ ] `instanceof CatchableFish` passes
- [ ] `getFightSpec()` returns `{ strength: 88, escapeRate: 3.5 }`
- [ ] Verify: `npm test -- --testPathPattern=swordfish -q` passes (GREEN)

---

### Task 4: Wire into EnemyFactory, Game.js, main.html, main.css, index.js

**Objective:** Integrate SwordFish into all five entry points so one instance spawns per game session, the sprite image pre-loads via DOM, and the class is available under Jest.

**Files:**

- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`
- Modify: `main.html`
- Modify: `main.css`
- Modify: `index.js`

**Key Decisions / Notes:**

- **EnemyFactory.js** — add spec and branch (follow `ENEMY_TYPE_HAMMERHEAD_SHARK` block, `src/EnemyFactory.js` lines 45-53 and 95-104):
  ```js
  this.specs[ENEMY_TYPE_SWORDFISH] = {
    image: (typeof document !== 'undefined') ? document.getElementById('swordfish_sprite') : null,
    size: new Size(125, 310),
    spriteFrameSize: new Size(SWORDFISH_FRAME_HEIGHT, SWORDFISH_FRAME_WIDTH),
    maxFrameX: SWORDFISH_MAX_FRAME_X,
    maxFrameY: 1,   // swim animation cycles row 0 only; row 1 accessed via dieFrameY during capture
    dieFrameX: 0,
    dieFrameY: SWORDFISH_DIE_FRAME_Y,
  };
  ```
  and `createEnemy` branch:
  ```js
  if (name === ENEMY_TYPE_SWORDFISH) {
    return new SwordFish(game, ctx, spec.size,
      new Point(SwordFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
                SwordFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize);
  }
  ```
- **Game.js** — push after hammerhead line (line 33):
  `this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_SWORDFISH, this, ctx));`
- **main.html** — add script after HammerHeadShark (line 21):
  `<script src="src/SwordFish.js"></script>`
  Add image before `</body>`:
  `<img src="images/fishes/swordfish_sprite.png" id="swordfish_sprite"/>`
- **main.css** — append `#swordfish_sprite` to the display:none selector (line 20-22)
- **index.js** — add require+global line after HammerHeadShark (line 18):
  `const { SwordFish } = require('./src/SwordFish'); global.SwordFish = SwordFish;`
  Add `SwordFish,` to the `module.exports` object at the bottom (alongside `HammerHeadShark`)

**Definition of Done:**

- [ ] `npm test` full suite passes (all tests green)
- [ ] Browser: TS-001 passes — SwordFish visible in deep water at http://localhost:8000/main.html

---

### Task 5: Expand unit test suite

**Objective:** Add animation-cadence, direction-flip, and spawn-bounds tests to `__tests__/swordfish.test.js`, following the same 4-describe structure as `__tests__/hammerheadshark.test.js`.

**Files:**

- Modify: `__tests__/swordfish.test.js`

**Key Decisions / Notes:**

- Use `CANVAS_H = 1200` (ensures `1200 - 125 = 1075 > WATER_SURFACE_Y + 80 = 380`, giving nonzero spawn range)
- Tests to add:
  - `_frameX stays 0 for the first 5 updates` (ANIM_STAGGER_SLOW = 6)
  - `_frameX becomes 1 on the 6th update`
  - `draw() calls ctx.scale(1, 1) when _direction is -1` (facing left, no flip) — ensure `fish._status !== ENEMY_STATUS_CAPTURED` (default-constructed status satisfies this; `drawCaptured()` doesn't call `scale()`, which would make the assertion vacuously true)
  - `draw() calls ctx.scale(-1, 1) when _direction is 1` (going right, flip) — same precondition
  - `randomSpawnY returns value in [WATER_SURFACE_Y+80, canvasHeight - fishHeight]`
  - `randomSpawnY is deterministic with a fixed rng`
  - `randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]`
- Mock pattern: copy from `__tests__/hammerheadshark.test.js` — same `makeMocks()` / `makeShark()` helpers adapted for SwordFish

**Definition of Done:**

- [ ] Total test count increases by ≥ 7
- [ ] Verify: `npm test -- --testPathPattern=swordfish -q` all pass

---

### Task 6: Write ADR-0013

**Objective:** Document the 9 key decisions made during SwordFish implementation in `docs/adr/0013-swordfish-enemy-swim-rest-spritesheet.md`.

**Files:**

- Create: `docs/adr/0013-swordfish-enemy-swim-rest-spritesheet.md`

**Key Decisions / Notes:**

Decisions to document:
1. `SwordFish extends CatchableFish` via `spriteFrameSize` pattern
2. Canonical cell = 1033×416 px (rest-frame height chosen over swim's 413 px)
3. Swim frames center-padded 3 px (2 top, 1 bottom) to reach canonical height
4. Swim row 0 / Rest row 1 = 2-row layout; 16 frames each; `dieFrameY=1`
5. Deep-water spawn zone: `WATER_SURFACE_Y + 100` to `canvasHeight − fishHeight` (same zone as HammerHeadShark; both are hard deep-water enemies)
6. Display size: 310×125 px (≈0.30× canonical cell, wider than LionFish/HammerHeadShark)
7. Fight spec tier: `strength=88, escape_rate=3.5` (hardest fish, above hammerhead_shark)
8. Drift speed: 4.0 px/tick (fastest fish — swordfish are speed predators)
9. Sprite facing direction: assumed LEFT (consistent with LionFish / HammerHeadShark)

**Definition of Done:**

- [ ] `docs/adr/0013-swordfish-enemy-swim-rest-spritesheet.md` exists with all 9 decisions
- [ ] `Trivial:` ADR is a new markdown doc, no production code — covered by visual review
