# ADR-0004: Yellow Fish Animation, Flip, and Spawn

**Date:** 2026-06-14
**Status:** Accepted

## Context

The yellow fish (`fish1_sprite`) had three user-visible bugs and one naturalness issue:

1. **No flip** - the fish never mirrored when changing direction; it swam backwards.
2. **Not smooth** - `EnemyWithAnimation` default `_staggerFrame = 1` caused the sprite to advance one frame per tick (~60fps), producing a rapid flicker instead of a recognisable swim cycle.
3. **Above water** - spawn formula `Math.random() * (H - 200) + 200` allowed Y values in [200, 300), above the water surface.
4. **Unnatural school** - all fish spawned at x=0 with the same speed, producing a tight vertical column that moved as one block.

## Decision

Follow the established ADR-0002 pattern: create a `Fish extends EnemyWithAnimation` subclass that encapsulates all fish-specific behaviour. No changes to `Enemy`, `EnemyWithAnimation`, `Trash`, `Octopus`, `Hook`, `Player`, or the collision/catch flow.

### Sprite direction convention

**`fish1_sprite` faces LEFT by default.** This is the opposite of the Octopus sprite, which faces RIGHT. The `flipX` sign must therefore be inverted:

| Entity | Default sprite direction | flipX when direction=1 (going right) | flipX when direction=-1 (going left) |
|--------|--------------------------|--------------------------------------|--------------------------------------|
| Octopus | RIGHT | `1` (no flip) | `-1` (flip) |
| Fish | LEFT | `-1` (flip to face right) | `1` (no flip) |

```js
// Octopus.draw():
const flipX = this._direction === -1 ? -1 : 1;

// Fish.draw():
const flipX = this._direction === 1 ? -1 : 1;
```

Any future sprite that faces left by default must use the Fish convention, not the Octopus convention.

### Animation cadence

Fish reuse the existing `ANIM_STAGGER_SLOW = 6` constant (one sprite frame every 6 game ticks), same as Octopus and Trash. No new constant needed.

### Spawn position

Two static helpers on `Fish` encapsulate safe spawn bounds:

- `Fish.randomSpawnY(canvasHeight, fishHeight, rng)` - returns Y in `[WATER_SURFACE_Y, canvasHeight - fishHeight]`. `WATER_SURFACE_Y = 300` is the canonical water-surface line used by all other entities (octopus spawn, trash spawn, bubble pop).
- `Fish.randomSpawnX(canvasWidth, fishWidth, rng)` - returns X in `[0, canvasWidth - fishWidth]`, spreading fish across the full canvas width.

Both accept an injectable `rng` parameter for deterministic testing.

### Initial direction bootstrap

`Enemy.update()` only sets `_direction` and `_speedX` when a fish touches a wall boundary (`lBound === 0` or `rBound >= canvasWidth`). Fish spawned at arbitrary X positions with `_speedX = 0` would never reach a wall and would sit still forever.

`Fish` overrides `update()` to bootstrap direction on the first tick when `_direction === null`:

```js
update() {
  if (this._direction === null) {
    this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;
    this._speedX = this._direction * this._driftSpeed;
  }
  super.update();
}
```

Fish in the left half of the canvas start going right; fish in the right half start going left. After the first tick, `Enemy.update()` takes over and wall-bouncing proceeds normally.

### New constants

```js
const WATER_SURFACE_Y   = 300;  // px - y of the water surface; entities spawn at or below this line
const FISH_FRAME_WIDTH  = 100;  // px - fish1_sprite cell width  (= render width)
const FISH_FRAME_HEIGHT = 82;   // px - fish1_sprite cell height (= render height)
const FISH_MAX_FRAME_X  = 10;   // columns in the fish1_sprite spritesheet
```

`WATER_SURFACE_Y` consolidates the implicit `300` that appeared in three places (octopus spawn, trash spawn, bubble pop). Those three literals are left as-is (out of scope), but all new code uses the constant.

## Consequences

- Fish swim naturally at different positions and depths across the underwater scene.
- Direction flip is correct and tested: `ctx.scale(-1, 1)` when going right, `ctx.scale(1, 1)` when going left.
- Captured fish render at the current sprite frame instead of the previous undefined `dieFrameX * w` (NaN), which was a latent rendering bug in plain `EnemyWithAnimation`.
- New `Fish` class is exported in `module.exports` and covered by `__tests__/fish.test.js` (51 tests total, 12 new fish-specific).
- Future sprite additions: check whether the sprite faces left or right before copying the Octopus flipX formula.
