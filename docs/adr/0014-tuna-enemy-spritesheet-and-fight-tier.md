# ADR 0014 - Tuna Enemy: Spritesheet Assembly, Fight Tier, and Deep-Water Spawn

**Date:** 2026-06-16
**Status:** Accepted

## Context

Tuna fills the top difficulty slot in the fish enemy roster, placed above SwordFish in both strength and escape rate. The asset pack ships as individual 512x300 PNGs across per-animation folders, requiring a PIL stitching step before use. Several decisions arose regarding spritesheet layout, frame padding, fight tier, display size, and drift speed.

## Decisions

### 1. `Tuna` extends `CatchableFish` via the `spriteFrameSize` pattern

`Tuna` follows the same two-layer template-method hierarchy as `LionFish`, `Crab`, `HammerHeadShark`, and `SwordFish`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (512x300 px) from display size (384x225 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` -> `_drawCapturedSprite()` template method.

### 2. No padding needed - all source frames are uniform 512x300 px

Unlike SwordFish (which required 3 px of vertical center-padding due to differing row heights), all Tuna frames from both used animation folders (`swim_left` and `rest_movement_left`) are exactly 512x300 px. The canonical cell equals the source frame; no PIL resize or offset arithmetic is needed.

### 3. 2-row layout: Row 0 = swim_left (8 frames), Row 1 = rest_movement_left (8 frames); `dieFrameY = 1`

```
Row 0: swim_left frames 1-8 (from 8 available PNG files)
Row 1: rest_movement_left frames 1-6 + frame 6 repeated twice (padded to 8)
```

Final spritesheet: **4096x600 px** (8 cols x 512, 2 rows x 300).

The `rest_movement_left` folder has only 6 frames. Padding to 8 by repeating the last frame twice avoids a special-case row width and keeps the `frameX * _sw` stride formula universal. The repeated frame is visually identical to a held rest pose, which is the correct appearance at the end of the rest cycle.

`maxFrameY = 1` in the EnemyFactory spec ensures only row 0 cycles during swim. Row 1 is accessed exclusively via `dieFrameY = 1`, consistent with `LionFish`, `HammerHeadShark`, and `SwordFish`.

### 4. Fight spec tier: `strength = 90, escape_rate = 3.5` (hardest - above SwordFish)

| Fish | Strength | Escape Rate |
|------|----------|-------------|
| ButterflyFish | 5 | 1.5 |
| LionFish | 15 | 2.5 |
| Octopus | 20 | 1.8 |
| Crab | 40 | 2.2 |
| HammerHeadShark | 80 | 3.0 |
| SwordFish | 88 | 3.5 |
| **Tuna** | **90** | **3.5** |

Tuna shares SwordFish's escape rate (3.5) but has slightly higher strength (90 vs 88), placing it narrowly above SwordFish as the hardest catchable fish. The fight mechanic (`strength * escape_rate * dt_sec`) produces a marginally faster struggle meter than SwordFish.

### 5. Deep-water spawn zone: `WATER_SURFACE_Y + 100` to `canvasHeight - fishHeight`

Tuna shares the same deep-water spawn zone as HammerHeadShark and SwordFish. All three are the hardest enemies and occupy the same depth layer, giving players a clear risk signal: anything below 400 px is a hard catch.

### 6. Display size: 384x225 px (75% of canonical cell)

The canonical cell (512x300 px) is downscaled to 384x225 px (75%) for display. This gives Tuna a large, imposing presence while keeping it slightly smaller than SwordFish's 620x250 px footprint, consistent with the visual hierarchy (SwordFish is the biggest enemy).

### 7. Drift speed: `TUNA_DRIFT_SPEED = 4.0` px/tick

Tuna drifts at 4.0 px/tick, below SwordFish (4.5) and above Crab (4.0 is actually equal to Crab's seabed speed, but Tuna is a pelagic swimmer, not a bottom-crawler). The speed is intentionally close to SwordFish to keep the deep-water zone equally challenging.

### 8. `swim_right` and `snapping` animations not used

The asset pack includes `swim_right`, `swim_right_snapping`, `swim_left_snapping`, `open_mouth_left`, `close_mouth_left` folders. None are wired:

- Direction reversal is handled by canvas `ctx.scale(-1, 1)` on the left-facing sprite, matching every other directional fish.
- Snapping and mouth animations are future-facing features not required for the base enemy behaviour.
