# ADR 0011 — LionFish Enemy: Mid-Water Depth, Left-Facing Sprite, and randomSpawnX Deduplication

**Date:** 2026-06-16
**Status:** Accepted

## Context

The LionFish is the third catchable fish enemy (after ButterflyFish and Crab). Several design decisions arose during implementation:

- The Fish_4 asset pack is distributed as 30 individual PNGs (10 move + 10 die + 10 attack), requiring a stitching step before the game can use it.
- ButterflyFish and LionFish share identical `randomSpawnX` logic — an opportunity to deduplicate.
- The Fish_4 sprite faces LEFT, opposite to the initial assumption (copied from Crab, which was flip-neutral). This caused visible backwards swimming until caught by a visual regression during verification.
- The game needed a mid-difficulty enemy positioned at mid-water depth between surface fish (ButterflyFish) and seabed enemies (Crab).

## Decisions

### 1. `LionFish` extends `CatchableFish` via the Crab's `spriteFrameSize` pattern

`LionFish` follows the same two-layer template-method hierarchy as `Crab`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (452×437 px) from display size (124×124 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Spritesheet layout: 10 cols × 2 rows, generated via Pillow

The asset pack contains individual PNGs, not a spritesheet. A one-time Pillow script assembles `images/fishes/lion_fish_sprite.png` (4520×874 px):

| Row | Frames | Source |
|-----|--------|--------|
| 0   | 10     | `Fish_move_4_000..009.png` (423×336 px, center-padded to 452×437) |
| 1   | 10     | `Fish_die_4_000..009.png`  (native 452×437 px) |

The attack row (`Fish_attack_4_*.png`) was excluded — the game has no attack state. Adding it later requires only a third spritesheet row and a `LION_FISH_ATTACK_FRAME_Y` constant.

Move frames (423×336 px) are center-padded into 452×437 cells (`x_offset = 14, y_offset = 50`) so all cells share the same stride, matching how `EnemyWithAnimation` indexes into the sheet via `frameX * _sw, frameY * _sh`.

### 3. `LION_FISH_MAX_FRAME_Y = 1` — locks animation to the move row

Same rationale as ADR 0008 (Crab). `EnemyWithAnimation.update()` advances `_frameY` when `_frameX` wraps; with `maxFrameY > 1` the die row bleeds into the normal swim cycle. Setting `maxFrameY = 1` keeps `_frameY` permanently at 0. The die row is accessed via `dieFrameY = 1` in `_drawCapturedSprite()` directly.

### 4. `randomSpawnX` moved to `CatchableFish` as a shared static

Both `ButterflyFish` and `LionFish` share the identical X-spawn formula:

```js
static randomSpawnX(canvasWidth, fishWidth, rng = Math.random) {
  return rng() * (canvasWidth - fishWidth);
}
```

Rather than duplicating it, it was promoted to `CatchableFish`. The `ButterflyFish` override was removed. All callers (`ButterflyFish.randomSpawnX(...)`, `LionFish.randomSpawnX(...)`) continue to work via ES6 static inheritance — `EnemyFactory` needed no changes.

`LionFish.randomSpawnY` remains species-specific (mid-water constraint) and is defined on `LionFish` directly:

```js
static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
  const minY = WATER_SURFACE_Y;
  const maxY = Math.max(minY, canvasHeight * 0.7 - fishHeight);
  return minY + rng() * (maxY - minY);
}
```

The `Math.max(minY, ...)` guard prevents a negative range when canvas height is small (e.g. CANVAS_H ≤ ~606 px → `0.7 * H - fishHeight < WATER_SURFACE_Y`).

### 5. Fish_4 sprite faces LEFT — flip condition is the inverse of Crab

Initial assumption: Fish_4 faces right (same as Crab). Visual verification during spec-verify showed LionFish swimming backwards. The flip condition was corrected:

```js
// sprite faces left; flip when direction is 1 (going right)
const flipX = this._direction === 1 ? -1 : 1;
```

This matches `ButterflyFish.draw()` and is the opposite of `Crab.draw()` (`direction === -1 ? -1 : 1`). The plan's `Assumptions` section had flagged this as a risk; it was caught and fixed in the verification pass.

### 6. Mid-water spawn: WATER_SURFACE_Y to 70% canvas height

LionFish occupies the mid-water layer:

| Enemy         | Depth zone              |
|---------------|-------------------------|
| ButterflyFish | Surface to 70% height   |
| LionFish      | Surface to 70% height (same band, mid-difficulty) |
| Octopus       | 65% height (fixed Y)    |
| Crab          | 85% height (seabed)     |

The `WATER_SURFACE_Y` constant (300 px) ensures fish never spawn in the sky/boat area above the waterline.

### 7. Fight spec: `strength = 15, escape_rate = 2.5`

LionFish sits between ButterflyFish (easier) and Crab (hardest) in difficulty:

| Enemy         | Strength | Escape rate |
|---------------|----------|-------------|
| ButterflyFish | 5        | 1.0         |
| LionFish      | 15       | 2.5         |
| Crab          | 25       | 4.0         |

`escape_rate: 2.5` means the struggle bar drains faster than ButterflyFish, requiring more frequent Space taps to land the catch.

## Consequences

- Future fish enemies that share the same X-spawn formula inherit `CatchableFish.randomSpawnX` for free; only Y-spawn and fight spec need per-species overrides.
- Any Fish_N asset pack that also faces LEFT should use the same `direction === 1 ? -1 : 1` flip. Fish packs that face RIGHT use `direction === -1 ? -1 : 1` (Crab convention). The distinction must be verified visually during spec-verify.
- The `Math.max(minY, maxY)` guard in `randomSpawnY` is a pattern worth adopting in future spawn implementations to prevent degenerate ranges on small canvases.
- Adding the LionFish attack animation requires: (a) a third spritesheet row, (b) `LION_FISH_ATTACK_FRAME_Y` constant, (c) a state check in `LionFish.update()`.
