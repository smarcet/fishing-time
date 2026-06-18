# Hook Visual Effect Animation Classes — Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

`src/Hook.js` (488 lines) mixes six concerns: the hook state machine, rope/cast/
reel input, catch & fish-escape logic, event dispatching, AND the low-level
canvas drawing for three visual effects. The drawing internals (particle arrays,
arc math, glow/scale/alpha) make the class hard to read and tune.

This refactor **moves the three visual effects into dedicated animation classes**,
each owning its own state, timing, `update(dt)`, and `draw(ctx)`. Hook keeps full
control of WHEN each animation starts/finishes but holds no drawing details.

**Hard constraints (from the user, double-starred):**
1. **Do not change any behavior** — gameplay, events, timing, AND visuals stay
   pixel-equivalent.
2. **Browser E2E must pass — no blue screen** (no script error blanking the canvas).

## Approach

Three standalone classes (no shared base class — matches the project's
one-class-per-file vanilla-JS style; the user confirmed formal inheritance isn't
required). Each follows the informal interface `start(config)`, `update(dt)`,
`draw(ctx)`, `isFinished()`, `reset()`.

Hook instantiates one of each in its constructor, delegates drawing, and keeps the
orchestration fields the existing tests and the `EVENT_ENEMY_CAPTURED` payload
depend on (`_launchEntity`, `_launchTarget`).

### Behavior-preservation: the update/draw split (critical)

Today all three effects **advance their particles inside `draw()`** (e.g.
`_drawEscapeHookExplosion` mutates positions then renders). The game loop runs
`update(dt)` then `draw()` exactly once per frame (`Player.update`→`hook.update`,
`Player.draw`→`hook.draw`), so moving advancement into `update(dt)` and making
`draw(ctx)` a pure render produces identical frames — the same-frame advance is
preserved because `update` runs before `draw`.

**One subtlety — the escape early-return.** The HOOKED escape branch currently
ends with `return;` (Hook.js:218), which would skip an end-of-`update` advance on
the escape frame. To keep the escape explosion advancing on its spawn frame
(matching today's draw-time advance) without that `return`:
- Remove the `return;` at the end of the escape branch.
- Guard the capture-launch trigger so it stays escape-safe:
  `if (this._status === HOOK_STATUS_HOOKED && this._ropeLength <= HOOK_REST_LENGTH) { this._beginCaptureLaunch(); }`
  (the `return` previously protected this line; the status guard replaces it —
  after escape, status is IDLE, so the trigger is correctly skipped and `_catch`
  is never dereferenced as null).

### Draw order (z-order) preserved

Hook.draw currently layers escape → poof → launch (Hook.js:279-281). The new
calls keep that exact order (escape bottom, launch top), NOT the order listed in
the spec prose, to avoid any layering change.

### Constants ownership (and the blue-screen risk)

In the browser all files are classic `<script>`s sharing one global lexical
environment, so a top-level `const` declared in two files throws
"Identifier already declared" → script error → **blank/blue canvas**. Therefore
each tunable moves to **exactly one** home and is **deleted from Hook.js**:

| New file | Owns (moved from Hook.js) | Reads as globals (from constants.js) |
|----------|---------------------------|--------------------------------------|
| `CaptureLaunchAnimation.js` | `CAPTURE_LAUNCH_ARC_Y`, `CAPTURE_LAUNCH_SCALE_START`, `CAPTURE_LAUNCH_GLOW_BLUR`, `CAPTURE_LAUNCH_GLOW_BLUR_PEAK` | `CAPTURE_LAUNCH_DURATION_MS`, `CAPTURE_LAUNCH_GLOW_COLOR`, `Point` |
| `CapturePoofAnimation.js` | all 9 `CAPTURE_POOF_*` consts (+ inline literals `shadowBlur=10`, `g=random*180`, kept verbatim) | — |
| `EscapeExplosionAnimation.js` | all 10 `HOOK_PARTICLE_*` consts | `CAPTURE_ESCAPE_PARTICLES` |

Hook.js keeps only `MILLIS_PER_SECOND`, `HOOK_IMAGE_ID`, the rope consts, and the
debug consts. After refactor Hook references **no** `CAPTURE_*`/`HOOK_PARTICLE_*`
constant (the launch branch uses `captureLaunch.isFinished()` instead of comparing
`_launchElapsedMs >= CAPTURE_LAUNCH_DURATION_MS`).

## Files & Changes

### NEW: `src/EscapeExplosionAnimation.js`
- `constructor(ctx)`, `_particles = []`.
- `start({x, y})` — radial burst of `CAPTURE_ESCAPE_PARTICLES`, identical math to
  `_buildEscapeHookExplosion` (Hook.js:451-462).
- `update(dt)` — advance x/y, `vy += HOOK_PARTICLE_GRAVITY`, `life--`, splice
  expired (the mutation half of `_drawEscapeHookExplosion`, Hook.js:285-291).
- `draw(ctx)` — pure render of survivors with `t = life/maxLife` (render half,
  Hook.js:292-301).
- `isFinished()` → `_particles.length === 0`; `reset()` → `_particles = []`.

### NEW: `src/CapturePoofAnimation.js`
- `constructor(ctx)`, `_particles`, `_active`, `_x`, `_y`, `_dirAngle`.
- `start({x, y, dirAngle = 0})` — store position+angle, spawn 35 directional fan
  particles (port of `_buildCaptureRewardPoof`+`_spawnCapturePoofParticles`,
  Hook.js:349-375), set `_active = true`. **`dirAngle` added per user confirmation
  to preserve the directional fan.**
- `update(dt)` — advance, `life--`, splice; set `_active=false` when empty (mutation
  half of `_drawCapturePoof`, Hook.js:380-385,397).
- `draw(ctx)` — pure render, gated on `_active` (render half, Hook.js:386-396),
  literal `shadowBlur = 10` kept.
- `isActive()` → `_active`; `isFinished()` → `!_active`; `reset()`.

### NEW: `src/CaptureLaunchAnimation.js`
- `constructor(ctx)`, `_entity`, `_origin`, `_target`, `_elapsedMs`, `_active`.
- `start({entity, origin, target})` — store refs, `_elapsedMs=0`, `_active=true`.
- `update(dt)` — `if active: _elapsedMs += dt`.
- `isFinished()` → `_active && _elapsedMs >= CAPTURE_LAUNCH_DURATION_MS`.
- `getTarget()` → `_target`.
- `_point(t)` — parabolic arc (port of `_captureLaunchPoint`, Hook.js:337-343).
- `draw(ctx)` — gated on `_active && _entity`; identical scale=(1-t), alpha=(1-t),
  glow interpolation, rotate, offsets, double `_drawCapturedSprite` (port of
  `_drawCaptureLaunch`, Hook.js:400-421).
- `reset()` — clear refs + `_active=false`.

### MODIFY: `src/Hook.js`
- Constructor: replace the removed effect-state fields (`_escapeParticles`,
  `_launchOrigin`, `_launchElapsedMs`, `_poofActive/_poofT/_poofX/_poofY/
  _poofDirAngle`, `_capturePoofParticles`) with three instances:
  `this._captureLaunch = new CaptureLaunchAnimation(ctx)` etc.
  **Keep** `_launchEntity` and `_launchTarget` (orchestration + event payload).
- `update()`:
  - HOOKED escape branch: replace `_buildEscapeHookExplosion(this._endpoint())`
    with `const ep = this._endpoint(); this._escapeExplosion.start({x: ep.getX(), y: ep.getY()});`
    Remove the trailing `return;` and add the `_status === HOOK_STATUS_HOOKED`
    guard to the rope-rest trigger (see Approach).
  - CAPTURE_LAUNCH branch: `this._captureLaunch.update(dt); if (this._captureLaunch.isFinished()) this._finishCaptureLaunch();`
  - End of `update()` (every frame): `this._capturePoof.update(dt); this._escapeExplosion.update(dt);`
- `_beginCaptureLaunch()`: set `_launchTarget`/`_launchEntity`, call
  `this._captureLaunch.start({entity, origin: this.getEndpoint(), target: this._launchTarget})`,
  null `_catch`, set status. (Drop `_launchOrigin`/`_launchElapsedMs`.)
- `_finishCaptureLaunch()` — **strict ordering (read-before-null)**: (1) start the
  poof from `_launchTarget` + `_getPlayerFrontDirection()`; (2) dispatch
  `EVENT_ENEMY_CAPTURED` (detail reads `_launchEntity.constructor.name` and
  `_launchTarget.getX()/getY()`) + `EVENT_HOOK_IDLE` — payload/timing **unchanged**;
  (3) ONLY THEN `this._captureLaunch.reset()`, null `_launchEntity`/`_launchTarget`,
  reset progress/flags/status/rope. The event payload and poof position MUST be read
  before any field is nulled (should_fix #3).
- `draw()`: replace the three `_draw*` calls with `this._escapeExplosion.draw(this._ctx); this._capturePoof.draw(this._ctx); this._captureLaunch.draw(this._ctx);` (order preserved).
- `getCaptureTrailCount()` → `this._capturePoof.isActive() ? 1 : 0`.
- **Delete** `_drawEscapeHookExplosion`, `_buildEscapeHookExplosion`,
  `_buildCaptureRewardPoof`, `_spawnCapturePoofParticles`, `_drawCapturePoof`,
  `_captureLaunchPoint`, `_drawCaptureLaunch`, and the moved consts.
- **Keep** `_getPlayerFrontDirection` (reads `_player._state`).

### MODIFY: `index.js`
Add three `require` + `global.*` lines before the `Hook` line (39) and three
entries to `module.exports` (line 43):
`const { CaptureLaunchAnimation } = require('./src/CaptureLaunchAnimation'); global.CaptureLaunchAnimation = CaptureLaunchAnimation;` (and the other two).

### MODIFY: `main.html`
Add three `<script>` tags **before** `src/Hook.js` (line 44), after `Shark.js`
(line 43):
```html
<script src="src/CaptureLaunchAnimation.js?v=1"></script>
<script src="src/CapturePoofAnimation.js?v=1"></script>
<script src="src/EscapeExplosionAnimation.js?v=1"></script>
```
Bump Hook.js cache-buster (`?v=3` → `?v=4`).

### Tests (parsimonious: 1 unit test class per new class; migrate, don't duplicate)

**must_fix — pin the update/draw split's spawn-frame advance count (the one
behavior the split could silently break).** Today particles advance once per frame
*inside* `draw()`; the split moves advancement to `update(dt)`. Lock this with
explicit assertions so an ordering off-by-one fails a test, not just the eye:

- In **each** animation unit test: assert `draw(ctx)` does **not** mutate particle
  state (call `draw` twice with no `update` between → `life`/`x` unchanged), and a
  single `update(dt)` advances **exactly one step** (`life === maxLife - 1`,
  `x === x0 + vx`).
- Reproduce the old poof deactivation timing **via `update()`** (not the removed
  `_drawCapturePoof`): max life = `CAPTURE_POOF_LIFE`(22) + `CAPTURE_POOF_LIFE_JITTER`
  (8) − 1 = 29 ticks, so 32 `update()` calls → `isActive() === false`.
- In **hook.test.js**, add one orchestration assertion that on the escape **spawn
  frame** a single `hook.update(dt)` leaves the explosion advanced exactly once
  (`hook._escapeExplosion._particles[0].life === HOOK_PARTICLE_LIFE - 1`) — this
  pins that the removed `return;` + status guard still runs the end-of-update
  advance on the spawn frame.

**New suites:**
- **NEW** `__tests__/capture-launch-animation.test.js` — `start`+`getTarget`;
  `isFinished` true only after `_elapsedMs >= CAPTURE_LAUNCH_DURATION_MS`; draw
  shrink/fade at t=0/0.5/1.0 (migrated from hook.test.js "entity shrinks and fades"
  test, retargeted to the animation); `update`-advances-once + draw-is-pure pins.
- **NEW** `__tests__/capture-poof-animation.test.js` — `start({x,y,dirAngle})` sets
  position + spawns 35 particles + `isActive()`; directional angle honored (particles
  fan around `dirAngle`); `update`-advances-once, draw-is-pure, and the 32-tick
  deactivation pin above.
- **NEW** `__tests__/escape-explosion-animation.test.js` — `start` builds
  `CAPTURE_ESCAPE_PARTICLES`; `update` advances + removes expired; `isFinished` when
  empty; `update`-advances-once + draw-is-pure pins.

**MODIFY `__tests__/hook.test.js`** (by behavior, not brittle line numbers):
- **Keep unchanged** (orchestration/timing — already green): the "enters
  CAPTURE_LAUNCH, no enemyCaptured yet" and "after duration, enemyCaptured at
  landing + IDLE" tests (read `_launchEntity`/`_launchTarget`, both retained); the
  fish-escape event/state tests; the two `_getPlayerFrontDirection` tests; the
  `hadCatch`/`isHooked`/inert-auto-reel blocks.
- **Rewrite** the "Hook capture poof (starburst)" describe block: assert via
  `hook._capturePoof.isActive()` / `hook.getCaptureTrailCount()` instead of
  `_poofActive`; **delete** the `hook._launchOrigin = new Point(...)` override line
  in "starburst activates at landing" — `_launchOrigin` no longer exists on Hook,
  so leaving it would set a dead property (should_fix #2). Add the escape spawn-frame
  pin (above).
- **Remove** the now-migrated effect-internal tests (`_buildCaptureRewardPoof`,
  `_spawnCapturePoofParticles` count, `_drawCapturePoof` deactivation loop, and the
  `_drawCaptureLaunch` shrink/fade test) — they move to the animation suites, not
  duplicated, keeping hook.test.js focused on orchestration.

### NEW: `docs/adr/0033-hook-visual-effect-animation-classes.md`
Record: three animation classes, the update/draw split rationale, the escape
early-return restructure, the `{x,y,dirAngle}` poof signature, constant ownership,
and z-order preservation. (0032 is current highest.)

## Goal Verification Truths

- `npm test` — full suite, 0 failures (existing Hook orchestration/timing tests
  pass unchanged + 3 new animation suites green).
- Hook.js shrinks substantially (drawing internals + ~23 consts removed).
- `EVENT_ENEMY_CAPTURED` / `EVENT_HOOK_IDLE` payloads and timing identical
  (verified by hook.test.js:563-598 passing unchanged).
- Escape, poof, launch render identical (same math, same draw order, same
  per-frame advance).
- No `CAPTURE_*`/`HOOK_PARTICLE_*` const declared in two files (grep check —
  guards against the blue-screen redeclare error).

## E2E Test Scenarios (browser — no blue screen)

Dev server `python3 -m http.server 8081`, open `http://localhost:8081/main.html?e2e=1`
(exposes `window.__fishingTimeE2E`). Use a browser-automation tool (Chrome
DevTools MCP / playwright-cli).

- **TS-001 Capture launch + poof:** `__fishingTimeE2E.forceHookedFish('tuna')`,
  let it reel to rest → confirm the captured sprite arcs to the boat (shrink/fade)
  then the directional poof bursts. `getRuntimeStats().captureTrailParticles`
  returns 1 while poof active, 0 after. **No console error, canvas not blank/blue.**
- **TS-002 Escape explosion:** hook a strong fish, don't reel, let escape fire →
  confirm radial particle burst at the hook. No console error.
- **TS-003 Smoke / no script error:** load the page, check console for
  "Identifier already declared" or any uncaught error (the blue-screen signal);
  confirm fish spawn and the rod casts/swings normally.
