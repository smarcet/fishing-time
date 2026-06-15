# ADR 0008 — Crab Enemy: Seabed Constraint, Spritesheet Layout, and Frame-Row Guard

**Date:** 2026-06-15
**Status:** Accepted

## Context

The crab is the hardest enemy to catch. It must crawl along the seabed (never above), bounce between walls indefinitely, and have a working capture animation. Several design decisions arose during implementation:

- The spritesheet had to be assembled from 30 individual PNG frames (move × 10, die × 10, attack × 10).
- `EnemyWithAnimation.update()` cycles `_frameY` through all rows when `_frameX` wraps, which caused the die-row frames to appear during normal walking when `maxFrameY=2`.
- The crab sprite is front-facing (viewer-toward), not side-facing, which affects the flip logic.
- The seabed-only constraint had to be enforced without any custom movement code.

## Decisions

### 1. `Crab` extends `EnemyWithAnimation` with `spriteFrameSize` (Octopus pattern)

`Crab` follows the same template-method structure as `Octopus`: it overrides `draw()` and `_drawCapturedSprite()` to use separate `_sw`/`_sh` fields for source coordinates, allowing the sprite to be rendered at half its natural size (display `204×98 px`, natural frame `408×197 px`). All capture animation logic (blink, sine arc, shrink, fade) is inherited from `EnemyWithAnimation.drawCaptured()` for free.

### 2. Spritesheet layout: 10 cols × 2 rows (move / die only)

The attack animation (10 additional frames) was deliberately excluded. The assembled spritesheet `images/fishes/crab_sprite.png` (4080×394 px) contains:

| Row | Frames | Source |
|-----|--------|--------|
| 0   | 10     | `Crab_move_1_000..009.png` |
| 1   | 10     | `Crab_die_1_000..009.png`  |

The attack row would require a game-state trigger (proximity to hook, timer) not yet implemented. Adding it later requires only a third row in the spritesheet and a new `CRAB_ATTACK_FRAME_Y` constant.

### 3. `CRAB_MAX_FRAME_Y = 1` — only cycle the move row during normal animation

`EnemyWithAnimation.update()` advances `_frameY` when `_frameX` wraps at `maxFrameX - 1`. With `maxFrameY = 2`, `_frameY` alternated between 0 (move) and 1 (die), rendering death frames during normal walking every ~120 ticks. Setting `maxFrameY = 1` keeps `_frameY` permanently at 0 during normal movement (the condition `frameY < maxFrameY - 1` = `0 < 0` is always false).

The die row is accessed directly via the hardcoded `_dieFrameX = 0`, `_dieFrameY = 1` in `_drawCapturedSprite()` — independent of `_frameY`. Capture animation is unaffected by this constant.

### 4. Seabed-only via spawn Y + inherited wall-bounce

The seabed constraint is enforced entirely by the spawn position:

```js
new Point(0, game.getSize().getHeight() * CRAB_SEABED_FACTOR)  // CRAB_SEABED_FACTOR = 0.85
```

`Enemy.update()` already bounces any enemy at both walls (`lBound === 0 → speedX = +driftSpeed`, `rBound >= width → speedX = -driftSpeed`). No `update()` override is needed in `Crab`. The "never disappears" requirement maps directly to this bounce behavior — the crab never exits the canvas.

When spawned at `x = 0`, `lBound === 0` fires on the first tick and sets `direction = 1`, `speedX = CRAB_DRIFT_SPEED` automatically.

### 5. `CRAB_DRIFT_SPEED = 4.0` — fastest enemy

Speed progression across enemies:

| Enemy  | Speed (px/tick) |
|--------|-----------------|
| Trash  | 0.6             |
| Octopus | 1.5            |
| Fish   | 1.5             |
| Crab   | 4.0             |

The high speed, combined with the seabed depth requiring a full hook descent, makes the crab the hardest to catch without any additional mechanics.

### 6. Front-facing sprite — flip logic has no visible effect

The crab asset (`Crab_move_1_000.png`) faces the viewer (symmetric, no side profile). The `flipX = this._direction === -1 ? -1 : 1` in `draw()` mirrors a symmetric sprite, producing an identical image. The flip logic is kept for correctness parity with other enemies and in case a side-profile spritesheet replaces this one in the future.

## Consequences

- Any future `EnemyWithAnimation` subclass using a multi-row spritesheet where later rows are NOT part of the normal walk cycle must set `maxFrameY = 1` (or however many walk rows exist) and use `dieFrameY` for the capture frame.
- Adding the attack animation requires: (a) a third spritesheet row, (b) a `CRAB_ATTACK_FRAME_Y` constant, (c) a state check in `Crab.update()` to set `_frameY = CRAB_ATTACK_FRAME_Y` under the attack condition.
- `CRAB_SEABED_FACTOR = 0.85` places the crab at 85% of canvas height. On a 768 px canvas the crab top is at ~652 px, bottom at ~750 px — ~18 px above the canvas edge.
