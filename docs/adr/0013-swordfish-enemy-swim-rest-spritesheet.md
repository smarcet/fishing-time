# ADR 0013 — SwordFish Enemy: Swim/Rest Spritesheet, Deep-Water Spawn, and Fight Spec Tier

**Date:** 2026-06-16
**Status:** Accepted

## Context

SwordFish is the hardest catchable fish enemy, surpassing HammerHeadShark in both strength and escape rate. The asset pack is distributed as individual PNGs across two animation folders (`swim/keyframes` and `rest/keyframes`), requiring a PIL stitching step. Several decisions arose regarding sprite cell sizing (swim and rest frames have different heights), spawn zone, display size, fight difficulty tier, and drift speed.

## Decisions

### 1. `SwordFish` extends `CatchableFish` via the `spriteFrameSize` pattern

`SwordFish` follows the same two-layer template-method hierarchy as `LionFish`, `Crab`, and `HammerHeadShark`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (1033×416 px) from display size (620×250 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Canonical cell = 1033×416 px (rest-frame height chosen as the larger of the two rows)

The two rows have different natural heights:

| Row | Frames | Native size | Cell treatment |
|-----|--------|-------------|----------------|
| 0   | 16     | 1033×413 px | Center-padded to 1033×416 (2 px top, 1 px bottom) |
| 1   | 16     | 1033×416 px | Native = canonical (no padding) |

The rest-frame height (416 px) is the larger of the two. Using it as the canonical cell height means all cells share identical dimensions for spritesheet indexing (`frameX * _sw, frameY * _sh`), the invariant required by `EnemyWithAnimation`.

### 3. Swim frames center-padded 3 px vertically (2 top, 1 bottom)

Swim frames (1033×413 px) are 3 px shorter than the canonical cell height. Center-padding places the swim sprite vertically centered in the 416 px cell: `y_offset_top = 2`, `y_offset_bottom = 1`. Width is identical (1033 px), so no horizontal padding is needed.

### 4. 2-row layout: Row 0 = swim (16 frames), Row 1 = rest (16 frames); `dieFrameY = 1`

```
Row 0: swim frames — cycled by the base-class animation loop during normal play (maxFrameY = 1)
Row 1: rest frames — accessed via dieFrameY = 1 during the capture animation only
```

Final spritesheet: **16528×832 px** (16 cols × 2 rows × 1033×416 px cells).

`maxFrameY = 1` in the EnemyFactory spec ensures only row 0 cycles during swim. Row 1 is accessed exclusively via `dieFrameY`, consistent with `LionFish` and `HammerHeadShark`.

### 5. Deep-water spawn zone: `WATER_SURFACE_Y + 100` to `canvasHeight − fishHeight`

SwordFish shares the same deep-water spawn zone as HammerHeadShark (`WATER_SURFACE_Y + 100 = 400 px`). Both are the hardest enemies and are intended to occupy the same depth layer, giving players a clear risk signal: anything below 400 px is a hard catch.

```js
static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
  const minY = WATER_SURFACE_Y + 100;
  const maxY = Math.max(minY, canvasHeight - fishHeight);
  return minY + rng() * (maxY - minY);
}
```

### 6. Display size: 620×250 px (≈0.60× canonical cell width, double the initial estimate)

The initial display size estimate was 310×125 px (≈0.30× canonical). After visual review the size was doubled to 620×250 px to give the swordfish an imposing presence in the water consistent with its hardest-enemy tier. The canonical cell (1033×416 px) is downscaled 1.67× by the canvas `drawImage` call, producing visually sharp output with the pixel-art rendering mode.

### 7. Fight spec tier: `strength = 88, escape_rate = 3.5` (hardest fish — above HammerHeadShark)

| Enemy | Strength | Escape rate | Notes |
|-------|----------|-------------|-------|
| butterfly_fish | 5 | 1.5 | Easiest |
| lion_fish | 15 | 2.5 | Medium |
| hammerhead_shark | 80 | 3.0 | Hard |
| **sword_fish** | **88** | **3.5** | **Hardest** |
| crab | 40 | 2.2 | Hard (seabed) |

SwordFish is the hardest catchable fish: 10% stronger than HammerHeadShark and 17% faster escape rate.

### 8. Drift speed: 4.5 px/tick — genuinely fastest fish (above crab at 4.0 px/tick)

| Enemy | Drift speed |
|-------|-------------|
| butterfly_fish / lion_fish | 1.5–2.0 px/tick |
| hammerhead_shark | 3.5 px/tick |
| crab | 4.0 px/tick |
| **sword_fish** | **4.5 px/tick** |

Setting drift speed to 4.5 px/tick (above crab's 4.0) makes SwordFish definitively the fastest-moving enemy. Tying with crab at 4.0 would have created conflicting "fastest" labels across constants.js.

### 9. Sprite facing direction: assumed LEFT (consistent with LionFish and HammerHeadShark)

The sprite sheet faces left by default (consistent with all other catchable fish in the project). The `draw()` method flips horizontally (`ctx.scale(-1, 1)`) when `_direction === 1` (moving right). If a future asset ships facing right, reverse the condition to `direction === -1 ? -1 : 1` in one line.

## Consequences

- `swordfish_sprite.png` (16528×832 px) must be declared as a hidden `<img id="swordfish_sprite">` in `main.html` and added to the `display:none` selector in `main.css` before any JS references it.
- `SWORDFISH_FRAME_WIDTH = 1033`, `SWORDFISH_FRAME_HEIGHT = 416`, `SWORDFISH_MAX_FRAME_X = 16`, `SWORDFISH_DIE_FRAME_Y = 1`, `SWORDFISH_DRIFT_SPEED = 4.5` are the canonical constants — do not change them without regenerating the spritesheet.
- Adding a third animation row (e.g. an attack animation) requires updating the PIL stitching script, incrementing the spritesheet height to 3 × 416 = 1248 px, and adding an `SWORDFISH_ATTACK_FRAME_Y` constant.
