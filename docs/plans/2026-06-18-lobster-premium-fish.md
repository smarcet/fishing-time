# Lobster — Epic Premium CatchableFish Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add Lobster as a new epic-rarity PremiumCatchableFish that spawns once every 60 seconds in FISH_LANE_BOTTOM, moves faster than any current species, awards 25 000 points, and inherits the gold rim-glint + sparkle visual effect from PremiumCatchableFish.

## Approach

**Chosen:** Extend `PremiumCatchableFish` (same pattern as `Crab`) with a normalized spritesheet, add FISH_DEFINITIONS entry and constants, wire into EnemyFactory, both gameplay profiles, index.html, main.css, and index.js.

**Why:** The entire per-species game logic (traffic, spawning, guaranteed intervals, fight mechanics, premium visual) is already generic and data-driven. Lobster needs only a FISH_DEFINITIONS row, a class file, and six wiring points — no new subsystems.

## Context for Implementer

**Normalized sprite geometry (critical).** `lobster_sprite.png` is 1212 x 80 px with 4 uniform animation frames (frameW=303, frameH=80, maxFrameX=4, maxFrameY=1). The original delivered sheet was 1536 x 1024 and its visible poses were not aligned to the nominal 384px columns; manual source offsets caused the first frame to include pieces of an adjacent pose. Keep the normalized asset and use the standard `frameX * frameW` source rect. Render it at 225 x 60 px, which is 25% smaller than the original 300 x 80 display size.

**Bottom alignment.** The smaller Lobster should read as walking on the seabed, not floating in the bottom lane. Use `trafficOffsetY: 24`; `FishSpawner` applies it per species and clamps the final Y inside the canvas.

**Guaranteed spawn semantics.** `guaranteedSpeciesIntervals` uses game-tick units (~60 ticks/s via requestAnimationFrame). 3600 ticks ≈ 60 seconds. The desktop profile currently has `{}` for this field; the Lobster must be added there as well so desktop players get the guaranteed spawn.

**No die-row.** The sprite has only one row. Set `dieFrameY: 0` (like ButterflyFish), NOT `dieFrameY: 1`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Wrong source rect causes overlap or blank lobster | Medium | High | Unit test asserts sprite dimensions and drawImage sourceX/Y/W/H |
| Forgetting to add to desktop profile | Medium | Medium | Task 1 DoD explicitly verifies both profiles have the Lobster interval |
| `_sw`/`_sh` undefined (no spriteFrameSize in tests) | Low | High | Test stub sets `_sw = 303, _sh = 80` (same pattern as crab test) |

## Progress Tracking

- [x] Task 1: Constants — add Lobster config to `src/constants.js`
- [x] Task 2: Class — create `src/Lobster.js` extending PremiumCatchableFish
- [x] Task 3: Wiring — register in `index.js`, `src/EnemyFactory.js`, `index.html`, `main.css`
- [x] Task 4: Tests — `__tests__/lobster.test.js`
- [x] Task 5: ADR — `docs/adr/0035-lobster-epic-premium-fish.md`

## Implementation Tasks

---

### Task 1: Constants — add Lobster config to `src/constants.js`

**Objective:** Define all per-species constants and the FISH_DEFINITIONS entry for the Lobster, and wire the guaranteed 60-second spawn into both gameplay profiles.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add near the existing crab constants (line ~29–30):
  ```js
  const LOBSTER_DRIFT_SPEED  = 7.0;  // px/tick — fastest in game (swordfish=4.5, crab=4.0)
  const LOBSTER_TRAFFIC_OFFSET_Y = 24;  // px — keeps small lobster close to seabed
  const ENEMY_TYPE_LOBSTER   = 'lobster';
  const FISH_CLASS_LOBSTER   = 'Lobster';
  ```
- Add FISH_DEFINITIONS entry after the Crab entry (after line ~420):
  ```js
  {
    id:        ENEMY_TYPE_LOBSTER,
    className: FISH_CLASS_LOBSTER,
    domId:     'lobster_sprite',
    displayH:  60,   displayW: 225,      // 25% smaller than original 80 x 300 px render
    frameH:    80,   frameW:  303,        // normalized 4-frame sheet (1212/4 cols, 1 row)
    maxFrameX: 4,    maxFrameY: 1,
    dieFrameX: 0,    dieFrameY: 0,       // no separate die row (like ButterflyFish)
    rarity:         FISH_RARITY_EPIC,
    lanes:          [FISH_LANE_BOTTOM],
    score:          25000,
    strength:       50,
    escapeRate:     2.8,
    speedMin:       5.0,
    speedMax:       LOBSTER_DRIFT_SPEED,
    trafficOffsetY: LOBSTER_TRAFFIC_OFFSET_Y,
    spawnWeight:    1,
    spawnFrequency: 3600,               // 60 s × 60 fps base cooldown
    maxActive:      FISH_TRAFFIC_MAX_ACTIVE_ONE,
    captureRotation:  0,
    captureOffsetX:   0,
    captureOffsetY:   0,
    struggleSpeed:             0.08,
    struggleRotationAmplitude: 8,
    struggleOffsetAmplitude:   3,
  },
  ```
- Add `[ENEMY_TYPE_LOBSTER]: 3600` to `guaranteedSpeciesIntervals` **and** `[ENEMY_TYPE_LOBSTER]: 1800` to `guaranteedSpeciesInitialOffsets` in **GAMEPLAY_PROFILE_DESKTOP**. Both fields currently read `Object.freeze({})` — replace each with `Object.freeze({ [ENEMY_TYPE_LOBSTER]: <value> })` to preserve the freeze wrapper (same pattern as the mobile profile at lines 635-641 of constants.js).
- Do the same for **GAMEPLAY_PROFILE_MOBILE** (alongside the existing crab entries), also preserving `Object.freeze({...})` wrappers.
- Export all new constants at the bottom of the file: `LOBSTER_DRIFT_SPEED`, `ENEMY_TYPE_LOBSTER`, `FISH_CLASS_LOBSTER`.

**Definition of Done:**

- [ ] Lobster constants defined and exported
- [ ] FISH_DEFINITIONS entry present with correct field values (`score: 25000`, `rarity: FISH_RARITY_EPIC`, `lanes: [FISH_LANE_BOTTOM]`, `dieFrameY: 0`, `maxActive: FISH_TRAFFIC_MAX_ACTIVE_ONE`)
- [ ] Both `GAMEPLAY_PROFILE_DESKTOP` and `GAMEPLAY_PROFILE_MOBILE` contain `[ENEMY_TYPE_LOBSTER]: 3600` in `guaranteedSpeciesIntervals`
- [ ] Verify: `npm test` passes (constants export/import roundtrip tested implicitly by Task 4)

---

### Task 2: Class — create `src/Lobster.js`

**Objective:** Implement the Lobster class extending PremiumCatchableFish, with `_drawTrafficSprite` and `_drawCapturedSprite` using the normalized 303x80 frame cells.

**Files:**

- Create: `src/Lobster.js`

**Key Decisions / Notes:**

- Constructor mirrors `Crab` exactly — no new logic; `_sw/_sh` set from `spriteFrameSize` (frameW=303, frameH=80).
- `static create()` uses standard `Enemy.randomSpawnX` + `CatchableFish.randomSpawnY` (FishSpawner overrides position anyway).
- Critical override — `_drawTrafficSprite`:
  ```js
  _drawTrafficSprite(dx, dy, w, h, sw, sh, flipX) {
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image,
      this._frameX * sw, this._frameY * sh, sw, sh,
      -w / 2, -h / 2, w, h);
  }
  ```
- Critical override — `_drawCapturedSprite`:
  ```js
  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image,
      this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh,
      dx, dy, w, h);
  }
  ```
- **`_drawTrafficSprite` must NOT call `ctx.save()`/`ctx.restore()`** — `PremiumCatchableFish.draw()` owns that bracket (see comment at `src/PremiumCatchableFish.js:29`). Adding save/restore inside the override creates a double-wrap.
- File ends with the standard CommonJS shim: `if (typeof module !== 'undefined' && module.exports) { module.exports = { Lobster }; }`

**Definition of Done:**

- [ ] `Lobster extends PremiumCatchableFish` (inherits premium glint + sparkle with no extra code)
- [ ] `static create(game, ctx, spec)` instantiates via standard spawn helpers
- [ ] `_drawTrafficSprite` uses normalized source cells, with no `ctx.save()`/`ctx.restore()` inside
- [ ] `_drawCapturedSprite` likewise uses normalized source cells
- [ ] CommonJS shim present
- [ ] Verify: `npm test` passes (Task 4 tests exercise this class)

---

### Task 3: Wiring — register in index.js, EnemyFactory, main.html, main.css

**Objective:** Wire the Lobster into all four integration points so it loads in the browser and the factory can create it.

**Files:**

- Modify: `index.js`
- Modify: `src/EnemyFactory.js`
- Modify: `index.html`
- Modify: `main.css`

**Key Decisions / Notes:**

- `index.js`: add `const { Lobster } = require('./src/Lobster'); global.Lobster = Lobster;` after the Crab line; add `Lobster` to `module.exports`.
- `src/EnemyFactory.js`: add `[ENEMY_TYPE_LOBSTER]: Lobster` to `this._registry` after the Crab entry.
- `index.html`:
  - Add `<script src="src/Lobster.js?v=1"></script>` after the `Crab.js` script tag (before `EnemyFactory.js`).
  - Add `<img src="images/fishes/lobster_sprite.png" id="lobster_sprite" class="sprite-image" alt="" />` alongside the other fish sprites.
- `main.css`: add `#lobster_sprite` to the `display: none` selector (line 77, the long comma list).
- Cache-bust: bump `constants.js` query string (currently `?v=13` → `?v=14`).

**Definition of Done:**

- [ ] `index.js` exports `Lobster` and sets `global.Lobster`
- [ ] `EnemyFactory._registry` contains `[ENEMY_TYPE_LOBSTER]: Lobster`
- [ ] `index.html` has `<script src="src/Lobster.js?v=1">` and the `<img id="lobster_sprite">` tag
- [ ] `main.css` hides `#lobster_sprite` via the existing `display: none` selector
- [ ] `constants.js` cache version bumped
- [ ] Verify: `npm test` still passes

---

### Task 4: Tests — `__tests__/lobster.test.js`

**Objective:** Cover the Lobster's observable behaviours: premium inheritance, normalized sprite geometry, correct draw call, x-motion, off-screen detection, and save/restore balance.

**Files:**

- Create: `__tests__/lobster.test.js`

**Key Decisions / Notes:**

- Follow the `makeMocks()` + `StubLobster` pattern from `__tests__/crab.test.js` — the mock canvas must include `createRadialGradient`, `moveTo`, `lineTo`, `closePath`, `fill`, `save`/`restore` in an `operations` array, and `shadowBlurHistory`.
- `StubLobster extends Lobster` and defines `_drawCapturedSprite` as no-op (avoids full hook context).
- Set `stub._sw = 303; stub._sh = 80` in the stub constructor.
- Key assertions:
  1. `instanceof PremiumCatchableFish` — premium inheritance confirmed
  2. `drawImage` called exactly once per frame — no duplicate
  3. `drawImage` called with normalized `sourceX/sourceY/sourceW/sourceH` — uniform sprite cells verified
  4. `shadowBlurHistory` empty — no glow halo
  5. `save` / `restore` balanced
  6. `direction=-1` → `ctx.scale(-1, 1)`; `direction=1` → `ctx.scale(1, 1)` (`flipX = direction === -1 ? -1 : 1` per PremiumCatchableFish.js:25)
  7. `update()` advances `_position.x` in the expected direction
  8. `isOffScreen()` returns true when `_position.x < −displayW` or `_position.x > canvasW`

**Definition of Done:**

- [ ] All 8 test cases listed above pass
- [ ] No test asserts internal state that isn't an observable behaviour
- [ ] Verify: `npx jest __tests__/lobster.test.js --verbose` — all pass; then `npm test` — full suite green

---

### Task 5: ADR — `docs/adr/0035-lobster-epic-premium-fish.md`

**Objective:** Record the design decisions for the Lobster species (score, rarity, speed, spawn frequency, normalized spritesheet).

**Files:**

- Create: `docs/adr/0035-lobster-epic-premium-fish.md`

**Key Decisions / Notes:**

- Document: why `dieFrameY=0` (sprite has one row); why the asset is normalized rather than using per-frame offsets; why `LOBSTER_DRIFT_SPEED=7.0` (user requirement: "very very fast"); why 60-second guaranteed interval; why score=25000 (highest in game).
- `Trivial:` No — new public file, non-trivial documentation surface.

**Definition of Done:**

- [ ] ADR file exists at `docs/adr/0035-lobster-epic-premium-fish.md`
- [ ] Documents the normalized-spritesheet decision and the reason `dieFrameY=0`
- [ ] Verify: `ls docs/adr/0035-*` exits 0

## Goal Verification

### Truths

1. A Lobster instance drawn to a mock canvas uses normalized 303x80 source cells, and the PNG is 1212x80 — verifiable via the unit test spy and PNG header assertion.
2. Both `GAMEPLAY_PROFILE_DESKTOP.guaranteedSpeciesIntervals[ENEMY_TYPE_LOBSTER]` and `GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesIntervals[ENEMY_TYPE_LOBSTER]` equal 3600 — verifiable by importing constants in the test.
3. `Lobster.prototype instanceof PremiumCatchableFish` is `true` — verifiable in the unit test.
