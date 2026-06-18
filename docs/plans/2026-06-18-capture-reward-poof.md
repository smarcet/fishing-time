# Capture Reward Poof Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Refine the ADR-0030 capture animation so the caught entity shrinks and
fades continuously during its parabolic flight (scale 1.0→0, alpha 1.0→0,
no sparkle trail), disappearing by the time it reaches the fisherman, and landing
triggers a short directional red/orange/yellow "reward poof" — a boat-facing
fan/comet burst (150–250 ms) that becomes the main arcade feedback effect,
fired at the same moment as the score popup.

## Out of Scope

- The escape-particle burst (`_buildEscapeHookExplosion` / `_drawEscapeHookExplosion`)
  is a separate fish-escape effect and is **not** touched.
- Per-species poof customization (color/density/duration via `FISH_DEFINITIONS`)
  remains deferred, exactly as ADR-0030 §Alternatives #4 states.
- The parabolic arc geometry (`_captureLaunchPoint`, `CAPTURE_LAUNCH_ARC_Y`),
  the 400 ms time-driven phase (`CAPTURE_LAUNCH_DURATION_MS`), the delayed
  `EVENT_ENEMY_CAPTURED` dispatch at landing, and the score popup at the boat are
  all preserved unchanged.
- The entity glow (`CAPTURE_LAUNCH_GLOW_COLOR` / `CAPTURE_LAUNCH_GLOW_BLUR`) is kept —
  it complements the shrink/fade by adding warmth as the entity disappears.

## Approach

**Chosen:** Repurpose the existing `_captureTrail` particle array + `_drawCaptureTrail`
renderer (in `src/Hook.js`) from a per-tick flight trail into a one-shot directional
burst spawned at landing by a new `_buildCaptureRewardPoof(target)`.
**Why:** Reuses the proven particle subsystem (no new infrastructure) and the existing
`getRuntimeStats().captureTrailParticles` E2E hook keeps working — a "comet-tail" *is*
a trail, so the `_captureTrail` / `getCaptureTrailCount` names stay accurate. The cost is
that the meaning of `captureTrailParticles` shifts from "particles during flight" to
"particles after landing"; the affected unit tests are updated to the new contract.

## Autonomous Decisions

(Questions skipped — Auto Mode + a highly prescriptive request. Decisions recorded here.)

1. **Full removal of the flight sparkle trail**, not a reduced trail. The spec says
   "do not emit a large sparkle trail during the entire parabolic flight" and "the
   final poof should be the main arcade feedback effect" — so `_spawnCaptureSparkles`
   and its per-tick call are removed entirely rather than dialed down.
2. **Entity shrinks and fades continuously** across the whole arc: scale 1.0→0, alpha 1.0→0
   (both linear in `t`). ADR-0030 mistakenly reversed this — it made the entity *grow*
   (1.0→1.25) and kept full alpha until 75%. This restores the "absorbed into the
   fisherman" feel. By `t = 1.0` the entity is invisible (alpha 0) so the frame where it
   disappears is seamless with the poof appearing at the same landing point.
3. **Poof direction = horizontal, boat-facing**: base direction is the horizontal sign
   from launch origin to landing target (`tx >= ox ? +1 : -1`), with a symmetric ±30°
   cone. A 60° total cone guarantees `cos(theta) ≥ cos(30°) ≈ 0.866` and
   `|sin(theta)| ≤ 0.5`, so every particle has `|vx| > |vy|` ("mostly horizontal",
   provable without depending on RNG) and a uniform boat-facing `vx` sign ("avoid
   spreading equally in all directions").
4. **Poof colors live in `src/constants.js`** (red/orange/yellow), matching ADR-0030's
   rule that color tuning lives in constants.js. Numeric render knobs (count, cone,
   speed, life, blur, size) live as `- TUNE` module consts in `src/Hook.js`, matching
   ADR-0030's rule that arc/density/duration knobs live in Hook.js.

## Context for Implementer

`src/Hook.js` drives the capture state machine. Today, the `HOOK_STATUS_CAPTURE_LAUNCH`
branch of `update()` (around `src/Hook.js:220`) calls `_spawnCaptureSparkles()` every
tick along the arc; `draw()` calls `_drawCaptureTrail()` (renders/fades `_captureTrail`)
and `_drawCaptureLaunch()` (renders the flying entity). `_finishCaptureLaunch()`
(`src/Hook.js:308`) dispatches `EVENT_ENEMY_CAPTURED` at `_launchTarget` then resets to
`IDLE`. The poof must be spawned inside `_finishCaptureLaunch()` **before** `_launchTarget`
is nulled. `_drawCaptureTrail()` is already called unconditionally in `draw()`, so poof
particles keep animating/fading after status returns to `IDLE` — no extra wiring needed.

## Runtime Environment

- **Start:** `python3 -m http.server 8081` → `http://localhost:8081/main.html`
- **E2E hooks:** load `main.html?e2e=1`; `window.__fishingTimeE2E.forceHookedFish(type)`
  and `.getRuntimeStats()` expose `hookStatus` + `captureTrailParticles`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing tests assume sparkles spawn *during* flight, silently break | High | Medium | Task 2 rewrites the `_captureTrail accumulates during CAPTURE_LAUNCH update` test to the new landing-burst contract (RED first) |
| `CAPTURE_SPARKLE_COLORS` left orphaned in constants.js after removing `_spawnCaptureSparkles` | Medium | Low | Task 1 removes the declaration + export; grep confirms only `src/Hook.js` consumed it |
| Poof not visibly directional / looks radial | Medium | Medium | 60° cone with uniform boat-facing `vx` sign asserted in unit test; browser screenshot confirms fan shape (TS-001) |

## Goal Verification

### Truths

1. During the parabolic flight the entity shrinks and fades continuously (no sparkle
   trail — `captureTrailParticles == 0` while `hookStatus == CAPTURE_LAUNCH`); it is
   near-invisible by landing. Particles appear only after landing and then drain to 0.
2. The landing burst is directional — every poof particle moves predominantly
   horizontally toward the boat (uniform `vx` sign, `|vx| > |vy|`), never a 360° radial
   spread.

## E2E Test Scenarios

### TS-001: Capture launch shows visible entity then a directional landing poof
**Priority:** Critical
**Preconditions:** Game loaded at `main.html?e2e=1`, gameplay running.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8081/main.html?e2e=1` | Canvas renders, boat visible |
| 2 | `__fishingTimeE2E.forceHookedFish('clown_fish')` then tap reel (Space) repeatedly to reel to rest | `getRuntimeStats().hookStatus` becomes `CAPTURE_LAUNCH` |
| 3 | While `hookStatus == 'CAPTURE_LAUNCH'`, sample `captureTrailParticles` each frame; screenshot mid-flight | `captureTrailParticles` stays `0`; the fish sprite is visibly shrinking and fading as it travels along the arc |
| 4 | Continue polling until `hookStatus == 'IDLE'`; screenshot at landing | A short red/orange/yellow fan burst appears at the boat; `captureTrailParticles > 0`; score popup shows at the boat |
| 5 | Keep polling ~300 ms | `captureTrailParticles` returns to `0` (poof faded out); hook resumes idle swing |

## Progress Tracking

- [x] Task 1: Add poof colors, retire sparkle colors in `src/constants.js`
- [x] Task 2: Replace flight sparkle trail with directional landing poof in `src/Hook.js` (+ test rewrite)
- [x] Task 3: Append ADR-0030 addendum

## Implementation Tasks

### Task 1: Swap capture sparkle colors for reward-poof colors in constants

**Objective:** Introduce the red/orange/yellow poof color palette in `src/constants.js`
and remove the now-unused `CAPTURE_SPARKLE_COLORS`. Keeps color tuning in the one
well-known place per ADR-0030. Render-geometry knobs are NOT added here — they live as
Hook.js module consts (Task 2).

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add `const CAPTURE_POOF_COLORS = ['rgba(255,60,60,1)', 'rgba(255,150,40,1)', 'rgba(255,215,80,1)'];`
  (red / orange / yellow) near the existing capture-launch color block (`src/constants.js:97-99`).
- Remove `const CAPTURE_SPARKLE_COLORS = [...]` (line 98) — orphaned once `_spawnCaptureSparkles`
  is deleted in Task 2. Keep `CAPTURE_LAUNCH_GLOW_COLOR` (still used for the entity glow).
- Update the `module.exports` block (line ~666): replace `CAPTURE_SPARKLE_COLORS` with
  `CAPTURE_POOF_COLORS`; leave `CAPTURE_LAUNCH_DURATION_MS` and `CAPTURE_LAUNCH_GLOW_COLOR`.
- The new values are **distinct** from the retired `CAPTURE_SPARKLE_COLORS` — do NOT copy-paste
  the old values: use exactly `['rgba(255,60,60,1)', 'rgba(255,150,40,1)', 'rgba(255,215,80,1)']`
  (red / true orange / yellow), not the old salmon `rgba(255,140,100,1)`.
- **Task 1 must be fully complete (both declaration AND `module.exports` entry)** before any Task 2
  code that references `CAPTURE_POOF_COLORS` is written. If the export is missing, all hook tests
  throw at `require` time — that is an import failure, not a clean RED test failure.
- `Trivial:` one constant added, one removed/renamed in declaration + export; no new branch/loop/error path. Covered by the Task 2 Hook tests (which reference `CAPTURE_POOF_COLORS`) and the existing `npm test` suite import check.

**Definition of Done:**

- [ ] `CAPTURE_POOF_COLORS` is declared and exported; `CAPTURE_SPARKLE_COLORS` no longer appears anywhere (`grep -rn CAPTURE_SPARKLE_COLORS src/ __tests__/` returns nothing).
- [ ] Verify: `npm test` (full suite imports `index.js`/constants — fails fast on a missing/renamed export)

### Task 2: Replace flight sparkle trail with a directional landing poof in Hook.js

**Objective:** Stop emitting the continuous sparkle trail during the parabolic flight,
keep the flying entity fully visible for the whole arc, and emit a single short
directional (boat-facing, fan/comet) red-orange-yellow burst at the landing target. The
parabolic arc, the time-driven phase, and the delayed score dispatch are unchanged.

**Files:**

- Modify: `src/Hook.js`
- Test: `__tests__/hook.test.js`

**Key Decisions / Notes:**

- **RED first** — update `__tests__/hook.test.js` `describe('Hook capture trail (_captureTrail)')`
  (lines ~689-713) to the new contract before implementing:
  - During `CAPTURE_LAUNCH` `update(16)`, `_captureTrail.length` stays `0` (no flight sparkles).
  - After `_finishCaptureLaunch()` (drive via `update(CAPTURE_LAUNCH_DURATION_MS)`), `_captureTrail.length > 0` (poof spawned).
  - Directionality (RNG-independent): set `hook._launchOrigin = new Point(200, 400)` explicitly
    on the hook instance before the poof fires (fixed Point, not relying on `driveToLaunch`);
    assert every spawned particle has the same `Math.sign(vx)` (boat-facing) and
    `Math.abs(vx) > Math.abs(vy)` ("mostly horizontal"). Reuse `makeHook`/
    `makeMockInertEntity`; keep it in the existing describe block (no new test class).
  - Update the **drain test** (`_captureTrail drains to zero`, lines ~704-713): replace
    `hook.update(16)` (old flight-sparkle seed, now yields `length == 0`) with
    `global.document = { dispatchEvent: jest.fn() }; hook.update(CAPTURE_LAUNCH_DURATION_MS);`
    to seed the trail via the landing poof; update the internal comment to reference
    `CAPTURE_POOF_LIFE` instead of `CAPTURE_SPARKLE_LIFE`.
  - Add **shrink+fade regression test** (`_drawCaptureLaunch applies decreasing alpha and scale`):
    After `driveToLaunch()`, add `hook._launchEntity._drawCapturedSprite = jest.fn()` and
    `hook._ctx.scale = jest.fn()`. Call `_drawCaptureLaunch()` at t=0 (`_launchElapsedMs=0`),
    t=0.5, t=1.0. Assert `hook._ctx.globalAlpha` ≈ 1.0, ≈ 0.5, ≤ 0.05. Assert first
    `hook._ctx.scale` call arg ≈ 1.0 at t=0 and ≈ 0 at t=1.0. This test MUST fail under the
    old ADR-0030 code (grow 1.0→1.25, piecewise alpha) and pass after this change.
- In `update()` `HOOK_STATUS_CAPTURE_LAUNCH` branch (`src/Hook.js:220-227`): delete the
  `_spawnCaptureSparkles(...)` call and the now-unused `lp`/`lt` lines; keep only the timer
  advance + `_finishCaptureLaunch()` check.
- Delete `_spawnCaptureSparkles()` (`src/Hook.js:338-351`) and the orphaned
  `CAPTURE_SPARKLE_*` module consts (`src/Hook.js:21-27`: SPREAD, DRIFT, LIFE, SIZE_MIN,
  SIZE_RANGE, PER_TICK). Keep `CAPTURE_SPARKLE_SHADOW_BLUR`? No — replace with a poof blur const.
- Add `- TUNE` module consts in `src/Hook.js`: `CAPTURE_POOF_PARTICLES = 18`,
  `CAPTURE_POOF_CONE_DEG = 60` (±30°), `CAPTURE_POOF_SPEED_MIN = 3`,
  `CAPTURE_POOF_SPEED_RANGE = 4`, `CAPTURE_POOF_LIFE = 12` (ticks ≈ 200 ms @ 60 fps, within
  the 150–250 ms target), `CAPTURE_POOF_SIZE_MIN = 2`, `CAPTURE_POOF_SIZE_RANGE = 3`,
  `CAPTURE_POOF_SHADOW_BLUR = 8`, `CAPTURE_POOF_POS_JITTER = 4`.
- Add `_buildCaptureRewardPoof(target)`: **first line** `const origin = this._launchOrigin; if (!origin || !target) return;`
  (local capture + null-guard — makes the method safe even if call order shifts).
  Then `const dir = (target.getX() - origin.getX()) >= 0 ? 1 : -1`;
  for each of `CAPTURE_POOF_PARTICLES`, `theta = (Math.random()-0.5) * CAPTURE_POOF_CONE_DEG*Math.PI/180`,
  `speed = MIN + Math.random()*RANGE`, `vx = dir*Math.cos(theta)*speed`, `vy = Math.sin(theta)*speed`,
  push `{x,y` (target + small jitter)`, vx, vy, life: CAPTURE_POOF_LIFE, maxLife: CAPTURE_POOF_LIFE,
  size, color: CAPTURE_POOF_COLORS[i % len]}` onto `this._captureTrail`.
- Call `this._buildCaptureRewardPoof(this._launchTarget)` as the **first statement** of
  `_finishCaptureLaunch()` (`src/Hook.js:308`), strictly **before** `this._launchEntity = null` (line 319)
  — `_launchOrigin` and `_launchTarget` are still set at that point. The directionality unit
  test must set `hook._launchOrigin = new Point(200, 400)` explicitly (a fixed Point, not relying
  on `driveToLaunch` alone) so the direction assertion is RNG-independent and call-order-independent.
- `_drawCaptureTrail()` (`src/Hook.js:353-371`): keep advance/fade/splice logic; only swap the
  blur const reference to `CAPTURE_POOF_SHADOW_BLUR`. Particles already shrink (`size * t`) → comet feel.
- `_drawCaptureLaunch()` (`src/Hook.js:373-391`): replace the current piecewise alpha and
  the grow-scale with continuous linear shrink+fade:
  ```js
  const scale = CAPTURE_LAUNCH_SCALE_START * (1 - t);   // 1.0 → 0
  const alpha = 1 - t;                                    // 1.0 → 0
  ```
  Delete `CAPTURE_LAUNCH_SCALE_END` (no longer needed — it was 1.25, which grew the entity).
  Keep the entity glow (`CAPTURE_LAUNCH_GLOW_COLOR` / `CAPTURE_LAUNCH_GLOW_BLUR`) — it fades
  naturally because `ctx.globalAlpha` is set to `alpha`.
  When `alpha` rounds to 0 the sprite is invisible; the poof fires at the same frame via
  `_finishCaptureLaunch()` so the transition is seamless.
- Performance: `update()` runs every frame — the poof is built once per capture (not per tick),
  so removing the per-tick sparkle spawn is a net reduction in allocations.

**Definition of Done:**

- [ ] While `hookStatus == CAPTURE_LAUNCH`, `getCaptureTrailCount() == 0` (no flight trail); a burst appears only at landing.
- [ ] Every poof particle shares one boat-facing `vx` sign and has `|vx| > |vy|` (directional, not radial).
- [ ] The flying entity shrinks (scale 1.0→0) and fades (alpha 1.0→0) continuously. A regression
  test in `describe('Hook capture trail (_captureTrail)')` asserts this:
  - Add `hook._launchEntity._drawCapturedSprite = jest.fn()` and `hook._ctx.scale = jest.fn()` after
    `driveToLaunch()`.
  - Call `hook._drawCaptureLaunch()` at `_launchElapsedMs = 0`, `Duration*0.5`, `Duration*1.0`.
  - Assert `hook._ctx.globalAlpha` ≈ 1.0, ≈ 0.5, ≤ 0.05 respectively (ctx mock `restore()` is a
    no-op so the last `globalAlpha` assignment is readable).
  - Assert `hook._ctx.scale.mock.calls[0][0]` ≈ 1.0 at `t=0` and ≈ 0 at `t=1.0` (second call pair).
  - This regression test catches any future change that makes the entity grow or hold full-alpha.
- [ ] `EVENT_ENEMY_CAPTURED` still fires once at `_launchTarget` after `CAPTURE_LAUNCH_DURATION_MS`, followed by `EVENT_HOOK_IDLE` (existing `Hook HOOKED - fish capture` tests stay green).
- [ ] Verify: `npx jest __tests__/hook.test.js`

### Task 3: Append capture-reward-poof addendum to ADR-0030

**Objective:** Record that the capture launch remains parabolic and time-driven, but the
continuous sparkle trail is replaced by a single directional red/orange/yellow reward poof
at the landing target, which is now the primary arcade feedback effect.

**Files:**

- Modify: `docs/adr/0030-capture-completion-animation.md`

**Key Decisions / Notes:**

- Append an `## Addendum (2026-06-18): Directional Reward Poof` section. Do not rewrite the
  original Decision; note what changed: flight sparkle trail removed, entity stays full-alpha
  through the arc, `_buildCaptureRewardPoof` fires a boat-facing fan/comet burst
  (`CAPTURE_POOF_*` knobs, `CAPTURE_POOF_COLORS`) at landing for ~200 ms.
- Note the moved constants: `CAPTURE_SPARKLE_COLORS` → `CAPTURE_POOF_COLORS` in `constants.js`;
  `CAPTURE_SPARKLE_*` Hook consts → `CAPTURE_POOF_*` Hook consts.

**Definition of Done:**

- [ ] ADR-0030 has a dated addendum describing the parabolic-launch-retained + poof-replaces-trail change and the constant renames.
- [ ] Verify: `grep -n "Addendum" docs/adr/0030-capture-completion-animation.md`
