# ADR 0035: Lobster as Epic-Rarity Premium Catchable Fish

**Date:** 2026-06-18
**Status:** Accepted

## Context

The game needed a new top-tier catchable fish for the FISH_LANE_BOTTOM lane that would:
- Feel prestigious and rare (one spawn every 60 seconds)
- Be the fastest entity in the game to challenge experienced players
- Award a high score that clearly separates it from all existing species
- Inherit the gold rim-glint + sparkle visual style introduced in ADR-0034

## Decisions

### 1. Score: 25000

25000 was chosen as the highest score in the game by a large margin (previous leader: Crab at 1000). This makes a Lobster catch a memorable, game-defining event rather than an incremental gain.

### 2. Rarity: FISH_RARITY_EPIC

Epic rarity places the Lobster above Crab (uncommon) and Shark/HammerHeadShark (epic/legendary) in terms of player attention. The guaranteed 60-second spawn interval (via `guaranteedSpeciesIntervals`) ensures it appears regularly enough to be catchable while remaining special.

### 3. Speed: 7.0 px/tick (LOBSTER_DRIFT_SPEED)

SwordFish holds the previous record at 4.5 px/tick. 7.0 makes the Lobster roughly 55% faster than anything else - difficult to hook but not impossible, consistent with the high score reward.

### 4. Extends PremiumCatchableFish

The gold rim-glint + sparkle effect from ADR-0034 communicates visually that this fish is exceptional. Extending `PremiumCatchableFish` gets this for free with no extra per-class code.

### 5. dieFrameY: 0

The current lobster sheet uses the first animation frame as the captured frame. Setting `dieFrameY: 0` keeps captured rendering on the first row and avoids reading from a non-dedicated death row.

### 6. Normalized spritesheet: 4848x2304, thirty-six 808x384 cells

The delivered replacement sheet is a 6-column by 6-row PNG. Each frame is a uniform 808x384 transparent cell. `Lobster` renders those source frames at 188x89, preserving the source aspect ratio while keeping the bottom-lane hitbox compact.

The class uses the standard source formula (`frameX * frameW`, `frameY * frameH`) and the standard premium-fish direction flip because the replacement sprite faces right. This fixes overlap at the source instead of encoding fragile per-frame offsets in code.

### 7. Bottom-lane vertical offset

The smaller 225x60 render looked like it floated above the seabed when using the shared bottom-lane range. `trafficOffsetY=24` lowers only Lobster traffic while `FishSpawner` clamps the result inside the canvas bounds.

### 8. No save/restore inside _drawTrafficSprite

PremiumCatchableFish.draw() wraps the `_drawTrafficSprite` call inside its own `ctx.save()/ctx.restore()` bracket (see `src/PremiumCatchableFish.js:31-33`). Adding another save/restore inside the override would create a double-wrap that is harmless but misleading. The override must not include save/restore.

### 9. Guaranteed spawn in BOTH profiles

`guaranteedSpeciesIntervals` was populated in `GAMEPLAY_PROFILE_DESKTOP` (previously `{}`) as well as `GAMEPLAY_PROFILE_MOBILE`. Desktop players get the same 60-second guarantee. The initial offset is 1800 ticks (30 seconds) so the first Lobster appears mid-game rather than immediately.

## Alternatives Considered

- **Manual source offsets**: Worked for individual frames, but the first offset crossed adjacent poses and caused visible overlap. Rejected in favor of a normalized asset.
- **Separate die-row**: Considered adding a die row to the sprite. Rejected - the sprite is a delivered asset and reprocessing it was out of scope.
- **Lower speed (4.5 px/tick)**: Would overlap with SwordFish. The "very very fast" requirement from the user call made 7.0 the clear choice.
