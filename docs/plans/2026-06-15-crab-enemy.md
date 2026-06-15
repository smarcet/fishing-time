# Crab Enemy Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a Crab enemy that crawls along the seabed, bounces between walls (never exits screen), is animated via a spritesheet (move + die rows), and is the hardest enemy to catch due to its fast drift speed and deep position.

## Approach

**Chosen:** Extend `EnemyWithAnimation` with a `Crab` class, following the `Octopus` pattern (separate `spriteFrameSize` for scaled display), registered in `EnemyFactory` and pushed once in `Game` constructor.

**Why:** Every enemy capability (capture animation, blink, arc throw, direction flip, frame animation) already lives in `EnemyWithAnimation`. Adding a new class that overrides only `draw()` and `_drawCapturedSprite()` gives the crab the full animation stack for free, exactly like Octopus. The seabed-only constraint is achieved by spawn Y and the existing `Enemy.update()` wall-bounce logic — no custom movement code needed.

## Context for Implementer

The `Size` constructor is `new Size(h, w)` (height first, then width) — `getHeight()` returns the first arg, `getWidth()` the second. The crab sprite frames are 408×197 px (width×height); displayed at half scale: 204 wide × 98 tall → `new Size(98, 204)` for display, `new Size(197, 408)` for `spriteFrameSize`.

`EnemyFactory.createEnemy()` currently always constructs an `Octopus`. It must be extended to dispatch on `name` to produce a `Crab` instead. The crab spawning at `x=0` causes `Enemy.update()` to fire the `lBound===0` branch on the first tick, which sets `speedX = +driftSpeed` and `direction = 1` — no explicit direction bootstrap needed (unlike `Fish`).

The spritesheet `images/fishes/crab_sprite.png` (4080×394 px) was already generated:
- Row 0 (frameY=0): 10 walking frames (`Crab_move_1_000..009.png`)
- Row 1 (frameY=1): 10 die frames (`Crab_die_1_000..009.png`)

## Assumptions

- The crab sprite faces right by default (flipX when direction=-1). If the asset faces left, invert the flipX logic in `draw()` — Task 1 depends on this assumption.

## Progress Tracking

- [x] Task 1: Crab class, constants, EnemyFactory, Game integration (index.js + main.html)
- [x] Task 2: Unit tests for Crab

## Implementation Tasks

### Task 1: Crab class, constants, EnemyFactory, Game integration

**Objective:** Add all game logic for the Crab enemy: constants, the `Crab` class, a `'crab'` spec in `EnemyFactory`, dispatch in `createEnemy()`, one crab pushed in `Game` constructor, the sprite `<img>` tag in `main.html`, and `Crab` added to `module.exports`.

**Files:**

- Modify: `index.js`
- Modify: `main.html`

**Key Decisions / Notes:**

- Add constants near the existing block at `index.js:11`:
  ```js
  const CRAB_FRAME_WIDTH   = 408;   // px — natural sprite cell width
  const CRAB_FRAME_HEIGHT  = 197;   // px — natural sprite cell height
  const CRAB_MAX_FRAME_X   = 10;    // columns in spritesheet (move row)
  const CRAB_MAX_FRAME_Y   = 2;     // rows: 0=move, 1=die
  const CRAB_DIE_FRAME_Y   = 1;     // row index for captured/die animation
  const CRAB_DRIFT_SPEED   = 2.5;   // px/tick — faster than fish (1.5) = hardest to catch
  const CRAB_SEABED_FACTOR = 0.85;  // canvas-height fraction for spawn Y (seabed)
  ```

- `Crab` class goes after `Octopus` (index.js:461), before `Fish`. Pattern mirrors `Octopus` exactly:
  - Constructor sets `_spriteFrameSize`, `_sw`, `_sh`, `_staggerFrame = ANIM_STAGGER_SLOW`, `_driftSpeed = CRAB_DRIFT_SPEED`.
  - No `update()` override — inherits `Enemy.update()` (wall bounce + position) and `EnemyWithAnimation.update()` (frame advance). Seabed-only is enforced by spawn Y; bounce is free.
  - `draw()`: same translate+scale+drawImage pattern as Octopus. Flip logic: `flipX = this._direction === -1 ? -1 : 1` (sprite faces right → flip when going left).
  - `_drawCapturedSprite(dx, dy, w, h)`: uses `this._sw, this._sh` for source coords, drawing from `dieFrameX * sw, dieFrameY * sh`.

- EnemyFactory (index.js:875): add `'crab'` spec in constructor:
  ```js
  this.specs['crab'] = {
    image: document.getElementById('crab'),
    size: new Size(98, 204),               // display: ~half of natural frame
    spriteFrameSize: new Size(197, 408),   // natural frame dims for source coords
    maxFrameX: CRAB_MAX_FRAME_X,
    maxFrameY: CRAB_MAX_FRAME_Y,
    dieFrameX: 0,
    dieFrameY: CRAB_DIE_FRAME_Y,
  };
  ```
  Update `createEnemy()` to dispatch on name — return `new Crab(...)` for `'crab'`, keep existing `new Octopus(...)` for all others. Spawn position for crab: `new Point(0, game.getSize().getHeight() * CRAB_SEABED_FACTOR)`.

- Game constructor (index.js:959): after the octopus push, add:
  ```js
  this._enemies.push(this._enemyFactory.createEnemy('crab', this, ctx));
  ```

- `module.exports` (index.js:1134): add `Crab` to the exports object.

- `main.html`: add before `</body>`:
  ```html
  <img src="images/fishes/crab_sprite.png" id="crab"/>
  ```

**Definition of Done:**

- [ ] `Crab` class exists in `index.js` extending `EnemyWithAnimation`, with `draw()` and `_drawCapturedSprite()` overrides using `_sw`/`_sh`.
- [ ] One crab appears at the seabed in the running game, crawls left↔right, and can be caught by the hook.
- [ ] Capture animation (blink + arc throw into boat) plays correctly for the crab.
- [ ] Verify: `npm test` — all existing tests still pass (0 failures).

---

### Task 2: Unit tests for Crab

**Objective:** Add `__tests__/crab.test.js` covering Crab's inheritance, initial movement (seabed spawn → wall-contact direction bootstrap), and direction-flip in `draw()`. Reuses the mock pattern from `fish.test.js`.

**Files:**

- Create: `__tests__/crab.test.js`

**Key Decisions / Notes:**

- Mock structure mirrors `fish.test.js:10` — `mockGame`, `mockCtx` (with `scale: jest.fn()`), `mockImage: {}`.
- Crab spawns at `x=0` (left wall). On the first `update()`, `Enemy.update()` fires the `lBound===0` branch → `speedX = CRAB_DRIFT_SPEED, direction = 1`. Test this directly.
- `draw()` flip: direction=1 → `ctx.scale(1, 1)` (no flip, sprite faces right); direction=-1 → `ctx.scale(-1, 1)`.
- `Crab` must be exported from `index.js` (Task 1 prerequisite); import it in the test file.
- Constructor call: `new Crab(mockGame, mockCtx, new Size(98, 204), new Point(0, seabedY), mockImage, CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y, new Size(197, 408))`.

**Definition of Done:**

- [ ] Test suite has ≥ 3 passing tests: (1) `instanceof EnemyWithAnimation`, (2) after one `update()` at x=0: `direction===1` and `speedX>0`, (3) `draw()` calls `ctx.scale(1,1)` when direction=1 and `ctx.scale(-1,1)` when direction=-1.
- [ ] Verify: `npm test` — all tests pass including the new crab suite.

## E2E Test Scenarios

### TS-001: Crab crawls seabed and can be caught
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8000/main.html`
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page, observe canvas | One crab visible near bottom of canvas, walking left or right |
| 2 | Wait 5 seconds | Crab reaches a wall, reverses direction (flip), keeps crawling |
| 3 | Hold Space until hook reaches seabed depth | Hook line extends to bottom zone |
| 4 | Release Space when hook overlaps crab | Hook latches onto crab, blink animation starts |
| 5 | Observe reel-in | Crab rises with hook, blinks, then arcs into boat with shrink+fade |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | PASS   | 0            | Crab visible at seabed, no console errors, game loads clean |

## Code Review Findings

| Finding | Severity | Action | Status |
|---------|----------|--------|--------|
| CRAB_MAX_FRAME_Y=2 causes die-row frames during normal walking | must_fix | Changed to 1 — only cycle move row during normal animation | Fixed |
| createEnemy() hardcoded name dispatch | suggestion | Mention only — factory refactor out of scope | Noted |
