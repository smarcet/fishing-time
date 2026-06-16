# ADR 0020 - JellyFish Enemy: Spritesheet Assembly, Penalty Score, and Mid-Water Spawn

**Date:** 2026-06-16
**Status:** Accepted

## Context

JellyFish fills a hazard/nuisance slot in the enemy roster — it is catchable but awards a negative score, punishing players who reel it in. The Jellyfish_3 asset pack ships as 20 individual PNGs split across two animation groups with slightly different native sizes (move: 196×294 px, die: 221×293 px), requiring a PIL stitching step and a centering decision before use. Several decisions arose regarding spritesheet layout, canonical cell size, penalty score, fight spec tier, spawn zone, and sprite direction convention.

## Decisions

### 1. `JellyFish` extends `CatchableFish` via the `spriteFrameSize` pattern

`JellyFish` follows the same two-layer template-method hierarchy as `LionFish`, `Tuna`, `Shark`, and `ClownFish`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (221×294 px canonical cell) from display size (80×106 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Canonical cell is 221×294 px (max of both animation groups); move frames centred inside

The Jellyfish_3 pack provides two animation groups with different natural sizes:
- `Jellyfish_move_3`: 10 frames at 196×294 px
- `Jellyfish_die_3`: 10 frames at 221×293 px

Using the maximum dimension from each axis as the canonical cell avoids distorting either animation and keeps the `frameX * _sw` stride formula universal across both rows. Move frames are centred horizontally inside the cell:

```
offset_x = (221 - 196) // 2 = 12 px  (center horizontally)
offset_y = 0                           (heights match to within 1 px; top-aligned)
```

Final spritesheet: **2210×588 px** (10 cols × 221 px, 2 rows × 294 px).

### 3. 2-row layout: Row 0 = move (10 frames), Row 1 = die (10 frames); `dieFrameY = 1`

`maxFrameY = 1` in the EnemyFactory spec ensures only row 0 cycles during swim. Row 1 is accessed exclusively via `dieFrameY = 1`, consistent with `LionFish`, `HammerHeadShark`, `SwordFish`, `Tuna`, `ClownFish`, and `Shark`. The `_drawCapturedSprite()` override accesses the die row directly (`dieFrameX * _sw, dieFrameY * _sh`) without going through the frame animation cycle.

### 4. Score: `-25` (penalty — catching a JellyFish costs points)

| Enemy | Score |
|-------|-------|
| DiscardedBottle | -5 |
| RedApple | -5 |
| **JellyFish** | **-25** |
| ClownFish | +5 |
| ButterflyFish | +10 |

JellyFish is a hazard: players are discouraged from catching it. The -25 penalty is harsher than the existing litter items (-5) to reflect the risk of a venomous catch, while remaining recoverable within a normal fishing session. `SCORE_MAP` is keyed by `constructor.name` (dispatched from `Hook.js:94` as `enemyType: this._catch.constructor.name`), so the key is `JellyFish` (PascalCase).

### 5. Fight spec: `strength = 5, escape_rate = 1.0` (easy to land, slowest escape)

| Fish | Strength | Escape Rate |
|------|----------|-------------|
| **JellyFish** | **5** | **1.0** |
| ClownFish | 5 | 1.2 |
| ButterflyFish | 5 | 1.5 |
| LionFish | 15 | 2.5 |

JellyFish shares the lowest strength tier with ClownFish and ButterflyFish (strength 5) and has the slowest escape rate in the roster (1.0). This makes it the easiest fish to land mechanically — which amplifies the penalty: players who accidentally hook one can easily reel it in, paying the -25 cost. The low resistance reinforces the "you caught a jellyfish by mistake" narrative.

### 6. Spawn zone: `WATER_SURFACE_Y` to `canvasHeight × 0.8 - fishHeight` (full mid-water column)

JellyFish drifts throughout the water column from the surface down to 80% of canvas height, floating freely unlike deep-water fish. This wide spawn zone increases the chance of accidental encounters, which is consistent with the penalty design goal — jellyfish are hazards players stumble into.

### 7. Drift speed: `JELLY_FISH_DRIFT_SPEED = 0.8` px/tick (slowest in the roster)

JellyFish moves at 0.8 px/tick, the slowest of all fish enemies. Jellyfish are passive drifters; slow movement gives players time to notice and avoid them, which is fair given the penalty.

### 8. Sprite faces LEFT (ClownFish/LionFish convention): `flipX = direction === 1 ? -1 : 1`

The Jellyfish_3 sprite is nearly symmetrical, but follows the left-facing convention used by `ClownFish` and `LionFish`. When `direction === 1` (moving right), the canvas is flipped horizontally via `ctx.scale(-1, 1)` centred on the sprite midpoint. If visual verification reveals the sprite actually faces right, the single line `const flipX = direction === 1 ? -1 : 1` changes to `direction === -1 ? -1 : 1` with no other modifications.

## Consequences

- A new `JellyFish` enemy (3 instances per session) spawns throughout the water column, drifting slowly and penalising careless catches.
- `images/fishes/jelly_fish_sprite.png` (2210×588 px) is generated by the PIL script documented in `docs/plans/2026-06-16-jellyfish-enemy.md` Task 1 and must be regenerated if source PNGs change.
- The -25 score penalty introduces the first mid-tier negative score in the roster, extending the hazard design beyond litter items.
