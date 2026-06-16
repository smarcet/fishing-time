# ADR 0015 - ClownFish Enemy: Spritesheet Assembly, Fight Tier, and Full-Water Spawn

**Date:** 2026-06-16
**Status:** Accepted

## Context

ClownFish fills the easy-tier slot in the fish enemy roster, placed below ButterflyFish in both strength and escape rate. The Fish_2 asset pack ships as individual PNGs across per-animation folders with two distinct native sizes (move: 231×135 px, die: 342×321 px), requiring a PIL stitching step and a centering decision before use. Several decisions arose regarding spritesheet layout, canonical cell size, fight tier, display size, drift speed, and spawn zone.

## Decisions

### 1. `ClownFish` extends `CatchableFish` via the `spriteFrameSize` pattern

`ClownFish` follows the same two-layer template-method hierarchy as `LionFish`, `Tuna`, `HammerHeadShark`, and `SwordFish`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (342×321 px canonical cell) from display size (114×107 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Canonical cell is 342×321 px (die-frame natural size); move frames centred inside

The Fish_2 pack provides two used animation groups with different natural sizes:
- `Fish_move_2`: 10 frames at 231×135 px
- `Fish_die_2`: 10 frames at 342×321 px

Using the larger die-frame dimensions as the canonical cell avoids distorting the captured-pose sprite and keeps the `frameX * _sw` stride formula universal across both rows. Move frames are centred inside the cell with a transparent surround:

```
offset_x = (342 - 231) // 2 = 55 px
offset_y = (321 - 135) // 2 = 93 px
```

Final spritesheet: **3420×642 px** (10 cols × 342 px, 2 rows × 321 px).

### 3. 2-row layout: Row 0 = Fish_move_2 (10 frames), Row 1 = Fish_die_2 (10 frames); `dieFrameY = 1`

`maxFrameY = 1` in the EnemyFactory spec ensures only row 0 cycles during swim. Row 1 is accessed exclusively via `dieFrameY = 1`, consistent with `LionFish`, `HammerHeadShark`, `SwordFish`, and `Tuna`. The `_drawCapturedSprite()` override accesses the die row directly (`dieFrameX * _sw, dieFrameY * _sh`) without going through the frame animation cycle.

### 4. Fight spec tier: `strength = 5, escape_rate = 1.2` (easiest catchable fish)

| Fish | Strength | Escape Rate |
|------|----------|-------------|
| **ClownFish** | **5** | **1.2** |
| ButterflyFish | 5 | 1.5 |
| LionFish | 15 | 2.5 |
| Octopus | 20 | 1.8 |
| Crab | 40 | 2.2 |
| HammerHeadShark | 80 | 3.0 |
| SwordFish | 88 | 3.5 |
| Tuna | 90 | 3.5 |

ClownFish shares ButterflyFish's strength (5) but has a lower escape rate (1.2 vs 1.5), making it the easiest fish to catch. This positions it as an accessible entry point for players new to the fight mechanic.

### 5. Score: 5 points on capture

ClownFish awards 5 points on capture, the minimum score in the roster. Low reward matches low difficulty — the fish is easy to catch and yields proportionally little.

### 6. Full-water spawn zone: `WATER_SURFACE_Y` to `canvasHeight - fishHeight`

ClownFish spawns across the full water column, matching ButterflyFish. Both are easy-tier fish and share the same visual depth layer, giving players ample opportunity to catch them regardless of hook depth.

### 7. Display size: 114×107 px (~1/3 of canonical cell)

The canonical cell (342×321 px) is downscaled to 114×107 px (~33%) for display. This gives ClownFish a small, approachable size consistent with ButterflyFish's visual footprint and reinforces the easy-tier identity.

### 8. Drift speed: `CLOWN_FISH_DRIFT_SPEED = 1.5` px/tick (same as ButterflyFish)

ClownFish drifts at 1.5 px/tick, matching ButterflyFish. Both easy-tier fish share the slowest drift speed in the roster, making them the easiest to intercept with the hook.

### 9. `Fish_attack_2` animation not used

The asset pack includes a `Fish_attack_2` folder. It is not wired:

- Direction reversal is handled by canvas `ctx.scale(-1, 1)` on the left-facing sprite, matching every other directional fish.
- Attack animations are future-facing features not required for the base enemy behaviour.
