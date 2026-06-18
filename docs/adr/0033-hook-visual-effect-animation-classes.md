# ADR-0033: Hook Visual Effect Animation Classes

**Date:** 2026-06-18
**Status:** Accepted

## Context

`Hook.js` accumulated all three of its visual effects inline: the escape explosion,
the capture launch arc, and the landing poof. Low-level canvas state (particle
arrays, elapsed timers, arc math, glow interpolation) lived directly in `Hook`,
mixed with the hook state machine, rope physics, and event dispatch. This made
the effects hard to read, tune, and test independently.

## Decision

Extract the three effects into dedicated classes:

- `src/CaptureLaunchAnimation.js` -- parabolic arc flight with shrink/fade/glow
- `src/CapturePoofAnimation.js` -- directional fan starburst at boat landing
- `src/EscapeExplosionAnimation.js` -- radial burst at hook when fish escapes

Each class owns its own state, constants, update logic, and draw logic. Hook
orchestrates WHEN animations start and finish but holds no low-level drawing
details. All three follow the informal interface: `start(config)`, `update(dt)`,
`draw(ctx)`, `isFinished()`, `reset()`.

## Update/Draw Split

Before this refactor, particle advancement (position, velocity, life decrement)
happened inside each effect's `draw()` method. The game loop runs `update(dt)`
then `draw()` exactly once per frame, so moving advancement to `update()` and
keeping `draw()` as a pure render produces frame-identical output. Animations
started mid-update() are advanced once before draw(), matching the old behavior.

## Escape Branch Restructure

The HOOKED escape path previously ended with `return;` to skip the rope-rest
trigger (`_beginCaptureLaunch`) that follows it. After the escape, `_status` is
`HOOK_STATUS_IDLE`, so the `return;` was replaced with a status guard:

```js
if (this._status === HOOK_STATUS_HOOKED && this._ropeLength <= HOOK_REST_LENGTH) {
  this._beginCaptureLaunch();
}
```

This lets the end-of-update animation advances (`capturePoof.update(dt)` and
`escapeExplosion.update(dt)`) run on the escape frame, which is required for the
spawn-frame advance to match the old draw()-based advancement.

## Constant Ownership

Browser `<script>` tags share one global lexical scope; declaring the same `const`
in two files throws "Identifier already declared", blanking the canvas. Each moved
constant lives in exactly one file:

| File | Owns |
|------|------|
| `CaptureLaunchAnimation.js` | `CAPTURE_LAUNCH_ARC_Y`, `CAPTURE_LAUNCH_SCALE_START`, `CAPTURE_LAUNCH_GLOW_BLUR`, `CAPTURE_LAUNCH_GLOW_BLUR_PEAK` |
| `CapturePoofAnimation.js` | all nine `CAPTURE_POOF_*` constants |
| `EscapeExplosionAnimation.js` | all ten `HOOK_PARTICLE_*` constants |

`CAPTURE_LAUNCH_DURATION_MS`, `CAPTURE_LAUNCH_GLOW_COLOR`, and
`CAPTURE_ESCAPE_PARTICLES` remain in `src/constants.js` (already there before
this ADR) and are consumed as globals by the animation classes.

## CapturePoofAnimation.start() Signature

The user's spec listed `start({x, y})`. The existing poof is a directional fan
aimed by player facing, not a radial burst. Passing `{x, y}` only would have
silently changed the visual. The signature was extended to `start({x, y, dirAngle})`
so Hook can supply the player-facing angle and preserve the exact fan direction.
The future plan to make this directional rather than radial remains inside
`CapturePoofAnimation`.

## Draw Order

The three animations are drawn in the same z-order as before the refactor
(escape explosion at back, capture poof in middle, capture launch arc on top).

## Test Strategy

Three new unit test suites (one per animation class) cover:
- `start()` particle count and initial position
- `update()` advances particles exactly once per call (pins the update/draw split)
- `draw()` is a pure render with no state mutation
- Deactivation/`isFinished()` after all particles expire
- `reset()` clears all state

Six tests were migrated from `__tests__/hook.test.js` to the new suites.
Orchestration and event-timing tests remain in `hook.test.js`, which also gained a
spawn-frame advance pin for the escape explosion.

Hook.js shrank from 488 lines to 348 lines.
