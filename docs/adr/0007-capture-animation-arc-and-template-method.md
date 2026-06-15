# ADR 0007 — Capture Animation: Arc Throw, Center-Based Rendering, and Template Method

**Date:** 2026-06-15
**Status:** Accepted

## Context

When the player reels in a caught enemy, the old code simply moved the enemy sprite to the hook position with no visual feedback that it was being "caught". The goals for the new animation were:

1. **Blink** — the caught enemy flashes to signal capture.
2. **Rise with hook** — the enemy rides the hook tip upward during reel-in.
3. **Arc throw into boat** — near the top, the enemy should arc parabolically toward the boat interior, shrink, and fade out as it "lands" inside.

Several design challenges arose:

- All enemy subclasses (Fish, Octopus, Trash) needed the same animation without duplicating code.
- The arc endpoint had to land visibly inside the boat regardless of where the hook was at catch time.
- Scaling a sprite around its own center requires a specific `translate` + `scale` pattern to avoid drift.
- The raw progress value driving the animation was private to `Hook`; `drawCaptured()` in `EnemyWithAnimation` needed access to it.
- The reel-in speed during catch was identical to the free-reel speed, making the arc too fast to see.
- The octopus was spawning too high in the water column, making it hard to hook.

## Decisions

### 1. Template method `drawCaptured()` in `EnemyWithAnimation`

`EnemyWithAnimation` now owns the entire capture animation (blink, rise, arc, shrink, fade). Subclasses implement only `_drawCapturedSprite(dx, dy, w, h)` for their own sprite-drawing logic. `Fish.draw()` routes to `this.drawCaptured()` when `_hook` is set.

This ensures all future enemy types get the animation for free by extending `EnemyWithAnimation` and overriding `_drawCapturedSprite()`.

### 2. Two-phase animation driven by `getCaptureRawProgress()`

The animation is split at `CAPTURE_THROW_THRESHOLD = 0.78` (78% of rope retracted):

| Phase | `raw` range | Behavior |
|-------|-------------|----------|
| RISING | `0 → 0.78` | Enemy rides hook tip, blinks |
| THROWING | `0.78 → 1.0` | Enemy arcs toward boat, shrinks, fades |

`Hook.getCaptureRawProgress()` (promoted from private `_getCaptureRawProgress`) is the single source of truth:

```js
getCaptureRawProgress() {
  const denom = this._catchRopeStart - HOOK_REST_LENGTH;
  if (denom <= 0) return 1;
  return Math.min(1, (this._catchRopeStart - this._ropeLength) / denom);
}
```

### 3. Sine-bump arc formula

The arc is implemented as a straight-line lerp plus a sine bump perpendicular to it:

```js
cx += (target.getX() - hookTip.getX()) * t;
cy += (target.getY() - (hookTip.getY() + h / 2)) * t;
cy -= Math.sin(t * Math.PI) * CAPTURE_THROW_ARC_Y;  // peak at t=0.5
```

`Math.sin(t * Math.PI)` is zero at both endpoints and peaks at 1 in the middle, creating a smooth bump above the straight-line trajectory with no special-casing at the endpoints.

### 4. `getLandingTarget()` uses boat horizontal center

The arc target is the boat's center X at pivot Y height, not the rod-tip pivot point:

```js
getLandingTarget() {
  const pos = this._player.getPosition();
  const w   = this._player.getSize().getWidth();
  return new Point(pos.getX() + w / 2, this._pivot().getY());
}
```

Using the rod-tip pivot (x ≈ 145 px) as the target caused the arc to go leftward when the hook was to the right of the pivot — which is almost always. Boat center (x ≈ 302 px) is consistently to the right of typical hook positions, so the arc correctly arcs toward the boat interior.

### 5. Center-based `translate(cx, cy)` + `scale` pattern

Scaling a sprite around a fixed visual center requires translating to that center first, then scaling, then drawing offset by half-size:

```js
this._ctx.translate(cx, cy);
this._ctx.scale(scale, scale);
this._drawCapturedSprite(-w / 2, -h / 2, w, h);
```

The earlier formula computed `dx = hookTip.x - w/2` and then corrected for scale with `translate(dx + w*scale/2, ...)`. As `scale` dropped below 1 the center drifted leftward. The center-based pattern eliminates the drift: `translate` goes to the intended center unconditionally; `scale` shrinks symmetrically around it.

### 6. Separate `HOOK_CATCH_REEL_SPEED = 3`

A dedicated constant (slower than `HOOK_REEL_SPEED = 5`) controls reel speed during CATCH. This makes the throw arc long enough to be perceptible without slowing down the free-reel experience.

### 7. Octopus spawn Y uses canvas-relative factor

The octopus Y spawn position changed from a hardcoded pixel value to `game.getSize().getHeight() * 0.65`, placing it at 65% of canvas height. This keeps the octopus in the reachable mid-water zone across different canvas sizes.

## Consequences

- Any new `EnemyWithAnimation` subclass gets the capture animation automatically; only `_drawCapturedSprite()` needs to be overridden.
- Adding a different arc shape (e.g., spin) requires changing only `drawCaptured()` in `EnemyWithAnimation`.
- `getCaptureRawProgress()` is now part of `Hook`'s public API; tests should call it without the underscore.
- Two constants govern the animation feel: `CAPTURE_THROW_THRESHOLD` (when the arc starts) and `CAPTURE_THROW_ARC_Y` (arc height). Tuning is a one-line change each.
- `getLandingTarget()` is coupled to player width; if the player sprite is resized the arc endpoint auto-adjusts.
