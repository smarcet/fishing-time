# ADR 0005 — Rope Pivot Follows Player Visual State

**Date:** 2026-06-15
**Status:** Accepted

## Context

The rope animation has a top pivot point that must stay attached to the visible rod tip. Two separate systems carry state that affects which sprite is drawn and where the rod tip is:

- `player._state` (`IDLE` / `CAST` / `MOVING_L` / `MOVING_R` / `REEL`) — controls which spritesheet is rendered each frame.
- `hook._status` (`IDLE` / `CAST` / `CATCH`) — controls rope length, swing physics, and catch logic.

These two states desync during reel-in: releasing SPACE immediately sets `player._state = 'IDLE'` (idle sprite, rod pointing up) while `hook._status` stays `'CAST'` until the rope fully retracts to `HOOK_REST_LENGTH`. During this window, two different sprites can be active with only one set of pivot constants.

A separate issue: `Player.getPosition()` already adds `_bobOffset` to Y. Any code that subtracts `_bobOffset` from the result double-strips the bob, making the pivot appear fixed in world space while the sprite oscillates with the boat.

## Decision

**1. Pivot selection uses `player._state`, not `hook._status`.**

```js
// Hook._pivot()
const casting = this._player._state === 'CAST';
const xOffset = casting ? HOOK_CAST_PIVOT_X_OFFSET : HOOK_PIVOT_X_OFFSET;
const yFactor = casting ? HOOK_CAST_PIVOT_Y_FACTOR : HOOK_PIVOT_Y_FACTOR;
```

This ensures the pivot formula always matches the sprite actually being drawn, regardless of hook internal state.

**2. Two calibrated constant pairs — one per sprite.**

| State | Sprite | X offset | Y factor |
|-------|--------|----------|----------|
| `IDLE` / `MOVING_*` / `REEL` | `boat_idle` / `boat_catch` | 45 px | 0.60 |
| `CAST` | `boat_cast` (final frame: rod down-left) | 12 px | 0.65 |

Constants were calibrated visually against the live game at 1:1 scale.

**3. Never subtract `_bobOffset` from `pos.getY()` in `_pivot()`.**

`pos = player.getPosition()` already includes the bob. The pivot Y is simply:

```js
const py = pos.getY() + player.getSize().getHeight() * yFactor;
```

## Consequences

- Adding a new player animation that changes the rod-tip position requires a new constant pair and a corresponding branch in `_pivot()`.
- The pivot is recalculated every frame, so hot-reloading constants is immediate.
- Tests for `_pivot()` must mock `player._state` (not `hook._status`) to select the expected constant branch.
