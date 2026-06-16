# ADR 0009 — Bubble Ring Explosion Animation

**Date:** 2026-06-15
**Status:** Accepted

## Context

Bubbles previously vanished instantly when they crossed the `WATER_SURFACE_Y` threshold. The goal was to replace that instant removal with a short visual effect — expanding arc rings — that gives the impression of a bubble bursting as it approaches the water surface.

Design challenges:

- The `Bubble` class used `document.getElementById('bubble')` inside its constructor, making it impossible to unit-test under Jest's Node environment (no DOM).
- Any animation state (frame counter, dying flag) had to live inside `Bubble` so the game loop stayed simple.
- The animation needed to be idempotent: `Game.update()` calls the surface check every frame, so the trigger fires repeatedly on the same bubble while it is already dying.
- Ring expansion, fade, and stagger had to be expressed with no additional assets (canvas primitives only).

## Decisions

### 1. Constructor accepts `image` as a parameter

The `Bubble` constructor changed from fetching `document.getElementById('bubble')` internally to accepting `image` as a 5th parameter (same pattern as `Fish`). `Game.js` passes `document.getElementById('bubble')` at spawn time.

This keeps the DOM lookup in `Game.js` where all other DOM lookups already live, and makes `Bubble` unit-testable by passing a plain `{}` mock.

### 2. `startDying()` owns the animation lifecycle

A new `startDying()` method sets `_dying = true` and resets `_dieFrame = 0`. It is idempotent — a second call while already dying returns immediately:

```js
startDying() {
  if (this._dying) return;
  this._dying = true;
  this._dieFrame = 0;
}
```

`update()` skips Y movement while dying, increments `_dieFrame`, and calls `markDead()` when `_dieFrame >= BUBBLE_DIE_DURATION`. `draw()` branches on `_dying` to render rings instead of the sprite. Dead bubbles are filtered out by `Game.update()`'s existing `isLive()` filter at the start of each frame.

### 3. Three staggered expanding arc rings

`draw()` renders `BUBBLE_RING_COUNT = 3` concentric rings. Ring `i` starts after `delay = i * BUBBLE_RING_STAGGER` of total progress has elapsed:

```js
const progress = Math.min(1, (this._dieFrame + 1) / BUBBLE_DIE_DURATION);
for (let i = 0; i < BUBBLE_RING_COUNT; i++) {
  const delay = i * BUBBLE_RING_STAGGER;  // 0, 0.15, 0.30
  const t = Math.max(0, progress - delay);
  if (t <= 0) continue;
  const radius = baseRadius * (1 + t * 2);           // expands to 3x
  const alpha  = Math.max(0, 1 - t / (1 - delay));  // fades 1 -> 0
  const lineWidth = Math.max(0.5, 4 * (1 - t));
  // ctx.save / arc / stroke / restore
}
```

Using `(this._dieFrame + 1)` rather than `this._dieFrame` ensures a visible ring appears on the very first dying frame, avoiding a one-frame invisible gap.

`ctx.save()`/`ctx.restore()` scopes `globalAlpha` and `lineWidth` to each ring, so canvas state is always clean after the loop.

### 4. Trigger threshold set deeper than the visual surface

`Game.update()` calls `b.startDying()` when `b.getPosition().getY() <= BUBBLE_DIE_THRESHOLD_Y` (380 px from the top). The visual water surface is at `WATER_SURFACE_Y = 300`. The 80 px gap means the ring animation begins while the bubble is still clearly underwater, giving the impression that it bursts just before breaking the surface.

### 5. All tuneable values extracted to constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `BUBBLE_DIE_DURATION` | 30 | Animation length in frames (~0.5 s at 60 fps) |
| `BUBBLE_DIE_THRESHOLD_Y` | 380 | Y at which dying starts (px from top) |
| `BUBBLE_BATCH_SIZE` | 15 | Bubbles per spawn batch |
| `BUBBLE_SPEED_Y` | 0.5 | Rise speed (px/frame) |
| `BUBBLE_SIZE_MIN` | 16 | Minimum bubble diameter (px) |
| `BUBBLE_SIZE_MAX` | 64 | Maximum bubble diameter (px) |
| `BUBBLE_SPAWN_X_MIN` | 200 | Minimum x spawn position (px) |
| `BUBBLE_RING_COUNT` | 3 | Number of rings in the explosion |
| `BUBBLE_RING_STAGGER` | 0.15 | Fractional delay between successive rings (0-1) |

## Consequences

- `Bubble` is now unit-testable under Jest without DOM setup; 5 behavioural tests cover the dying lifecycle.
- Tuning the animation (ring count, stagger, duration, threshold) is a single constant change in `src/constants.js`.
- New batch of bubbles spawns only after all current bubbles have finished their ring animation and been filtered out — no overlap between batches.
- `Game.js` must pass `document.getElementById('bubble')` when spawning `Bubble` instances; omitting it (or passing `null`) suppresses the sprite but rings still draw correctly.
