# ADR 0030 - Capture Completion Animation

**Date:** 2026-06-18
**Status:** Accepted

## Context

Before this change, when a hooked entity was reeled to rest (`_ropeLength <= HOOK_REST_LENGTH`), `Hook.update()` called `clearCaptured()` — dispatching `EVENT_ENEMY_CAPTURED` (score), `EVENT_HOOK_IDLE`, and nulling the catch in a single frame. The entity vanished instantly.

There was a partial rope-progress-driven "throw arc" in `EnemyWithAnimation.drawCaptured()` that shrank and faded the sprite as the rope neared rest, but it:

- Was tied to rope progress, not time — the animation compressed or stretched with reel speed.
- Ended with the sprite at alpha 0 at exactly the rest position, so the catch read as "disappeared" rather than "collected".
- Never produced a distinct "fish enters the boat" moment — the score popup appeared at the hook position (mid-ocean), not at the boat.

The goal was an arcade-like capture feel that matches classic ticket-redemption fishing games: the caught entity visibly flies into the boat, trailing a sparkle effect, and the score popup appears where it lands.

## Decision

Introduce a dedicated, time-driven `HOOK_STATUS_CAPTURE_LAUNCH` phase between "reeled to rest" and "idle".

**Phase lifecycle:**

1. The rope reaches rest while `HOOKED` → `_beginCaptureLaunch()` is called instead of `clearCaptured()`.
2. The hook detaches the catch (`_catch = null`), stores the launch entity in `_launchEntity`, records `_launchOrigin` (current hook tip) and `_launchTarget` (`getLandingTarget()` = boat center), and zeroes a millisecond timer.
3. For the next `CAPTURE_LAUNCH_DURATION_MS` (400 ms), the hook owns the entity, drawing it along an upward parabolic arc (`_drawCaptureLaunch`) and emitting a red sparkle trail (`_spawnCaptureSparkles` + `_drawCaptureTrail`).
4. Alpha is full (1.0) for the first 300 ms, then fades linearly to 0 over the final 100 ms so the entity is clearly visible entering the boat.
5. When the timer elapses, `_finishCaptureLaunch()` dispatches `EVENT_ENEMY_CAPTURED` with `x/y` at the boat landing target (so the score popup appears at the boat), then `EVENT_HOOK_IDLE`, and resets the hook to `IDLE`.

**Trail implementation:** `_spawnCaptureSparkles` pushes particles onto `_captureTrail` each tick; `_drawCaptureTrail` advances, fades, and splices them — mirroring the existing `_buildEscapeHookExplosion` / `_drawEscapeHookExplosion` pattern. The trail is drawn unconditionally in `draw()` so sparkles fade naturally after landing.

**Color tuning:** `CAPTURE_SPARKLE_COLORS` and `CAPTURE_LAUNCH_GLOW_COLOR` live in `src/constants.js` (not as Hook.js module consts) so they can be found and changed in one well-known place alongside the other gameplay constants.

**Removed:** The rope-progress throw-arc block in `EnemyWithAnimation.drawCaptured()` and all associated machinery (`CAPTURE_PHASE_*`, `CAPTURE_THROW_*`, `getCapturePhase`, `getCaptureRawProgress`, `clearCaptured`) are deleted. With the throw arc gone, the hooked sprite stays full-scale and full-alpha right up to the rest position, eliminating the visual pop at launch start.

## Alternatives Considered

### 1. Extend the existing rope-progress throw arc

Improve the rope-progress arc — increase duration, add particles, tune the alpha curve — rather than replacing it with a time-driven phase.

**Rejected because:** rope progress is proportional to reel speed. A player who taps rapidly reaches rest in fewer frames than one who uses auto-reel (trash). The animation would be 200 ms in one case and 800 ms in another. A constant 300–500 ms arcade feel is impossible to guarantee with a rope-progress driver.

### 2. Bubbles or motion-blur trail

Use rising bubbles or a motion-blur streak instead of sparkles for the trail effect.

**Not chosen** (either would work technically). Sparkles were selected by the user as the preferred visual. The implementation pattern (`_escapeParticles` / `_drawEscapeHookExplosion`) was reused regardless of particle appearance.

### 3. Score popup at the hook tip

Dispatch `EVENT_ENEMY_CAPTURED` at the hook position (mid-ocean) at the moment of reel-to-rest, before the launch.

**Rejected because:** the popup would appear in open water far from the boat, then the entity would visually travel to the boat — the score appears before the collection moment. Dispatching at launch-end anchors the popup to `getLandingTarget()` so score, sound, and visual arrival all land at the boat simultaneously.

### 4. Per-entity launch customization

Allow species to override launch arc height, sparkle density, or duration via `FISH_DEFINITIONS`.

**Deferred (out of scope for this change).** One shared look for all species is sufficient for the initial implementation. Per-species tuning can be added to `FISH_DEFINITIONS` entries later without structural change, following the ADR-0027 / ADR-0029 pattern.

## Tradeoffs

**Gained:**
- Consistent 400 ms capture celebration regardless of reel speed — the feel is determined by time, not physics.
- `EVENT_ENEMY_CAPTURED` fires when the fish visually enters the boat — score, audio, and time-bonus all land at the same moment (the intended "collected" beat).
- The sparkle trail reuses the proven escape-particle subsystem; no new particle infrastructure is introduced.
- Color tuning is a one-line change in `constants.js` (`CAPTURE_SPARKLE_COLORS`, `CAPTURE_LAUNCH_GLOW_COLOR`).

**Cost:**
- `EVENT_ENEMY_CAPTURED` now fires ~400 ms after reel-to-rest instead of immediately. All three listeners (`ScoreSystem`, `TimerSystem`, `AudioSystem`) receive it at launch-end. This is the intended behavior but represents a timing shift from the previous contract.
- The hook owns a detached entity reference (`_launchEntity`) during the launch phase. Code that reads `_catch` (e.g. `isCatchableFishHooked()`) correctly sees null during launch; this is documented and intentional.

## Consequences

- `Hook.getStatus()` and `getCaptureTrailCount()` expose the launch phase and particle count to the E2E harness via `Game.getRuntimeStats()` (`hookStatus`, `captureTrailParticles`), enabling deterministic polling in browser tests (TS-001, TS-002, TS-003 in the plan).
- `hadCatch()` is extended to cover both `HOOK_STATUS_HOOKED` and `HOOK_STATUS_CAPTURE_LAUNCH` so the player holds the reel pose for the full 400 ms launch.
- Adding a new capture trail color requires only changing `CAPTURE_SPARKLE_COLORS` in `src/constants.js`. Changing arc height, sparkle density, or duration requires editing the `CAPTURE_LAUNCH_*` / `CAPTURE_SPARKLE_*` module consts in `src/Hook.js` (all marked `- TUNE`).
