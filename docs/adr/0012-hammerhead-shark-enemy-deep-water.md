# ADR 0012 — HammerHeadShark Enemy: Deep-Water Spawn, Spritesheet Assembly, and Fight Spec Tier

**Date:** 2026-06-16
**Status:** Accepted

## Context

The HammerHeadShark is the hardest catchable fish enemy, intended to occupy the deep-water layer below LionFish. The Shark_2 asset pack is distributed as 30 individual PNGs (10 move + 10 die + 10 attack), requiring a stitching step. Several decisions arose during implementation regarding sprite cell sizing, spawn zone, display size, and fight difficulty tier.

## Decisions

### 1. `HammerHeadShark` extends `CatchableFish` via the `spriteFrameSize` pattern

`HammerHeadShark` follows the same two-layer template-method hierarchy as `LionFish` and `Crab`: it extends `CatchableFish` and overrides `draw()` and `_drawCapturedSprite()` with separate `_sw`/`_sh` fields sourced from `spriteFrameSize`. This decouples source-frame stride (798×463 px) from display size (200×116 px) without modifying the base class.

All capture glow, blink, arc, and shrink animations are inherited from `EnemyWithAnimation.drawCaptured()` for free via the `drawCaptured()` → `_drawCapturedSprite()` template method.

### 2. Canonical cell = 798×463 px (die-frame size, the largest across both rows)

The two rows have different natural sizes:

| Row | Frames | Native size | Cell treatment |
|-----|--------|-------------|----------------|
| 0   | 10     | 773×382 px  | Center-padded to 798×463 (`x_offset=12, y_offset=40`) |
| 1   | 10     | 798×463 px  | Native = canonical (no padding) |

The die-frame size (798×463) is the largest across both rows. Using it as the canonical cell stride means all cells share identical dimensions for spritesheet indexing (`frameX * _sw, frameY * _sh`), which is the invariant required by `EnemyWithAnimation`.

### 3. Move frames center-padded; attack row excluded

Move frames (773×382 px) are smaller than the canonical cell. Center-padding (`x_offset = (798-773)//2 = 12`, `y_offset = (463-382)//2 = 40`) places the shark in the center of each cell while keeping stride uniform.

The attack row (`Shark_attack_2_*.png`, native 804×395 px) was excluded. The game has no attack state. Adding it later requires a third spritesheet row and a `HAMMERHEAD_SHARK_ATTACK_FRAME_Y` constant.

### 4. Deep-water spawn zone: `WATER_SURFACE_Y + 100` to `canvasHeight - fishHeight`

HammerHeadShark is harder to reach than LionFish, so its spawn zone is pushed 100 px deeper:

```js
static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
  const minY = WATER_SURFACE_Y + 100;           // 400 px — deeper than LionFish (300 px)
  const maxY = Math.max(minY, canvasHeight - fishHeight);
  return minY + rng() * (maxY - minY);
}
```

The `Math.max(minY, maxY)` guard prevents a degenerate range when the canvas is very small. The full canvas-height ceiling (vs LionFish's `0.7 × canvasHeight`) ensures the shark has a meaningful spawn range even on typical screens (768px canvas → range [400, 420]; 1080px → [400, 732]). An earlier `0.8 × canvasHeight - fishHeight` formula was discarded because with a 348 px display height it collapsed to minY=400 on any canvas under ~935 px, giving zero variability.

### 5. Display size: 600×348 px (approximately 0.75× of sprite cell)

798×463 at ×0.75 scale ≈ 600×348. This is 3× larger than the original 200×116 prototype, making the shark the most visually dominant enemy in the game. The 600:348 ratio preserves the original sprite's aspect ratio (798:463 ≈ 1.72:1).

### 6. Fight spec tier: `strength = 80, escape_rate = 3.0`

HammerHeadShark is the hardest fish — one tier above Crab:

| Enemy            | Strength | Escape rate |
|------------------|----------|-------------|
| ButterflyFish    | 5        | 1.5         |
| LionFish         | 15       | 2.5         |
| Crab             | 40       | 2.2         |
| HammerHeadShark  | 80       | 3.0         |

`strength = 80` and `escape_rate = 3.0` together make the struggle bar drain very fast, requiring sustained rapid Space presses. The pre-existing `shark: { strength: 60, escape_rate: 3.0 }` entry in `FISH_SPECS` is a reserved placeholder for a future generic shark — `hammerhead_shark` is a distinct key at a higher tier.

### 7. Drift speed: 3.5 px/tick

Between LionFish (2.0) and Crab (4.0):

| Enemy            | Drift speed |
|------------------|-------------|
| LionFish         | 2.0 px/tick |
| HammerHeadShark  | 3.5 px/tick |
| Crab             | 4.0 px/tick |

This makes the shark faster than any fish but slightly slower than the Crab, reinforcing the "hardest fish" positioning.

### 8. Sprite facing direction: assumed LEFT (same as LionFish / ButterflyFish)

Flip condition: `direction === 1 ? -1 : 1` (flip when going right).

If visual verification shows the sprite actually faces RIGHT, change the flip condition to `direction === -1 ? -1 : 1` and update the direction-flip assertions in `__tests__/hammerheadshark.test.js` accordingly.

### 9. `randomSpawnX` inherited from `CatchableFish`

No override needed — the shark spawns anywhere along the horizontal axis just like ButterflyFish and LionFish. The `CatchableFish.randomSpawnX` static method (introduced in ADR 0011) covers this for free.

## Consequences

- The deep-water zone (minY = `WATER_SURFACE_Y + 100`) creates a distinct vertical layer: surface fish (ButterflyFish), mid-water (LionFish), deep-water (HammerHeadShark), seabed (Crab/Octopus). Future enemies can slot into these bands.
- The `Math.max(minY, maxY)` guard in `randomSpawnY` is now used by both LionFish and HammerHeadShark — it is the canonical pattern for bounded spawn ranges.
- The sprite-facing assumption (LEFT) must be verified visually each time a new Shark_N asset pack is introduced; different packs may face different directions.
- Adding the attack animation requires: (a) a third row in the spritesheet, (b) `HAMMERHEAD_SHARK_ATTACK_FRAME_Y` constant, (c) a state-check in `HammerHeadShark.update()`.
