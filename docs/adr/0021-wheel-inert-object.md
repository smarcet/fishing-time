# ADR 0021 - Wheel Inert Object: Single-Frame Sprite, Negative Score, Random X Spawn, and InertObject Extension

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed a third capturable inert object to further diversify the hazard pool alongside `DiscardedBottle` and `RedApple`. A ship's wheel floating in the ocean fits the sea-pollution theme and is immediately recognisable as unwanted debris. The source asset ships as a single 840×764 px RGBA PNG with no animation frames.

Four design questions arose:

1. **Hierarchy** — should `Wheel` extend `InertObject` or another base class?
2. **Spritesheet** — how do we handle a single-frame, large asset in the frame-strip system?
3. **Score value** — should the penalty match existing inert objects or be differentiated?
4. **Spawn x position** — should inert objects continue to spawn at x=0, or be randomised?

## Decisions

### 1. `Wheel` extends `InertObject`

`InertObject` overrides `getFightSpec()` → `null`, signalling that capture requires no power-bar struggle. A floating wheel is passive litter — it should not fight back. Using `InertObject` gives the full `EnemyWithAnimation` draw pipeline (capture glow, arc, shrink) for free, while keeping the catch interaction trivial.

Extending `CatchableFish` would require a fight spec, a die-animation row, and fish-appropriate drift tuning — all inappropriate for an inert prop.

### 2. Single-frame "spritesheet" — copy PNG as-is, `maxFrames = 1`, draw via `naturalWidth`/`naturalHeight`

The source asset (840×764 px) has exactly one pose with no frame strip. It is copied as-is to `images/items/wheel_sprite.png` with `maxFrames = 1`. Because the image has no fixed frame grid, `draw()` uses `drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, ...)` rather than the `frameX * w` offset used by animated sprites — the same pattern already established by `RedApple`.

Display size is 10× downscaled to 84×76 px (`Size(76, 84)` — height first per the `Size(h, w)` constructor convention), keeping it proportional and visually consistent with `DiscardedBottle` (76×92).

### 3. Score value: `Wheel = -5` (matches `DiscardedBottle` and `RedApple`)

All three inert objects represent undesirable ocean litter. Assigning the same penalty (−5) communicates equal undesirability without requiring the player to memorise differentiated values. The `SCORE_MAP` key uses the class name `'Wheel'` (not `ENEMY_TYPE_WHEEL`) because `EVENT_ENEMY_CAPTURED` dispatches `e.detail.enemyType` as `constructor.name`.

### 4. Randomise initial x for all InertObjects; initialise `_speedX` to avoid frozen drift

Previously, `DiscardedBottle` and `RedApple` spawned at x=0, relying on `Enemy.update()`'s left-boundary check to trigger their initial rightward movement. Randomising x exposed a latent bug: an object spawned away from either boundary starts with `_speedX = 0` and never moves because no boundary is hit on the first tick.

Two changes were made together:

- **EnemyFactory**: spawn position uses `new Point(Math.max(0, Math.random() * (canvasWidth - spriteWidth)), WATER_SURFACE_Y)` for all three inert types. The `Math.max(0, ...)` guard prevents negative x when the canvas is narrower than the sprite.
- **Subclass constructors** (`DiscardedBottle`, `RedApple`, `Wheel`): add `this._speedX = this._driftSpeed` after setting `_driftSpeed`, giving each object an initial rightward velocity regardless of spawn x. `Enemy.update()` then bounces the object off walls as before.

Both changes are applied to all three inert types for consistency — they share the same surface-float behaviour and the fix applies equally to each.

## Consequences

- `Wheel` spawns at a random x position along the water surface and drifts left-to-right (bouncing off walls), identical in motion to `DiscardedBottle` and `RedApple`.
- All three inert objects now start moving immediately on the first tick regardless of spawn position.
- Capturing a `Wheel` deducts 5 points and displays a floating `−5` animation at the capture position.
- `images/items/wheel_sprite.png` (840×764 px, copied from the source asset) requires no build step.
- `src/Wheel.js` must be declared before `EnemyFactory.js` in `main.html`'s script load order (satisfied by inserting it after `RedApple.js`).
