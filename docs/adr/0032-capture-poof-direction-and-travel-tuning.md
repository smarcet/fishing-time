# ADR 0032 — Capture Poof Direction Fix and Travel Distance Tuning

**Date:** 2026-06-18
**Status:** Accepted

## Context

ADR-0030 introduced a directional reward poof that fires at the boat landing target
when a caught entity reaches the fisherman. The initial implementation of
`_getPlayerFrontDirection()` assumed the player sprite's natural orientation
(flipX = 1) was RIGHT-facing:

```js
// Initial (wrong)
return (this._player._state === PLAYER_STATE_MOVING_L) ? Math.PI : 0;
```

In play this produced a poof that consistently sprayed to the RIGHT — directly
behind the fisherman's head. The AC was clear: "The poof must travel toward the
front of the fisherman."

A second issue: the maximum travel distance (~390 px at canvas resolution) was
reported as too short for the 1914-px canvas.

## Investigation

The player draw method (Player.js line 143) computes the horizontal flip at draw
time from the current state:

```js
const flipX = this._state === PLAYER_STATE_MOVING_L ? -1 : 1;
ctx.scale(flipX, 1);
```

`flipX = 1` (no mirror) is the **natural** sprite orientation. A browser canvas
export with the poof firing rightward (angle = 0) showed particles erupting behind
the fisherman's head, confirming the natural sprite is **LEFT-facing**. Firing with
`Math.PI` (left) placed particles in front of the fisherman's face — the correct
behavior.

Facing mapping after the fix:

| Player state | flipX | Visual facing | `_getPlayerFrontDirection()` |
|---|---|---|---|
| IDLE / CAST / REEL / MOVING_R | 1 (natural) | LEFT | `Math.PI` |
| MOVING_L | -1 (mirrored) | RIGHT | `0` |

## Decision

### 1. Invert `_getPlayerFrontDirection()`

```js
// Fixed
_getPlayerFrontDirection() {
  return (this._player && this._player._state === PLAYER_STATE_MOVING_L) ? 0 : Math.PI;
}
```

No other code changes — `_buildCaptureRewardPoof` and `_spawnCapturePoofParticles`
consume `_poofDirAngle` unchanged.

### 2. Increase particle speed by 50%

| Constant | Before | After | Effect |
|---|---|---|---|
| `CAPTURE_POOF_SPEED_MIN` | 3 | 5 | Floor speed higher |
| `CAPTURE_POOF_SPEED_RANGE` | 10 | 15 | Speed range 5–20 px/tick |

Max travel distance: `(5 + 15) × 30 ticks = 600 px` (was `13 × 30 = 390 px`, +54%).
Particle duration is unchanged (22–30 ticks, 367–500 ms at 60 fps).

## Alternatives Considered

### Use `_launchOrigin → _launchTarget` trajectory direction

Rejected in the ADR-0030 addendum (it pointed upper-left, behind the boat).
Reverted again here because it depends on hook geometry, not player facing.

### Store `_lastFlipX` on the Player

Would allow correct facing even after the player stops mid-movement. Deferred —
during a capture the player is in REEL or CAST state (neither involves movement),
so the current state check is sufficient for all real gameplay scenarios.

### Increase `CAPTURE_POOF_LIFE` instead of speed

Increasing life extends both travel distance AND duration. The user request was for
more travel distance only; increasing speed keeps duration constant.

## Tradeoffs

**Gained:**
- Poof consistently erupts from the fisherman's front regardless of position on
  screen.
- Longer particle reach fills more of the canvas at high resolutions (1914-px wide).

**Cost:**
- The natural-sprite orientation (LEFT-facing) is now a documented invariant.
  If a future spritesheet redesign makes the default orientation RIGHT-facing,
  `_getPlayerFrontDirection()` must be inverted again. The comment `// TUNE` in the
  source and this ADR serve as the breadcrumb.

## Consequences

- `_getPlayerFrontDirection()` now returns `Math.PI` in all non-MOVING_L states.
- Existing tests that set `_poofDirAngle = 0` directly are unaffected (they bypass
  the direction helper).
- ADR-0030 updated with a "See Also" pointer to this record.
