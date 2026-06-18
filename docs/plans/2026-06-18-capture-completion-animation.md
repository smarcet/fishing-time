# Capture Completion Animation Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** When a hooked entity reaches the boat, play a short (~400 ms) arcade-style
capture celebration — the entity detaches from the hook, launches in an upward arc toward
the boat with a red sparkle trail, then a score popup appears at the boat and the
entity is removed from the world. The effect should resemble classic ticket-redemption
fishing games where caught fish visibly fly into the boat before becoming score.

## Context

Today, the moment a hooked entity is reeled to rest (`_ropeLength <= HOOK_REST_LENGTH`),
`Hook.update()` calls `clearCaptured()` which immediately dispatches `EVENT_ENEMY_CAPTURED`
(score) + `EVENT_HOOK_IDLE` and nulls the catch — the entity vanishes in a single frame
(`src/Hook.js:227`). There is a partial, rope-progress-driven "throw arc" in
`EnemyWithAnimation.drawCaptured()` (`src/EnemyWithAnimation.js:101-111`) that fades and
shrinks the sprite as the rope nears rest, but it is tied to rope progress (not time),
never resolves into a distinct "collected" beat, and ends with the sprite at alpha 0 —
so the catch reads as "disappeared", not "collected". This feature replaces that with a
**dedicated, time-driven capture-launch phase** that gives the catch a clear, rewarding
fly-into-the-boat moment.

**User-confirmed design choices (this session):**
- **Trail technique:** Sparkles (red).
- **Launch driver:** A dedicated fixed-duration phase (`HOOK_STATUS_CAPTURE_LAUNCH`,
  `CAPTURE_LAUNCH_DURATION_MS = 400`) — NOT an extension of the rope-progress throw arc.
  This guarantees the 300–500 ms arcade feel independent of reel speed.
- **Score popup:** Shown at the END of the launch, anchored at the boat/landing target
  (`getLandingTarget()`), not at the hook position.

## Out of Scope

- New sprite art or a dedicated "in-boat" frame — the launch reuses the existing captured
  (die-frame) sprite via `EnemyWithAnimation._drawCapturedSprite`.
- Changing the hooked-reel struggle/escape mechanics, the rope physics, the glow/pulse
  while hooked, or the escape-particle burst — only the post-reel completion changes.
- Per-species launch tuning (arc height, sparkle color) — one shared look for all species,
  reusing each entity's existing `_captureRotation` (ADR-0029) for sprite orientation.
- Capturing trash differently from fish — every reeled-to-rest entity (fish or inert)
  runs the same launch; score sign (green `+N` / red `-N`) is already handled by
  `ScoreSystem`.

## Approach

**Chosen:** Add a new terminal hook phase `HOOK_STATUS_CAPTURE_LAUNCH` between "reeled to
rest" and "idle". When the rope reaches rest while `HOOKED`, instead of `clearCaptured()`
the hook calls `_beginCaptureLaunch()`: it detaches the catch (`_catch = null`), records
`_launchOrigin` (current hook tip) and `_launchTarget` (`getLandingTarget()` = boat
center), and zeroes a millisecond timer. For the next `CAPTURE_LAUNCH_DURATION_MS`, the
hook owns the detached entity (`_launchEntity`), drawing it along an upward arc toward the
boat (`_drawCaptureLaunch`) and emitting a red sparkle trail (`_spawnCaptureSparkles`
+ `_drawCaptureTrail`, modeled on the existing escape-particle system). When the timer
elapses, `_finishCaptureLaunch()` dispatches `EVENT_ENEMY_CAPTURED` (with `x/y` at the boat
landing target so the score popup appears there) + `EVENT_HOOK_IDLE`, releases the entity,
and resets the hook to `IDLE`/`HOOK_REST_LENGTH`. The now-superseded rope-progress throw arc
is removed from `drawCaptured()`, and the dead phase machinery
(`getCapturePhase`/`getCaptureRawProgress`/`clearCaptured`,
`CAPTURE_PHASE_*`/`CAPTURE_THROW_*`) is deleted.

**Why:** A time-driven phase models the 6-step capture sequence literally and guarantees
the 300–500 ms feel regardless of reel speed (a rope-progress arc would stretch/compress
with reel taps). The sparkle trail reuses the proven `_escapeParticles` /
`_drawEscapeHookExplosion` pattern (spawn → advance/fade/splice in `draw()`), so no new
particle subsystem is invented. Render tunables live as `Hook.js` module consts (mirroring
the existing `HOOK_PARTICLE_*` precedent); only the phase enum + duration go in
`constants.js` since they participate in the cross-file state machine.

## Context for Implementer

- **Where the transition fires:** `src/Hook.js:227` — the `if (this._ropeLength <= HOOK_REST_LENGTH)`
  inside the `HOOK_STATUS_HOOKED` branch. Trash auto-reels (`_ropeLength -= HOOK_CATCH_REEL_SPEED`,
  line 225); catchable fish reel only via player taps (lines 195). Both paths converge on
  this check — change `clearCaptured()` → `_beginCaptureLaunch()`.
- **Continuity (no "pop"):** `getEndpoint()` at launch start equals where `drawCaptured()`
  was drawing the sprite (the hook tip). The throw-arc removal (Task 2) is REQUIRED so the
  hooked sprite stays attached at full scale/alpha right up to rest — otherwise the old arc
  fades it to alpha 0 at rest and the launch redraws it full-size, producing a visible pop.
- **Ownership during launch:** Captured entities are filtered out of `Game._enemies`
  (`src/Game.js:95` via `isCaptured()`), so the entity's own `update()/draw()` never runs
  once hooked. The hook draws the hooked catch today via `if (this._catch) this._catch.draw()`
  (`src/Hook.js:271`). After detach, `_catch` is null, so the hook draws the launching
  entity itself via `_drawCaptureLaunch()` using `entity._drawCapturedSprite(...)` inside
  the hook's own canvas transform (translate→scale→rotate by `entity._captureRotation`).
- **Score popup wiring (already exists — reuse as-is):** `ScoreSystem._handleCapture`
  (`src/ScoreSystem.js:37-54`) listens for `EVENT_ENEMY_CAPTURED`, reads `SCORE_MAP[enemyType]`,
  and pushes a rising/fading `+N`/`-N` popup at `detail.x/detail.y`. The ONLY change is that
  `_finishCaptureLaunch()` now dispatches with `x/y = _launchTarget` (boat) at launch-end.
- **Blast radius of deferring `EVENT_ENEMY_CAPTURED` by ~400 ms:** three listeners fire on
  it — `ScoreSystem` (score popup, intended), `TimerSystem._handleTimeBonus`
  (`src/TimerSystem.js:33`, time-bonus fish), and `AudioSystem._handleCapture`
  (`src/AudioSystem.js:22`, capture SFX). All three now trigger when the fish lands in the
  boat instead of at rest. This is the intended "collected" beat (sound + score + time land
  together as the fish enters the boat) and is acceptable; it is called out here so it is a
  decision, not a surprise.
- **Particle pattern to mirror:** `_buildEscapeHookExplosion` (`src/Hook.js:319`, spawn) and
  `_drawEscapeHookExplosion` (`src/Hook.js:278`, advance+fade+splice+draw, called
  unconditionally in `draw()`). The sparkle trail follows the same shape; draw it
  unconditionally too so sparkles fade naturally after landing (do NOT force-clear on finish).
- **Constants globalization:** `index.js:3` does `const _c = require('./src/constants')`
  then spreads `_c` onto globals; constants are exported in the block at the end of
  `src/constants.js`. New consts added to that export block auto-globalize for both browser
  (`main.html` script tags) and tests (`require('../index.js')`); removed consts auto-drop
  (no explicit references to the removed names exist in `index.js`).
- **`isCatchableFishHooked()` returns false during CAPTURE_LAUNCH (intentional):**
  `_beginCaptureLaunch()` nulls `_catch`, so `isCatchableFishHooked()` (`Hook.js:315`,
  `this._catch instanceof CatchableFish`) returns false for the launch duration. Two callers:
  (1) `EnemyWithAnimation.js:82` (`const escapeDanger = this._hook.isCatchableFishHooked()`)
  — runs on entities still in `Game._enemies` (other fish still in the ocean); returning false
  is correct (no fish is on the hook, so no escape pressure). (2) `Hook.js:182` — inside the
  `HOOK_STATUS_HOOKED` branch, never reached during CAPTURE_LAUNCH. `hadCatch()` is the
  correct and complete extension for player reel-pose (covers both HOOKED and CAPTURE_LAUNCH);
  `isCatchableFishHooked()` intentionally returns false during launch and requires no change.
- **`_hookedEventFired` field locations:** initialized at constructor `Hook.js:44`; reset in
  `setCatch` at line 346 and previously in `clearCaptured` at line 130.
  `_finishCaptureLaunch` must reset it (same semantics as the old `clearCaptured` reset) so
  a subsequent `setCatch` on the same hook instance fires the hooked event correctly.
- **No new class/file** → no `index.js`/`main.html` registration needed (all logic lives in
  existing `Hook.js`, `EnemyWithAnimation.js`, `constants.js`, `Game.js`).

## Assumptions

- A single `update(dt)` tick during the launch uses real `dt` (ms) accumulation; tests
  drive the phase by passing `dt` explicitly (`hook.update(CAPTURE_LAUNCH_DURATION_MS)`),
  so no wall-clock dependency. In the running game `dt` is the per-frame delta already
  threaded through `Hook.update(dt)`.
- `getLandingTarget()` (boat center at `_pivot().getY()`) is the correct "into the boat"
  anchor for both the launch endpoint and the score popup. (Verified: it already exists and
  is the boat-center point.)
- The upward arc sign: canvas `y` grows downward, so the arc subtracts
  `sin(t·π)·CAPTURE_LAUNCH_ARC_Y` from the interpolated `y` to bow upward. If it looks
  inverted in-browser, only the const sign flips — no structural change.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual "pop" when launch begins (sprite jumps scale/alpha) | Medium | Medium | Task 2 removes the rope-progress throw arc so the hooked sprite is full-scale/alpha at rest; `_launchOrigin = getEndpoint()` makes launch start exactly where the sprite was. Verified in E2E (TS-001/TS-002). |
| Deferred SFX/time-bonus feels laggy | Low | Low | Duration capped at ~400 ms; the sound landing as the fish enters the boat is the intended "collected" beat. Documented above. |
| Sparkle trail spawns unbounded particles / perf | Low | Low | Fixed `CAPTURE_SPARKLES_PER_TICK` over a ~400 ms phase with short `CAPTURE_SPARKLE_LIFE`; advance/splice each frame mirrors the bounded escape-particle loop. |
| Removing `clearCaptured`/`getCapturePhase`/`getCaptureRawProgress` breaks a caller | Low | Medium | Grep-verified: only callers are the removed throw-arc block, `getCapturePhase` itself, and the tests being updated/removed (Task 3). `getLandingTarget` is KEPT (used by launch). |

## Goal Verification

### Truths

1. A hooked entity reeled to rest does NOT vanish in one frame: it enters a ~400 ms
   `HOOK_STATUS_CAPTURE_LAUNCH` phase, flies in an upward arc from the hook tip to the boat
   with a visible red sparkle trail, and only then is removed.
2. The score popup (`EVENT_ENEMY_CAPTURED`) is dispatched at the END of the launch with
   `x/y` at the boat landing target — not at the hook position and not at reel-to-rest time.
3. After the launch completes the hook returns to `HOOK_STATUS_IDLE` at `HOOK_REST_LENGTH`,
   `EVENT_HOOK_IDLE` fires, and the entity is fully released (next cast works normally).
4. The dead rope-progress throw-arc machinery
   (`CAPTURE_PHASE_*`, `CAPTURE_THROW_*`, `getCapturePhase`, `getCaptureRawProgress`,
   `clearCaptured`) is removed with the full test suite still green.

## E2E Test Scenarios

Driven via the dev server (`python3 -m http.server 8081` → `main.html?e2e=1`) and the
`window.__fishingTimeE2E` harness. `getRuntimeStats()` is extended (Task 4) with
`hookStatus` and `captureTrailParticles` for deterministic polling.

### TS-001: Trash capture runs the full launch pipeline (deterministic)
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8081/main.html?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `window.__fishingTimeE2E.forceHookedFish('shoe')` (trash auto-reels) | Returns `{hooked:true, enemyType:'Shoe', ...}`; `getRuntimeStats().hookStatus === 'HOOKED'` |
| 2 | Let it reel (trash auto-reels to rest); poll `getRuntimeStats()` | `hookStatus` transitions `HOOKED` → `CAPTURE_LAUNCH`; while `CAPTURE_LAUNCH`, `captureTrailParticles > 0` and the shoe is visibly arcing up toward the boat with sparkles |
| 3 | Continue polling until launch ends | `hookStatus` returns to `IDLE`; a red `-N` score popup appears AT THE BOAT; score decreases by the shoe's penalty |

### TS-002: Positive fish capture feels rewarding (visual)
**Priority:** High
**Preconditions:** Game running at `?e2e=1`; hook idle.
**Mapped Tasks:** Task 1, Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `window.__fishingTimeE2E.forceHookedFish('clown_fish')` | `hookStatus === 'HOOKED'`; ClownFish hangs from the hook |
| 2 | Dispatch `reelTap` repeatedly (`document.dispatchEvent(new CustomEvent('reelTap'))`) until reeled to rest | ClownFish stays attached full-size up to rest (no shrink/fade pop), then enters `CAPTURE_LAUNCH` |
| 3 | Observe the launch | ClownFish arcs up into the boat trailing red sparkles; a green `+N` popup appears at the boat; `hookStatus` returns to `IDLE` |

### TS-003: Hook is reusable after capture
**Priority:** High
**Preconditions:** Completed TS-001 or TS-002.
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After `hookStatus === 'IDLE'`, trigger a normal cast (tap/space) | Hook casts normally; `hookStatus` goes `IDLE` → `CAST`; no leftover launch entity or stuck sparkles block play |

## Progress Tracking

- [x] Task 1: Add the time-driven CAPTURE_LAUNCH phase to Hook + constants
- [x] Task 2: Render the launching entity + red sparkle trail; remove the superseded throw arc
- [x] Task 3: Delete dead phase machinery (constants, Hook methods) and update tests
- [x] Task 4: Expose hookStatus + captureTrailParticles via getRuntimeStats for E2E
- [x] Task 5: Write ADR-0030 documenting the capture-completion animation

## Implementation Tasks

### Task 1: Add the time-driven CAPTURE_LAUNCH phase to Hook + constants

**Objective:** Introduce a dedicated fixed-duration capture-launch phase. When the rope
reaches rest while `HOOKED`, detach the catch and run a ~400 ms timed phase that ends by
dispatching the capture/score event at the boat and returning the hook to idle.

**Files:**
- Modify: `src/constants.js` (add `HOOK_STATUS_CAPTURE_LAUNCH`, `CAPTURE_LAUNCH_DURATION_MS` + exports)
- Modify: `src/Hook.js` (constructor fields; `_beginCaptureLaunch`, `_finishCaptureLaunch`; new `update` branch; transition swap; `hadCatch` extension)
- Modify: `__tests__/hook.test.js` (rewrite the rope-reaches-rest transition test; add launch lifecycle + `hadCatch` tests)

**Key Decisions / Notes:**
- Constants: `const HOOK_STATUS_CAPTURE_LAUNCH = 'CAPTURE_LAUNCH';` next to the other
  `HOOK_STATUS_*` (lines 95-98) and `const CAPTURE_LAUNCH_DURATION_MS = 400;` near the
  capture consts; add both to the export block at the end of the file.
- Constructor: init `_launchEntity = null`, `_launchOrigin = null`, `_launchTarget = null`,
  `_launchElapsedMs = 0`.
- `_beginCaptureLaunch()`: capture `_launchOrigin = this.getEndpoint()` and
  `_launchTarget = this.getLandingTarget()` BEFORE flipping status; then
  `_launchEntity = this._catch; this._catch = null; this._launchElapsedMs = 0;
  this._status = HOOK_STATUS_CAPTURE_LAUNCH;`.
- `update()` transition at `src/Hook.js:227`: replace `this.clearCaptured()` with
  `this._beginCaptureLaunch()`. Add a new branch after the `RETRIEVING_EMPTY` branch:
  `else if (this._status === HOOK_STATUS_CAPTURE_LAUNCH) { this._launchElapsedMs += dt;
  if (this._launchElapsedMs >= CAPTURE_LAUNCH_DURATION_MS) this._finishCaptureLaunch(); }`.
  (Sparkle spawning is added in Task 2.)
- `_finishCaptureLaunch()`: preserve the exact reset semantics `clearCaptured` had — dispatch
  `EVENT_ENEMY_CAPTURED` with `detail: { enemyType: this._launchEntity.constructor.name,
  x: this._launchTarget.getX(), y: this._launchTarget.getY() }`, then `EVENT_HOOK_IDLE`
  (guard `typeof document !== 'undefined' && this._launchEntity`); then null
  `_launchEntity`/`_launchOrigin`/`_launchTarget`, set `_launchElapsedMs = 0`,
  `_catchRopeStart = null`, `_escapeProgress = 0`, `_hookedEventFired = false`,
  `_status = HOOK_STATUS_IDLE`, `_ropeLength = HOOK_REST_LENGTH`. Do NOT touch the sparkle
  trail (added in Task 2; lets sparkles fade naturally).
- `hadCatch()`: extend to `return this._status === HOOK_STATUS_HOOKED || this._status === HOOK_STATUS_CAPTURE_LAUNCH;`
  so the player keeps the REEL pose while the catch flies into the boat.
- Tests (TDD, RED first): (a) rewrite hook.test.js:542 — after reeling to rest the hook is
  in `HOOK_STATUS_CAPTURE_LAUNCH` and `enemyCaptured` is NOT yet dispatched; (b) after a
  further `hook.update(CAPTURE_LAUNCH_DURATION_MS)`, `enemyCaptured` IS dispatched with
  `detail.x/y` equal to the pre-captured `hook.getLandingTarget()` coords and status is
  `HOOK_STATUS_IDLE`; (c) add to the `hadCatch()` describe: true during `CAPTURE_LAUNCH`.

**Definition of Done:**
- [ ] Reeling a hooked entity to rest enters `HOOK_STATUS_CAPTURE_LAUNCH` without immediately dispatching `enemyCaptured`.
- [ ] After `CAPTURE_LAUNCH_DURATION_MS` of `dt`, `enemyCaptured` (at the landing target) + `hookIdle` fire and status is `IDLE` at `HOOK_REST_LENGTH`.
- [ ] `hadCatch()` is true during `CAPTURE_LAUNCH`.
- [ ] Verify: `npx jest __tests__/hook.test.js -q`

### Task 2: Render the launching entity + red sparkle trail; remove the superseded throw arc

**Objective:** Draw the detached entity arcing from the hook tip into the boat over the
launch duration, trailing red sparkles, and remove the old rope-progress throw arc so
the hooked sprite stays attached (full scale/alpha) until launch begins — eliminating any pop.

**Files:**
- Modify: `src/constants.js` (add `CAPTURE_SPARKLE_COLORS`, `CAPTURE_LAUNCH_GLOW_COLOR` + exports)
- Modify: `src/Hook.js` (module consts; `_captureLaunchPoint`, `_spawnCaptureSparkles`, `_drawCaptureLaunch`, `_drawCaptureTrail`; constructor `_captureTrail`; `update`/`draw` wiring)
- Modify: `src/EnemyWithAnimation.js` (remove the throw-arc block in `drawCaptured()`; remove `CAPTURE_THROW_SCALE_REDUCTION`)
- Modify: `__tests__/hook.test.js` (trail-spawn test)
- Modify: `__tests__/catchablefish.test.js` (drop the now-dead `getCaptureRawProgress` mock; confirm center/rotation tests stay green)

**Key Decisions / Notes:**
- **Color constants in `src/constants.js`** (easy to find and change in one well-known place):
  `CAPTURE_SPARKLE_COLORS = ['rgba(255,60,60,1)', 'rgba(255,140,100,1)']` and
  `CAPTURE_LAUNCH_GLOW_COLOR = 'rgba(255,80,80,0.9)'`. Add both to the `module.exports`
  block at the bottom of `constants.js` so they auto-globalize for both browser and tests.
- All other render tunables live as `Hook.js` module consts near `HOOK_PARTICLE_*` (all `- TUNE`):
  arc + sprite — `CAPTURE_LAUNCH_ARC_Y` (~70), `CAPTURE_LAUNCH_SCALE_START` (1.0),
  `CAPTURE_LAUNCH_SCALE_END` (~1.25), `CAPTURE_LAUNCH_GLOW_BLUR` (~20); sparkles —
  `CAPTURE_SPARKLES_PER_TICK` (~3), `CAPTURE_SPARKLE_SPREAD` (~14),
  `CAPTURE_SPARKLE_DRIFT` (~1.2), `CAPTURE_SPARKLE_LIFE` (~18),
  `CAPTURE_SPARKLE_SIZE_MIN` (~2), `CAPTURE_SPARKLE_SIZE_RANGE` (~3),
  `CAPTURE_SPARKLE_SHADOW_BLUR` (~8).
- Constructor: init `_captureTrail = []`.
- `_captureLaunchPoint(t)`: lerp `_launchOrigin`→`_launchTarget` in x and y, then
  `y -= Math.sin(t * Math.PI) * CAPTURE_LAUNCH_ARC_Y`; return a `Point`.
- `update()` `CAPTURE_LAUNCH` branch: after advancing the timer, compute
  `t = Math.min(1, this._launchElapsedMs / CAPTURE_LAUNCH_DURATION_MS)`,
  `const p = this._captureLaunchPoint(t)`, then `this._spawnCaptureSparkles(p.getX(), p.getY())`
  (spawn before the finish check so the final tick still emits).
- `_spawnCaptureSparkles(x, y)`: push `CAPTURE_SPARKLES_PER_TICK` particles
  `{x,y (+/- spread), vx,vy (random drift), life,maxLife, size, color}` onto `_captureTrail`,
  mirroring `_buildEscapeHookExplosion`.
- `_drawCaptureTrail()`: advance+fade+splice+draw each particle (mirror
  `_drawEscapeHookExplosion`, using the particle's own `color`); call it UNCONDITIONALLY in
  `draw()` so sparkles keep fading after the entity lands.
- `_drawCaptureLaunch()`: no-op unless `_status === HOOK_STATUS_CAPTURE_LAUNCH && _launchEntity`;
  compute `t`, `p = _captureLaunchPoint(t)`, scale = lerp(START,END,t),
  `globalAlpha = t < 0.75 ? 1.0 : Math.max(0, 1 - (t - 0.75) / 0.25)` (full opacity for the
  first 300 ms, then a quick linear fade in the last 100 ms so the entity is clearly visible
  entering the boat rather than disappearing in flight); red glow; `translate(p)→scale→rotate(
  entity._captureRotation deg→rad)`, then `entity._drawCapturedSprite(-w/2,-h/2,w,h)` using
  `entity.getSize()`.
- `draw()` wiring after the existing `this._drawEscapeHookExplosion();` (line 275):
  `this._drawCaptureTrail(); this._drawCaptureLaunch();` (trail behind, entity on top).
- `EnemyWithAnimation.drawCaptured()`: delete the `const raw = ...; if (raw >= CAPTURE_THROW_THRESHOLD) {...}`
  block (lines 101-111) so `cx/cy = hookTip`, `scale = 1.0`, `alpha = 1.0`, `glow = glowSize`
  unconditionally; keep the translate(offsets)→scale→rotate→`_drawCapturedSprite` block.
  Remove the now-unused `CAPTURE_THROW_SCALE_REDUCTION` (line 21).
- catchablefish.test.js: the captured-render tests mock `getCaptureRawProgress`/`getLandingTarget`;
  after the throw-arc removal the `getCaptureRawProgress` mock (line 77) is dead — remove that
  one line. The center-positioning and rotation assertions still hold (translate to hook
  endpoint at scale 1) and must stay green.
- Trail-spawn test (TDD): drive into `CAPTURE_LAUNCH`, call `hook.update(16)` (dt < duration so
  it stays in the phase), assert `hook._captureTrail.length > 0`.
- Trail-drain test (TDD): after `_finishCaptureLaunch()` triggers (advance past
  `CAPTURE_LAUNCH_DURATION_MS`), call `hook.update(0)` (noop for state) then call draw-side
  advance via `hook._drawCaptureTrail()` (or equivalent) for `CAPTURE_SPARKLE_LIFE` additional
  ticks and assert `hook._captureTrail.length === 0`. This guards against a broken splice loop
  that accumulates particles unboundedly across multiple captures.

**Definition of Done:**
- [ ] During `CAPTURE_LAUNCH`, `_captureTrail` accumulates particles and `draw()` renders the entity along the arc with a sparkle trail.
- [ ] After enough `_drawCaptureTrail()` ticks post-launch, `_captureTrail.length === 0` (splice loop drains naturally, no unbounded accumulation).
- [ ] The hooked sprite no longer shrinks/fades before rest (`drawCaptured` is throw-arc-free); no `CAPTURE_THROW_*` references remain in `EnemyWithAnimation.js`.
- [ ] Verify: `npx jest __tests__/hook.test.js __tests__/catchablefish.test.js -q`

### Task 3: Delete dead phase machinery (constants, Hook methods) and update tests

**Objective:** Remove the now-orphaned rope-progress throw-arc machinery and its tests so the
codebase carries one capture model, not two.

**Files:**
- Modify: `src/constants.js` (remove `CAPTURE_PHASE_RISING/THROWING`, `CAPTURE_THROW_THRESHOLD`, `CAPTURE_THROW_ARC_Y` + their exports + the line-56 comment)
- Modify: `src/Hook.js` (remove `clearCaptured`, `getCaptureRawProgress`, `getCapturePhase`)
- Modify: `__tests__/hook.test.js` (remove the `getCapturePhase()` describe and the `clearCaptured()` describe; remove `makeHookWithCatch` if it becomes unused)

**Key Decisions / Notes:**
- Grep-verified caller sets before deletion: `getCaptureRawProgress` (EnemyWithAnimation
  throw-arc — removed in Task 2; `getCapturePhase`; hook/catchablefish tests),
  `getCapturePhase` (self + tests + line-56 comment), `clearCaptured` (its def + the update
  call swapped in Task 1 + tests). `getLandingTarget` is NOT removed — the launch uses it.
- Remove the two describes in `__tests__/hook.test.js`: `Hook getCapturePhase()` (≈648-670,
  includes the `getCaptureRawProgress` test) and `Hook clearCaptured() dispatches enemyCaptured
  event` (≈673-698). If `makeHookWithCatch` has no remaining references after this, remove it.
- This task is pure deletion + test cleanup — no `Trivial:` escape (it removes public methods);
  the safety net is the full suite staying green.

**Definition of Done:**
- [ ] No references to `CAPTURE_PHASE_*`, `CAPTURE_THROW_*`, `getCapturePhase`, `getCaptureRawProgress`, or `clearCaptured` remain in `src/` or `__tests__/` (grep-clean).
- [ ] The local `CAPTURE_THROW_SCALE_REDUCTION` **const declaration** at `EnemyWithAnimation.js:21` is deleted (Task 2 removes its only usage; the const declaration must be removed as well, not just its usages).
- [ ] Verify: `grep -rn 'CAPTURE_PHASE\|CAPTURE_THROW\|getCapturePhase\|getCaptureRawProgress\|clearCaptured' src/ __tests__/` returns nothing, and `npx jest -q` is fully green.

### Task 4: Expose hookStatus + captureTrailParticles via getRuntimeStats for E2E

**Objective:** Give the E2E harness deterministic observability of the launch phase and trail.

**Files:**
- Modify: `src/Hook.js` (add `getStatus()` and `getCaptureTrailCount()` accessors)
- Modify: `src/Game.js` (`getRuntimeStats()` adds `hookStatus` + `captureTrailParticles`)
- Modify: `__tests__/e2e-test-harness.test.js` (assert the new fields, property-level)

**Key Decisions / Notes:**
- `Hook.getStatus()` returns `this._status`; `getCaptureTrailCount()` returns
  `this._captureTrail.length`. These are legitimate public observability accessors,
  consistent with the existing `isHooked()/isCasting()/isRetrievingEmpty()`.
- In `getRuntimeStats()` (`src/Game.js:281`), add `hookStatus: this._player.getHook().getStatus()`
  and `captureTrailParticles: this._player.getHook().getCaptureTrailCount()` (additive — keep
  all existing fields).
- Update the harness/runtime-stats test with property-level assertions (`toHaveProperty` /
  field checks), NOT a full `toEqual` snapshot, to avoid coupling to the whole stats shape.

**Definition of Done:**
- [ ] `getRuntimeStats()` includes `hookStatus` (one of the `HOOK_STATUS_*` values) and `captureTrailParticles` (a number).
- [ ] Verify: `npx jest __tests__/e2e-test-harness.test.js -q`

### Task 5: Write ADR-0030 documenting the capture-completion animation

**Objective:** Record the design (dedicated timed phase, sparkle trail, score-at-boat) and the
removal of the rope-progress throw arc, per the project's ADR convention.

**Files:**
- Create: `docs/adr/0030-capture-completion-animation.md`

**Key Decisions / Notes:**
- Follow the existing ADR format (see `docs/adr/0029-data-driven-capture-presentation.md`):
  `# ADR 0030 - ...`, `**Date:** 2026-06-18`, `**Status:** Accepted`, then `## Context`,
  `## Decision`, `## Alternatives Considered`, `## Tradeoffs`, `## Consequences`.
- Cover: why one-frame removal felt unrewarding; why a time-driven phase (not the
  rope-progress arc) was chosen (constant 300–500 ms feel regardless of reel speed); the
  sparkle trail reusing the escape-particle pattern; the score-at-boat timing and the
  deferred-event blast radius (Score/Timer/Audio fire at landing); alternatives considered
  (extend the rope-progress throw arc; bubbles/motion-blur/particle-streak trails; popup at
  the hook); and the consequence that `EVENT_ENEMY_CAPTURED` now fires at launch-end.

**Definition of Done:**
- [ ] `docs/adr/0030-capture-completion-animation.md` exists covering context, decision, alternatives, tradeoffs, and consequences (including the deferred-event timing).
- [ ] Verify: `grep -q 'Alternatives Considered' docs/adr/0030-capture-completion-animation.md && npx jest -q`
