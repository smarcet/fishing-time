# ADR 0024 - FishBone Inert Object: 2-Frame Spritesheet, Frame-Based DrawImage, Negative Score, Random X Spawn, and InertObject Extension

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed a fifth capturable inert object to further diversify the hazard pool alongside `DiscardedBottle`, `RedApple`, `Wheel`, and `Shoe`. A fish skeleton floating at the water surface fits the sea theme — it implies a fish that was already caught and discarded — and is immediately recognisable as unwanted ocean debris.

The source assets ship as two separate RGBA PNGs (`fish_bone_01.png` and `fish_bone_02.png`), each 386×155 px, depicting the same fish bone in slightly different states (subtle visual difference for animation).

Five design questions arose:

1. **Hierarchy** — should `FishBone` extend `InertObject` or another base class?
2. **Spritesheet** — with two source PNGs available, should we use one (single-frame, like Shoe/Wheel) or combine both (2-frame animated strip)?
3. **DrawImage strategy** — should `draw()` and `_drawCapturedSprite()` use `naturalWidth/naturalHeight` for the full image (Shoe pattern), or frame-offset coordinates?
4. **Score value** — should the penalty match existing inert objects or be differentiated?
5. **Spawn x position** — should the object use the same random-X seeding already established for other inert objects?

## Decisions

### 1. `FishBone` extends `InertObject`

`InertObject` overrides `getFightSpec()` → `null`, signalling that capture requires no power-bar struggle. A floating fish bone is passive debris — it should not fight back. Using `InertObject` gives the full `EnemyWithAnimation` draw pipeline (capture glow, arc, shrink) for free, while keeping the catch interaction trivial.

### 2. 2-Frame Horizontal Spritesheet (772×155 px)

Both source PNGs are identical in size (386×155 px RGBA) and represent the same pose in slightly different states. Rather than discarding the second frame, they are combined side-by-side into a single horizontal strip (`fish_bone_sprite.png`, 772×155 px) using Python + Pillow:

```python
sheet = Image.new('RGBA', (f1.width * 2, f1.height))
sheet.paste(f1, (0, 0))
sheet.paste(f2, (f1.width, 0))
```

With `FISH_BONE_MAX_FRAMES = 2` and `ANIM_STAGGER_SLOW = 6` ticks per frame, `EnemyWithAnimation.update()` cycles `_frameX` between 0 and 1 automatically, giving a subtle visual oscillation for free via the inherited frame-cycling mechanism. No new animation logic was added to `FishBone`.

### 3. Frame-Based DrawImage (not full `naturalWidth`)

Because the spritesheet contains two frames side-by-side, `draw()` and `_drawCapturedSprite()` must extract the correct frame using a source-x offset:

```js
const frameW = this._image.naturalWidth / this._maxFrameX;  // 772 / 2 = 386
this._ctx.drawImage(
  this._image,
  this._frameX * frameW, 0, frameW, this._image.naturalHeight,
  dstX, dstY, dstW, dstH
);
```

This is the key departure from `Shoe`, `Wheel`, and `RedApple`, which use the full `naturalWidth` because their spritesheets contain a single frame. Using `naturalWidth` directly on a 2-frame strip would draw both frames squashed together.

### 4. Display Size: 40×100 px (`Size(40, 100)`)

Natural aspect ratio: 386/155 ≈ 2.49:1. Display aspect ratio: 100/40 = 2.5:1 (≈ preserved). Width of 100 px makes the fish bone clearly visible without dominating the screen. `Size(h, w)` constructor convention is respected (height first).

### 5. Score Value: `FishBone = -5` (matches all other inert objects)

All five inert objects represent undesirable ocean litter. Assigning the same penalty (−5) communicates equal undesirability without requiring the player to memorise differentiated values. The `SCORE_MAP` key uses the class name `'FishBone'` because `Hook.js` dispatches `EVENT_ENEMY_CAPTURED` with `{ enemyType: this._catch.constructor.name }` and `ScoreSystem` listens via `SCORE_MAP[e.detail.enemyType]`.

### 6. Random X Spawn — inherits the established pattern

`EnemyFactory.createEnemy(ENEMY_TYPE_FISH_BONE, ...)` uses `Enemy.randomSpawnX(canvasWidth, spriteWidth)` for the initial x position, matching the pattern introduced for `Wheel` (ADR 0021) and `Shoe` (ADR 0023). The constructor initialises `this._speedX = this._driftSpeed` so the object starts moving immediately on the first tick regardless of spawn position.

### 7. Bob/tilt/drift animation — shared constants with Shoe, Wheel, and RedApple

`FishBone.update()` increments `_bobPhase` by `ANIM_BOB_SPEED` each tick and applies `ANIM_BOB_AMPLITUDE * sin(_bobPhase)` to the y coordinate via `getPosition()`. A simultaneous tilt angle (`ANIM_MAX_TILT_ANGLE * cos(_bobPhase)`) is applied with `ctx.rotate()` inside `draw()`. Drift speed is `DRIFT_SPEED_SLOW` (0.6 px/tick). All four constants are already global — none were added.

## Consequences

- `FishBone` spawns at a random x position along the water surface and drifts left-to-right (bouncing off walls) with the same bob/tilt/drift motion as `Shoe`, `Wheel`, and `RedApple`.
- A 2-frame animation cycles at `ANIM_STAGGER_SLOW` (6 ticks/frame), giving a subtle visual oscillation without any new animation code.
- `draw()` and `_drawCapturedSprite()` compute `frameW = naturalWidth / maxFrameX` to select the correct frame — future single-frame InertObject subclasses should use the `naturalWidth` approach (Shoe pattern); multi-frame ones should use this offset pattern.
- Capturing a `FishBone` deducts 5 points and displays a floating `−5` animation at the capture position.
- `images/items/fish_bone_sprite.png` (772×155 px) is assembled from two source PNGs and requires no build step after initial creation.
- `src/FishBone.js` must be declared before `src/EnemyFactory.js` in `main.html`'s script load order (satisfied by inserting it after `Shoe.js`).
- `#fish_bone_sprite` is added to the `display: none` selector in `main.css` to prevent the hidden preload `<img>` from affecting page layout.
