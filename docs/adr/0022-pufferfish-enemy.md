# ADR 0022 - PufferFish Enemy: Spritesheet Assembly, Row Selection, and Mid-Water Spawn

**Date:** 2026-06-16
**Status:** Accepted

## Context

PufferFish fills a medium-difficulty slot in the enemy roster — rewarding to catch (score 25) but harder to land than ClownFish or ButterflyFish (strength 30, escape_rate 2.2). The Fish_3 asset pack ships as 30 individual PNGs across three animation groups with significantly different native sizes: attack (324×235 px), die (358×305 px), and move (208×111 px). The size disparity forced an explicit choice about which two rows to include in the spritesheet, what canonical cell size to use, and how to handle the size mismatch. Additional decisions arose regarding display size, drift speed, spawn zone, and score value.

## Decisions

### 1. `PufferFish` extends `CatchableFish` via the `spriteFrameSize` pattern

`PufferFish` follows the same two-layer template-method hierarchy as `LionFish`, `Tuna`, `Shark`, `ClownFish`, and `JellyFish`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` using separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (358×305 px canonical cell) from display size (179×152 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Spritesheet rows: Row 0 = attack frames (padded), Row 1 = die frames; move frames excluded

The Fish_3 pack provides three animation groups with substantially different native sizes:

| Group | Frames | Native size |
|-------|--------|-------------|
| Fish_attack_3 | 10 | 324×235 px |
| Fish_die_3 | 10 | 358×305 px |
| Fish_move_3 | 10 | 208×111 px |

Move frames (208×111 px) are less than 60% the width and 36% the height of die frames, making them too small to pad cleanly into the canonical cell without severe upscaling or visible border artifacting. Attack frames (324×235 px) are close in size to the die frames and produce a natural swim animation when looped.

Row 0 (attack/swim) uses the attack frames, padded to the canonical cell size with transparent borders. Row 1 (die/captured) uses the die frames at their natural size.

### 3. Canonical cell is 358×305 px (die-frame natural size); attack frames centred inside

Using the die-frame dimensions as the canonical cell avoids cropping or distorting the die animation and keeps the `frameX * _sw` stride formula consistent across both rows. Attack frames are centred inside the cell:

```
offset_x = (358 - 324) // 2 = 17 px  (centre horizontally)
offset_y = (305 - 235) // 2 = 35 px  (centre vertically)
```

Final spritesheet: **3580×610 px** (10 cols × 358 px, 2 rows × 305 px).

### 4. Display size: 179×152 px (half canonical cell height and width)

`PUFFER_FISH_DISPLAY_H = 152` (305 ÷ 2) and `PUFFER_FISH_DISPLAY_W = 179` (358 ÷ 2). Halving the canonical cell follows the same convention as `Shark` (512→256, 1060→530): the natural frame is large enough to halve while keeping the in-game fish a reasonable screen size. EnemyFactory applies the display size as the destination rectangle; the class uses `spriteFrameSize` for the source stride.

### 5. Score: `25` (medium positive — between ButterflyFish 10 and LionFish 15... above both)

| Enemy | Score |
|-------|-------|
| ClownFish | 5 |
| ButterflyFish | 10 |
| LionFish | 15 |
| **PufferFish** | **25** |
| SwordFish | 150 |
| Tuna | 250 |

PufferFish is worth more than LionFish to reflect its higher difficulty (strength 30 vs 15). Score 25 is well below the large fish (SwordFish 150+), placing it in the "medium reward, medium challenge" tier. `SCORE_MAP` is keyed by `constructor.name`, so the key is `PufferFish` (PascalCase).

### 6. Fight spec: `strength = 30, escape_rate = 2.2` (medium-hard)

| Fish | Strength | Escape Rate |
|------|----------|-------------|
| ClownFish | 5 | 1.2 |
| LionFish | 15 | 2.5 |
| **PufferFish** | **30** | **2.2** |
| Crab | 40 | 2.2 |
| HammerHeadShark | 55 | 2.8 |

PufferFish sits between LionFish and Crab in difficulty. Its escape_rate (2.2) matches Crab but its strength (30) is lower, making it a fast escaper that still requires some reel effort. This combination rewards players who react quickly.

### 7. Drift speed: `PUFFER_FISH_DRIFT_SPEED = 1.5` px/tick (same tier as ClownFish)

PufferFish drifts at 1.5 px/tick, the same rate as ClownFish. Difficulty comes from the escape mechanic (escape_rate 2.2) rather than movement speed. A medium drift speed keeps encounters manageable while the fight spec provides the challenge.

### 8. Spawn zone: `WATER_SURFACE_Y` to `canvasHeight - fishHeight` (full water column)

PufferFish spawns anywhere in the water column, mirroring ClownFish. The full vertical range increases encounter frequency and gives players multiple opportunities to hook one.

### 9. Sprite faces LEFT (ClownFish/Shark convention): `flipX = direction === 1 ? -1 : 1`

The Fish_attack_3 sprite faces left. When `direction === 1` (moving right), the canvas is flipped horizontally via `ctx.scale(-1, 1)` centred on the sprite midpoint, following the same convention as `ClownFish`, `JellyFish`, and `Shark`.

## Consequences

- A new `PufferFish` enemy spawns throughout the water column, offering a medium-difficulty catch worth 25 points.
- `images/fishes/puffer_fish_sprite.png` (3580×610 px) is generated by the PIL script documented in `docs/plans/2026-06-16-pufferfish-enemy.md` Task 1 and must be regenerated if source PNGs change.
- Move frames from Fish_move_3 are intentionally excluded from the spritesheet. If a three-row spritesheet is desired in the future, the PIL assembly script in the plan must be updated to add a third row.
- The 25-point score fills a gap between ButterflyFish (10) and the mid-tier fish, giving players a clear "worth catching" signal without making PufferFish trivially rewarding.
