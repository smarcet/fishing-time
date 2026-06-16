# ADR 0019 - RedApple Inert Object: Single-Frame Sprite, Negative Score, and InertObject Extension

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed a second capturable inert object — alongside `DiscardedBottle` — to diversify the hazard pool and add penalty variety for the player. A red apple floating in the ocean is clearly unwanted litter and fits the visual language of the game's sea-pollution theme. The source asset ships as a single 118×204 px PNG with no animation frames, which required a decision on how to represent it as a "spritesheet" and how to integrate it into the existing factory and scoring systems.

Three design questions arose:

1. **Hierarchy** — should `RedApple` extend `InertObject` (no fight) or `CatchableFish` (fight spec)?
2. **Spritesheet** — how do we handle a single-frame asset in a system designed for horizontal frame strips?
3. **Score value** — should the penalty match `DiscardedBottle` or be differentiated?

## Decisions

### 1. `RedApple` extends `InertObject`

`InertObject` overrides `getFightSpec()` → `null`, which signals to the hook that capturing this entity requires no power-bar struggle. A floating apple is passive litter — it should not fight back. Using `InertObject` gives us the full `EnemyWithAnimation` draw pipeline (capture glow, arc, shrink) for free, while ensuring the catch interaction stays trivial (hook contact → capture).

Extending `CatchableFish` instead would require a fight spec, a die-animation row, and drift-speed tuning matching the fish roster — all inappropriate for an inert prop.

### 2. Single-frame "spritesheet" — copy PNG as-is, `maxFrames = 1`

The source asset (`red_apple.png`, 118×204 px) has exactly one pose. Rather than artificially tiling it to create a multi-frame strip, the image is copied as-is to `images/items/red_apple_sprite.png` with `maxFrames = 1`. The draw loop draws `frameX * w` from the left edge, which is always 0 for a single-frame strip — no compositing or padding needed.

This matches the simplest valid input for the existing `DiscardedBottle.draw()` template: the frame-strip assumption degrades cleanly to the single-frame case.

### 3. Bob-and-tilt animation mirrors `DiscardedBottle` exactly

`RedApple` copies `DiscardedBottle`'s constructor and `update()` / `draw()` / `getPosition()` verbatim, inheriting the same constants (`ANIM_STAGGER_SLOW`, `DRIFT_SPEED_SLOW`, `ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`). A floating apple bobs and rocks in water the same way a bottle does — the physics is identical.

Sharing constants rather than introducing apple-specific values avoids premature differentiation. If the apple later needs distinct motion (e.g. faster drift, stronger tilt), new constants can be added without touching `DiscardedBottle`.

### 4. Score value: `RedApple = -5` (matches `DiscardedBottle`)

Both `DiscardedBottle` and `RedApple` represent undesirable ocean litter that a responsible fisherman would avoid. Assigning the same penalty (−5) communicates equal undesirability without requiring the player to memorise differentiated values. Deducting 5 is a meaningful penalty relative to the smallest positive score (ClownFish +5) without being catastrophic.

The `SCORE_MAP` key uses the class name `'RedApple'` (not the `ENEMY_TYPE_RED_APPLE` constant) because `EVENT_ENEMY_CAPTURED` dispatches `e.detail.enemyType` as `constructor.name` — consistent with all other entries in `SCORE_MAP`.

## Consequences

- `RedApple` spawns at the water surface (`y = WATER_SURFACE_Y`) and drifts slowly left-to-right, identical to `DiscardedBottle`.
- Capturing a `RedApple` deducts 5 points and displays a floating `−5` animation at the capture position.
- `images/items/red_apple_sprite.png` (118×204 px, copied from the source asset) requires no build step; if the source asset changes, replace the file in place.
- `RedApple` must be declared before `EnemyFactory.js` in `main.html`'s script load order (currently satisfied by inserting it after `DiscardedBottle.js`).
