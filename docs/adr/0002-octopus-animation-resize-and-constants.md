# ADR 0002: Octopus Animation, Resize, and Named Animation Constants

Date: 2026-06-14
Status: Accepted

## Context

The octopus (`pulpo`) was the largest enemy on screen (489.5 x 397.5 px) and
moved flatly: it inherited the base `Enemy` drift at 1.5 px/tick with no
vertical or rotational motion, and its 4x4 swim spritesheet cycled on every
frame (too fast). It also did not visually react to direction changes - the
sprite always faced the same way regardless of which wall it had last bounced
off. We wanted it to feel alive and in water, and to be half its current size
so other game elements have more visual breathing room.

## Decision

**1. `Octopus` subclass:** Add `class Octopus extends EnemyWithAnimation`
(directly after `Trash`), mirroring the bottle's bob/rock motion model:

- Vertical sine bob: `_bobOffset = 12 px * sin(_bobPhase)`, phase increments
  0.08 rad/tick (~1.3 s period at 60 fps).
- Out-of-phase rotational rock: `_angle = 0.1745 rad * cos(_bobPhase)` (~10 deg).
- Slowed swim cycle: `_staggerFrame = 6` (sprite frame advances every 6 ticks).
- `getPosition()` override: returns `(x, base_y + _bobOffset)` so AABB
  collision tracks the bobbing visual position, not the logical base position.

**2. Direction flip:** `draw()` applies `ctx.scale(flipX, 1)` before rotating,
where `flipX = _direction === -1 ? -1 : 1`. The inherited `Enemy._direction`
field (`+1` right, `-1` left) is set on the first `update()` call because the
octopus spawns at `x=0` (`lBound === 0`), so the flip is active from the start.

**3. Constructor signature:** `Octopus` takes all nine args
`(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY)`
and forwards them to `super`. Unlike `Trash` (which hardcodes sprite row 0 and
CAPTURED source `0,0`), `Octopus.draw()` indexes the full 4x4 sheet
(`_frameX*w, _frameY*h`) and uses `_dieFrameX`/`_dieFrameY` in the CAPTURED
branch, so all four frame params must be defined.

**4. Half size:** `EnemyFactory` octopus spec changed from `Size(489.5, 397.5)`
to `Size(244.75, 198.75)`. Factory `createEnemy('octopus')` builds an `Octopus`
instance (was `EnemyWithAnimation`).

**5. Named animation constants:** Six module-level constants replace the
repeated magic numbers in both `Trash` and `Octopus`:

```js
const ANIM_BOB_AMPLITUDE  = 12;
const ANIM_BOB_SPEED      = 0.08;
const ANIM_MAX_TILT_ANGLE = 0.1745;
const ANIM_STAGGER_SLOW   = 6;
const DRIFT_SPEED_SLOW    = 0.6;
const DRIFT_SPEED_DEFAULT = 1.5;
```

`Enemy._driftSpeed` is initialized from `DRIFT_SPEED_DEFAULT` (was literal
`1.5`). No constructor signatures changed.

## Consequences

- `Octopus` behavior is fully covered headless: 10 new Jest tests in
  `__tests__/octopus.test.js` assert bob math, rock angle, frame stagger, and
  the initial direction. Total suite: 23 tests across 2 files.
- Fish and the bottle (`Trash`) are unmodified (diff scoped to the class
  addition, factory wiring, and constant definitions). Existing 13 Trash tests
  and the EnemyWithAnimation regression tests remain green.
- `module.exports` updated to include `Octopus` for headless testing.
- The octopus hitbox halves with the sprite; capture difficulty changes
  (intended - a smaller target is harder to catch).

## Alternatives Considered

- **Lift bob/rock into `EnemyWithAnimation`:** Would share the mechanism
  with zero code duplication. Deferred (YAGNI) - only two animated enemies need
  it today, and touching the shared base class risks regressions on the
  just-verified bottle. Revisit when a third animated enemy needs the same
  motion.
- **Separate `_direction` flip constant vs. inline ternary:** The flip is a
  single expression keyed on an existing field; a constant would add naming
  complexity for one-line logic. Inline ternary kept.
- **Symmetric `ctx.scale` outside the `save/restore` pair:** Would permanently
  alter the canvas transform state. The `scale` call lives inside `save/restore`
  so it is local to each draw call.
