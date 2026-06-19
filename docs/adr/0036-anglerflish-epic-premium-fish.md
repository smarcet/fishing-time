# ADR 0036: AnglerFlish as Epic Premium Bottom-Lane Fish

**Date:** 2026-06-19
**Status:** Accepted

## Context

The game needed a new catchable premium fish named `AnglerFlish` using
`images/fishes/angler_fish_sprite.png`. The requested gameplay contract is:

- extends `PremiumCatchableFish`
- score is 1000
- spawns only in `FISH_LANE_BOTTOM`
- rarity is `FISH_RARITY_EPIC`
- moves very, very fast
- appears once every 30 seconds

The delivered angler fish sprite had the same failure mode as the original
lobster sheet: it was a large 1536x1024 image with four useful poses located
inside a much taller canvas. Using manual source offsets in code would make the
rendering fragile and would couple the class to asset-specific padding.

## Decisions

### 1. Keep the requested class name: `AnglerFlish`

The class, score-map key, and `FISH_DEFINITIONS.className` use `AnglerFlish`.
The DOM image id remains `angler_fish_sprite` because it follows the actual
asset filename.

### 2. Normalize the spritesheet to 1056x160

The sprite asset is rewritten into four uniform transparent cells:

- frame width: 264 px
- frame height: 160 px
- frame count: 4
- row count: 1

The class can now use the standard source rectangle:
`frameX * frameW, frameY * frameH, frameW, frameH`.

This mirrors ADR-0035's lobster decision: fix bad sheet geometry in the asset,
not with per-frame offsets in rendering code.

The normalized frame is rendered at 165x100 px, preserving the source aspect
ratio while keeping the fish fully inside the bottom lane on the 800x600
desktop canvas.

### 3. Single-row capture frame

The normalized sheet has no separate die row. `dieFrameX: 0` and `dieFrameY: 0`
reuse the first swim frame for captured rendering, matching the single-row
lobster and butterfly fish convention.

### 4. Premium inheritance

`AnglerFlish` extends `PremiumCatchableFish` so it receives the gold rim glint
and sparkles without per-species rendering code. Its `_drawTrafficSprite`
override does not call `save()` or `restore()` because `PremiumCatchableFish`
owns that bracket.

### 5. Speed: 8.0 px/tick

`ANGLER_FLISH_DRIFT_SPEED` is 8.0 px/tick. This is faster than Lobster and
ChestWithJewels at 7.0 px/tick, making AnglerFlish the fastest configured
traffic species.

### 6. Guaranteed 30-second spawn

`spawnFrequency` is 1800 ticks, and both desktop and mobile gameplay profiles
include `ENEMY_TYPE_ANGLER_FLISH` in `guaranteedSpeciesIntervals` and
`guaranteedSpeciesInitialOffsets` at 1800 ticks. This makes the first spawn and
subsequent spawns occur every 30 seconds under the existing 60 fps timer model.

### 7. Fight spec

The fish uses Crab's fight tier (`strength: 40`, `escapeRate: 2.2`) because the
request specified movement speed, score, lane, rarity, and cadence but did not
ask for a harder reel fight. The encounter difficulty comes mainly from the
very high traffic speed.

## Consequences

- `AnglerFlish` is created through the existing `EnemyFactory` data-driven path.
- `FishSpawner` can force it through the existing guaranteed-species timer.
- The hidden DOM preload pattern remains unchanged: `index.html` declares the
  image and `main.css` hides `#angler_fish_sprite`.
- Future edits to the angler asset should preserve the 4 x 1 normalized cell
  layout or update `FISH_DEFINITIONS` and tests together.
