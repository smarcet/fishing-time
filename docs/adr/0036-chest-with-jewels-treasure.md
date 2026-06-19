# ADR 0036: ChestWithJewels as Epic-Rarity Treasure InertObject

**Date:** 2026-06-19
**Status:** Accepted

## Context

The game needed a high-value treasure collectible that:
- Awards a large positive score to create a memorable, game-defining moment
- Appears in the bottom lane (deepest, hardest to reach)
- Is epic rarity, appearing reliably but not constantly
- Moves very fast to challenge players who reach the bottom lane
- Requires no struggle on capture (it is treasure, not a fighting creature)
- Spawns once every 30 seconds guaranteed

## Decisions

### 1. Extends InertObject (not CatchableFish)

A treasure chest does not fight back. `InertObject.getFightSpec()` returns
`null`, so the hook captures it instantly with no struggle mini-game. This
matches the player expectation for loot and avoids encoding fight parameters
(`strength`, `escapeRate`) that would be semantically incorrect for an
inanimate object.

`Clock` is the precedent for a positive-score InertObject (score +50). This
change proves the pattern scales to much higher scores (+10000).

### 2. Score: 10000

10000 was chosen to make a chest capture a game-defining event. It is the
highest InertObject score in the game by a very large margin (previous leader:
Clock at 50) and rewards players willing to cast deep into the bottom lane.

### 3. Rarity: FISH_RARITY_EPIC

Epic matches the visual and gameplay weight of the reward. Guaranteed-every-30s
cadence via `guaranteedSpeciesIntervals` makes it catchable in a typical game
session while remaining special.

### 4. Speed: 7.0 px/tick (CHEST_WITH_JEWELS_DRIFT_SPEED)

Ties Lobster - the fastest entity in the game. The user requirement was "muy muy
rapida" (very very fast). 7.0 is the current top speed; the chest earns that
tier because the bottom lane is already the hardest to reach and the high speed
makes the catch genuinely difficult.

`speedMin: 5.0`, `speedMax: 7.0` mirror the Lobster's range so FishSpawner
picks a random speed in that band each spawn.

### 5. Guaranteed every 30 seconds in BOTH profiles

`guaranteedSpeciesIntervals: { [ENEMY_TYPE_CHEST_WITH_JEWELS]: 1800 }` added
to both `GAMEPLAY_PROFILE_DESKTOP` and `GAMEPLAY_PROFILE_MOBILE`. Desktop
players had an empty guaranteed map before this change; now they share the same
treasure cadence as mobile.

Initial offset is 900 ticks (~15s) so the first chest appears mid-game rather
than immediately after loading - giving the player time to establish a rhythm
before the first high-value opportunity.

`spawnFrequency: 1800` is a separate per-species cooldown floor (the weighted
spawner will not attempt the chest more often than every 30s). With
`spawnWeight: 1` among 19 species, the weighted spawner alone would rarely
schedule the chest; the guaranteed path is the practical delivery mechanism.

### 6. Display: 138×206 px

Started at 150×100 (3:2, matching the sprite's native 1536×1024 aspect).
User requested +10% then +25% increases mid-implementation, yielding the
final `displayH: 138, displayW: 206`. Large enough to see clearly at
bottom-lane depth, not so large it trivializes the catch.
`maxFrames: 1` - the sprite is a single static image with no animation rows.

### 7. Sprite hidden in main.css

`#chest_with_jewels_sprite` added to the existing ID-list `display: none`
selector. This is the project convention for all sprite `<img>` elements -
they exist solely to preload assets for Canvas `drawImage` calls and must not
be visible in the DOM.

### 8. Asset rename: chest._with_jewels.png -> chest_with_jewels.png

The delivered asset had an erroneous dot in its filename
(`chest._with_jewels.png`). The file was git-renamed via `git mv` to preserve
history and the corrected name `chest_with_jewels.png` is used throughout
(domId, img src, CSS selector).

### 9. WATER_SURFACE_Y as test-only spawn fallback

`ChestWithJewels.create()` passes `WATER_SURFACE_Y` as the initial Y
coordinate, mirroring the pattern used by all InertObject subclasses (Clock,
Wheel, etc.). FishSpawner overrides the Y coordinate at runtime from the
bottom-lane range (yMin: 0.82, yMax: 0.95 of canvas height). The constructor
value is a test-instantiation fallback only and does not affect production
behavior.

## Alternatives Considered

- **CatchableFish with zero strength**: Would enable the struggle mini-game
  framework. Rejected - a chest does not fight; applying a zero-strength fight
  spec is semantically wrong and would require fake `frameH/W/maxFrameX/Y/
  dieFrameX/Y` fields in FISH_DEFINITIONS.
- **Lower speed (4.5 px/tick, matching SwordFish)**: Would make the chest
  easier to catch. Rejected - the "muy muy rapida" requirement and the high
  score reward justify top-tier speed.
- **Score 25000 (matching Lobster)**: Considered as the benchmark for epic
  bottom-lane entities. 10000 was chosen because the chest is InertObject
  (no effort to capture beyond reaching the right depth) while Lobster requires
  timing a struggle. The score reflects the depth requirement, not the capture
  difficulty.
