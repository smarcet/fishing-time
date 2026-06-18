# ADR 0029 - Data-Driven Capture Presentation for Hooked Entities

**Date:** 2026-06-18
**Status:** Accepted

## Context

When an entity becomes hooked, `EnemyWithAnimation.drawCaptured()` renders it attached to the hook tip for the entire retrieval sequence. Before this change, the rendering applied no rotation at all — every species was drawn at its natural (horizontal) sprite orientation regardless of what made visual sense for that entity.

This produced three classes of incorrect visuals:

- **Small fish** (ClownFish, ButterflyFish, JellyFish, PufferFish, LionFish) should hang nearly vertically from the hook, resembling the original Fishing Time arcade game. Without rotation they appear to float sideways.
- **Upright entities** (Crab, Octopus) are already correct at 0° rotation, but they would be broken by any blanket rotation applied to fix the fish.
- **Large predators** (SwordFish, Tuna, Shark, HammerHeadShark) have elongated horizontal bodies; a steep hang looks unnatural. A slight tilt (~-15°) preserves their silhouette.
- **Inert objects** (RedApple, DiscardedBottle, FishBone, Wheel, Shoe, Clock) have arbitrary orientations and should not be forcibly rotated at all.

No single rotation angle satisfies all of these cases simultaneously. A uniform blanket rotation would fix one group and break the others.

A secondary need was positional fine-tuning: some species may need the hooked sprite shifted slightly relative to the hook tip so that the visual attachment point (e.g. the fish's mouth) aligns with the hook. The design anticipates this with `captureOffsetX`/`captureOffsetY` fields, even though no current species requires a non-zero offset.

## Decision

Extend `FISH_DEFINITIONS` (ADR-0027) with three capture-presentation fields per entry:

```js
captureRotation: <degrees>,   // clockwise; positive = hang down, negative = tilt forward
captureOffsetX:  0,           // px shift applied to the translate before drawing
captureOffsetY:  0,           // px shift applied to the translate before drawing
```

Thread them through `EnemyFactory` generically — the existing `forEach` spec-build loop copies all three fields onto the spec entry, and `createEnemy()` attaches them directly to each created instance (`enemy._captureRotation`, etc.) as the single creation choke point covering `FishSpawner` and `forceHookedFishForE2E`.

Consume them in `EnemyWithAnimation.drawCaptured()` with `|| 0` fallbacks:

```js
this._ctx.translate(cx + (this._captureOffsetX || 0), cy + (this._captureOffsetY || 0));
this._ctx.scale(scale, scale);
this._ctx.rotate((this._captureRotation || 0) * Math.PI / 180);
this._drawCapturedSprite(-w / 2, -h / 2, w, h);
```

The transform order (translate → scale → rotate → draw-centered) pivots the sprite around its own center because the draw call uses `(-w/2, -h/2)` as the top-left corner. The `_applyProfileScale` method is not affected — it only touches `spec.size/baseSize` and leaves capture fields untouched on profile switches.

Agreed rotation values as of this ADR:

| Group | Species | captureRotation |
|-------|---------|-----------------|
| Small/medium fish | ClownFish, ButterflyFish, JellyFish, PufferFish, LionFish | 75–80° |
| Large predators | SwordFish, Tuna, Shark, HammerHeadShark | -15° |
| Upright | Crab, Octopus | 0° |
| Inert objects | RedApple, DiscardedBottle, FishBone, Wheel, Shoe, Clock | 0° |

## Alternatives Considered

### 1. Per-class `drawCaptured()` overrides

Each species could override `drawCaptured()` (or `_drawCapturedSprite()`) to apply its own rotation. This is the most obvious object-oriented approach.

**Rejected because:** it breaks the no-per-species-code guarantee established by ADR-0027. Introducing rotation in 16 individual overrides means capture look is scattered across 16 files, impossible to audit in one place, and a new species must know to override the method. The shared `EnemyWithAnimation.drawCaptured()` path already handles glow, pulse, throw arc, and alpha — adding rotation there keeps all capture rendering in one function.

### 2. Constructor parameters on each species class

Pass `captureRotation` as a constructor argument to each species' `constructor()`, following the same pattern as `maxFrameX`, `dieFrameX`, etc.

**Rejected because:** all species constructors would need to be updated (16 files), and `EnemyFactory` would need a per-species branch to pass the value — exactly the per-species-code problem ADR-0027 eliminated. The `|| 0` fallback in `drawCaptured()` handles the case where `_captureRotation` is unset, so constructor injection is not required for correctness.

### 3. Hardcoded type→angle lookup map in Hook or EnemyWithAnimation

A `const CAPTURE_ROTATION_MAP = { clown_fish: 80, crab: 0, ... }` table in one of the core files, keyed by enemy type ID.

**Rejected because:** it couples the hook/animation system to species knowledge, violates the single-source-of-truth principle, and requires modifying core gameplay files when adding a new species. It also duplicates data that already lives in `FISH_DEFINITIONS`.

### 4. Blanket uniform rotation for all entities

Apply one angle (e.g. 75°) to everything.

**Rejected because:** it makes crabs, octopuses, swordfish, and all inert objects look wrong. The whole problem statement is that different entity morphologies require different presentation angles.

## Tradeoffs

**Gained:**
- Capture orientation is co-located with all other per-species data in `FISH_DEFINITIONS` — one file answers "what does species X look like when hooked?".
- `Hook.js`, `Player.js`, and all fishing-rod/reel logic are completely unaware of capture orientation; they remain unchanged.
- `EnemyFactory.createEnemy()` is the single point where capture data is attached — no per-species logic required anywhere in the capture pipeline.
- Auditing or adjusting all 17 species' capture angles requires editing only `src/constants.js`.

**Cost:**
- Capture presentation data lives in a data file rather than in the class that knows how the entity should look. A reader of `ClownFish.js` won't find its capture rotation there.
- Three extra fields per `FISH_DEFINITIONS` entry add some visual noise to an already large constant block.

## Consequences / Future Extensibility

A new species defines its capture orientation by adding three fields to its `FISH_DEFINITIONS` entry. No other file needs to change:

```js
// Example: adding a new AnglerFish species
{
  id: ENEMY_TYPE_ANGLER_FISH,
  className: FISH_CLASS_ANGLER_FISH,
  // ... render geometry, population data ...
  isTrash: false,
  captureRotation: 80,   // hangs vertically like other small fish
  captureOffsetX: 0,
  captureOffsetY: 0,
},
```

`EnemyFactory` picks up the new values automatically in its `forEach` loop. `EnemyWithAnimation.drawCaptured()` reads `enemy._captureRotation` at render time. `Hook.js` and `Player.js` are untouched. The species guide in `.claude/rules/fishing-time-species.md` lists these three fields in the `FISH_DEFINITIONS` entry templates (both CatchableFish and InertObject), so a developer following the guide will include them automatically.

If a future species needs the hook attachment point at a non-center location (e.g. a large flat fish where the hook catches near the tail), `captureOffsetX`/`captureOffsetY` are already wired end-to-end: add non-zero values to the `FISH_DEFINITIONS` entry and the sprite shifts automatically. No code changes required.

The `|| 0` fallbacks in `drawCaptured()` mean that any entity constructed directly (e.g. in unit tests without going through `EnemyFactory`) will render upright with no offset, which is the correct safe default.
