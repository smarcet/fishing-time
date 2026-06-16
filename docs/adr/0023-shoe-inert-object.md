# ADR 0023 - Shoe Inert Object: Single-Frame Sprite, Negative Score, Random X Spawn, and InertObject Extension

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed a fourth capturable inert object to further diversify the hazard pool alongside `DiscardedBottle`, `RedApple`, and `Wheel`. A shoe floating in the ocean fits the sea-pollution theme and is immediately recognisable as unwanted debris. The source asset ships as a single 590×388 px RGBA PNG with no animation frames.

Four design questions arose:

1. **Hierarchy** — should `Shoe` extend `InertObject` or another base class?
2. **Spritesheet** — how do we handle a single-frame asset in the frame-strip system?
3. **Score value** — should the penalty match existing inert objects or be differentiated?
4. **Spawn x position** — should the object use the same random-X seeding already established for other inert objects?

## Decisions

### 1. `Shoe` extends `InertObject`

`InertObject` overrides `getFightSpec()` → `null`, signalling that capture requires no power-bar struggle. A floating shoe is passive litter — it should not fight back. Using `InertObject` gives the full `EnemyWithAnimation` draw pipeline (capture glow, arc, shrink) for free, while keeping the catch interaction trivial.

Extending `CatchableFish` would require a fight spec, a die-animation row, and fish-appropriate drift tuning — all inappropriate for an inert prop.

### 2. Single-frame "spritesheet" — copy PNG as-is, `maxFrames = 1`, draw via `naturalWidth`/`naturalHeight`

The source asset (590×388 px) has exactly one pose with no frame strip. It is copied as-is to `images/items/shoe_sprite.png` with `maxFrames = 1`. Because the image has no fixed frame grid, `draw()` uses `drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, ...)` rather than the `frameX * w` offset used by animated sprites — the same pattern already established by `RedApple` and `Wheel`.

Display size is chosen as 84×55 px (`Size(55, 84)` — height first per the `Size(h, w)` constructor convention) to preserve the natural aspect ratio (84/55 ≈ 1.53 vs natural 590/388 ≈ 1.52) and keep it visually consistent with the other surface-floating inert objects.

### 3. Score value: `Shoe = -5` (matches `DiscardedBottle`, `RedApple`, and `Wheel`)

All four inert objects represent undesirable ocean litter. Assigning the same penalty (−5) communicates equal undesirability without requiring the player to memorise differentiated values. The `SCORE_MAP` key uses the class name `'Shoe'` (not `ENEMY_TYPE_SHOE`) because `EVENT_ENEMY_CAPTURED` dispatches `e.detail.enemyType` as `constructor.name`.

### 4. Random X spawn — inherits the pattern from `Wheel` and the other inert objects

`EnemyFactory.createEnemy(ENEMY_TYPE_SHOE, ...)` uses `Enemy.randomSpawnX(canvasWidth, spriteWidth)` for the initial x position, and the constructor initialises `this._speedX = this._driftSpeed` so the object starts moving immediately on the first tick regardless of where it spawns. This is identical to the approach introduced for `Wheel` (ADR 0021) and avoids the frozen-drift bug that affects objects spawned away from both boundaries.

### 5. Bob/tilt/drift animation — shared constants with `Wheel` and `RedApple`

`Shoe.update()` increments `_bobPhase` by `ANIM_BOB_SPEED` each tick and applies `ANIM_BOB_AMPLITUDE * sin(_bobPhase)` to the y coordinate via `getPosition()`. A simultaneous tilt angle (`ANIM_MAX_TILT_ANGLE * cos(_bobPhase)`) is applied with `ctx.rotate()` inside `draw()`. Drift speed is `DRIFT_SPEED_SLOW` (0.6 px/tick). All four constants are already global — no new constants were added.

## Consequences

- `Shoe` spawns at a random x position along the water surface and drifts left-to-right (bouncing off walls) with the same bob/tilt/drift motion as `Wheel` and `RedApple`.
- The object starts moving immediately on the first tick regardless of spawn position.
- Capturing a `Shoe` deducts 5 points and displays a floating `−5` animation at the capture position.
- `images/items/shoe_sprite.png` (590×388 px, copied from the source asset) requires no build step.
- `src/Shoe.js` must be declared before `EnemyFactory.js` in `main.html`'s script load order (satisfied by inserting it after `Wheel.js`).
- `#shoe_sprite` is added to the `display: none` selector in `main.css` to prevent the hidden preload `<img>` from affecting page layout.
