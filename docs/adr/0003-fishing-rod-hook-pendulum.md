# ADR 0003: Fishing Rod Hook — Pendulum Swing and Angle-Frozen Cast

Date: 2026-06-14
Status: Accepted

## Context

The hook (`Hook` class, `index.js`) only moved straight down. `update()` incremented
the hook's Y by 5 px/tick while Space was held, with X permanently fixed to the
player's X. The rope was drawn as a vertical dashed line. There was no concept of
an angle anywhere in the hook — "la captura" (the catch) could only happen directly
below the rod tip.

We wanted the idle hook to swing pendularly from side to side so the player must time
the Space press, and for the cast to travel along the frozen fire-time angle (rope
visibly inclined) so captures are possible at any allowed swing angle.

## Decision

**1. Pendulum geometry — pivot, rope length, angle:**

The hook hangs from a pivot at the rod tip, on a rope of length `L`, at angle `θ`
measured from straight-down (positive = right):

```
pivotX   = player.getPosition().getX() + HOOK_PIVOT_X_OFFSET
pivotY   = player.getPosition().getY() + player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR
endpointX = pivotX + L * sin(θ)
endpointY = pivotY + L * cos(θ)
```

`getPosition()` is **overridden** (same pattern as `Trash`/`Octopus`) to return the
endpoint as a top-left corner: `new Point(endpointX - w/2, endpointY)`. This single
override makes collision, catch rendering, and rope drawing all track the angled
position with no changes to `Game`, `Enemy`, or the capture flow.

Two private helpers `_pivot()` and `_endpoint()` compute these values fresh each
frame (~4 trig calls/frame — negligible; mirrors `Trash.getPosition()` recomputing
on every call).

**2. State machine — IDLE / CAST / CATCH:**

Replaced the key-driven straight-down logic with three states:

- **IDLE** — automatic sinusoidal swing: `_swingPhase += HOOK_SWING_SPEED;`
  `_angle = HOOK_MAX_SWING_ANGLE * Math.sin(_swingPhase)`. Mirrors the
  `Trash`/`Octopus` bob/rock motion model.
- **CAST** — hook travels along the frozen angle; `_ropeLength` grows by
  `HOOK_CAST_SPEED` per tick until Space is released or the depth limit is reached,
  then retracts by `HOOK_REEL_SPEED` until it returns to rest.
- **CATCH** — set externally by `setCatch(fish)`; retracts along `_castAngle` until
  rest, then calls `clearCaptured()` → IDLE.

The idle state was previously named `'NONE'`; it is renamed `'IDLE'` to make the
vocabulary explicit. `hadCatch()` and `setCatch()` keep `'CATCH'` semantics
unchanged (`Game`'s collision loop at `index.js:751` depends on `hadCatch()`).

**3. Angle freeze at fire-time — explicit `_castAngle` field:**

`_angle` is the live swing angle (updated only in IDLE). `_castAngle` is a separate
field captured at the IDLE→CAST transition:

```js
this._castAngle = this._angle;
this._status = 'CAST';
```

`_endpoint()` selects the active angle: `const a = (this._status === 'IDLE') ? this._angle : this._castAngle;`

Making the freeze explicit (rather than "stop advancing the phase") removes any
dependence on update ordering and makes the cast angle directly assertable in tests.

**4. Depth bound:** cast extends while
`_endpoint().getY() < gameHeight * HOOK_MAX_DEPTH_FACTOR` (`0.95` of canvas height)
to prevent the hook from leaving the visible area.

**5. Named `HOOK_*` constants (8 total):**

```js
const HOOK_PIVOT_X_OFFSET   = 45;     // px - rod-tip x offset from player left edge
const HOOK_PIVOT_Y_FACTOR   = 0.6;    // fraction of player height - rod-tip y
const HOOK_REST_LENGTH      = 60;     // px - rope length while idle
const HOOK_MAX_SWING_ANGLE  = 0.5236; // rad - max pendulum angle from vertical (~30 deg)
const HOOK_SWING_SPEED      = 0.04;   // rad/tick - swing phase advance (~2.6 s period at 60 fps)
const HOOK_CAST_SPEED       = 5;      // px/tick - rope extension speed while casting
const HOOK_REEL_SPEED       = 5;      // px/tick - rope retraction speed while reeling
const HOOK_MAX_DEPTH_FACTOR = 0.95;   // fraction of canvas height - deepest the hook can descend
```

All tunables are constants; adjusting feel requires no structural change.

**6. Jest testability:**

`Hook` was not exported and its constructor called `document.getElementById('hook')`
(fails under Jest). Two targeted changes enable headless testing:

- Guard the lookup: `this._image = (typeof document !== 'undefined') ? document.getElementById('hook') : null;`
- Add `Hook` to `module.exports`.

36 new tests in `__tests__/hook.test.js` cover: idle swing math, `getPosition()`
projection at known angle + rope length, cast freeze (`_castAngle === _angle`),
cast-angle invariance across CAST updates, rope grow/shrink by the speed constants,
and reel-to-IDLE. No canvas needed for geometry/state tests.

## Consequences

- Capture ("la captura") now works at any swing angle, not only straight-down;
  the player must time the Space press to aim.
- `Player`, `Enemy`, `Trash`, `Octopus`, `Game`, and the entire collision/catch
  flow are untouched — the diff is scoped to the constants block, the `Hook` class,
  and `module.exports`.
- Total Jest suite: 36 Hook tests + 10 Octopus + 13 Trash = 59 tests, 0 failures.
- The hook hitbox travels along the inclined rope; fish must be in the path of
  the angled cast to be caught (intended — adds a skill dimension).
- All tunables (swing amplitude, speed, cast speed, depth limit) are named
  constants; balancing requires no code restructuring.

## Alternatives Considered

- **Arrow-key aiming instead of automatic pendulum:** Would give the player direct
  control of the angle at the cost of the timing mechanic. Deferred — the user
  chose automatic pendulum (player times the Space press).
- **Curved/continued-swing cast instead of freeze-at-fire-time:** The hook would
  keep swinging during the cast. Deferred — the user chose freeze-at-fire-time,
  which is simpler to reason about and directly assertable in tests.
- **Halt the phase instead of an explicit `_castAngle` field:** Stopping
  `_swingPhase` from advancing would freeze the live angle, but it creates an
  implicit coupling between update ordering and the freeze moment. An explicit
  field decouples the freeze and survives order changes.
- **Physics-accurate pendulum period (gravity-accurate `2π√(L/g)`):** A sinusoidal
  approximation matches the existing `Trash`/`Octopus` motion model and is
  sufficient for gameplay. No physics realism needed.
- **Lift `_pivot()`/`_endpoint()` into `GameObject` or `Enemy`:** Only `Hook` uses
  pendulum geometry today. YAGNI — mirror the `Trash`/`Octopus` per-class override
  pattern and revisit if a second pendulum object appears.
