# Fishing Rod Hook Pendulum Implementation Plan

Created: 2026-06-14
Author: smarcet@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Make the fishing rod's hook swing pendularly (angular oscillation) while idle. When the player presses Space to cast, the hook locks to its current swing angle and travels in a straight inclined line — so "la captura" (the catch) can happen at any allowed angle, not just straight down. All new magic numbers are defined as meaningful named constants.

## Context

Today the hook (`Hook` class, `index.js:377`) only moves **straight down**. `Hook.update()` (`index.js:392`) increments the hook's Y by 5 px/tick while Space is held, with X permanently locked to the player's X (`new Point(this._player.getPosition().getX(), formerY + 5)`). The rope is drawn as a **vertical** dashed line (`index.js:427-428`). There is no notion of an angle anywhere in the hook.

Collision is already angle-agnostic: `Game.checkCollision` (`index.js:785`) is a pure AABB test over `getPosition()` + `getSize()`, and the catch flow (`setCatch` → `Enemy.captured` → the captured enemy draws itself at `this._hook.getPosition()`) reads the hook's position generically. **So once `getPosition()` returns the swung/cast endpoint, capture at any angle works with no change to the collision or catch code.**

The codebase already has the exact pattern we need: `Trash` (`index.js:262`) and `Octopus` (`index.js:330`) drive sinusoidal motion with `angle = MAX * sin/cos(phase)` and advance a phase each tick, and named animation constants live at `index.js:8-13` (`ANIM_*`, `DRIFT_*`). The pendulum reuses this established pattern and constant convention.

**Outcome:** an idle hook that swings like a pendulum from the rod tip; a Space cast that shoots the hook along the frozen fire-time angle (with the rope visibly inclined); and fish caught anywhere along that inclined line.

## Requirements (from user + clarifications)

1. **Pendulum swing** — the idle hook oscillates side-to-side automatically (chosen: *automatic pendulum*; player times the Space press). Left/Right keep moving the boat (unchanged).
2. **Cast respects inclination** — pressing Space freezes the swing angle at the fire instant; the hook travels in a straight inclined line along that angle (chosen: *freeze at fire-time*).
3. **Capture at any allowed angle** — collision/capture works along the inclined cast, for any angle in the allowed range.
4. **Allowed swing range** — ~±30° from vertical (chosen: *moderate*).
5. **Named constants** — every new magic number is an UPPER_SNAKE_CASE module-level constant with an inline unit comment, matching the existing `ANIM_*`/`DRIFT_*` block.

## Design

All changes are contained in the `Hook` class plus a new constants block. **`Player`, `Enemy`, `Trash`, `Octopus`, `Game`, and the collision/catch flow are untouched.**

### Geometry — pivot, rope length, angle

The hook hangs from a **pivot** at the rod tip (computed from the player each frame), on a rope of length `L`, at angle `θ` measured from straight-down (positive = right):

```
pivotX = player.getPosition().getX() + HOOK_PIVOT_X_OFFSET
pivotY = player.getPosition().getY() + player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR
endpointX = pivotX + L * sin(θ)
endpointY = pivotY + L * cos(θ)
```

`getPosition()` is **overridden** (exactly like `Trash`/`Octopus` override it) to return the endpoint as a top-left corner: `new Point(endpointX - w/2, endpointY)`. This single override is what makes collision, the catch render, and the hook draw all track the angled position. Two private helpers `_pivot()` and `_endpoint()` compute these (each is ~2 trig ops, called a few times per frame — negligible, no caching needed; mirrors `Trash.getPosition()`).

### State machine (replaces the key-driven straight-down logic)

**⛔ Status vocabulary — single source of truth.** The existing code uses `_status = 'NONE'` (`index.js:383`) and `clearCaptured()` resets to `'NONE'` (`index.js:389`); `setCatch` sets `'CATCH'` (`index.js:453`) and `hadCatch()` is `_status === 'CATCH'` (`index.js:449`). This plan **renames the idle state `'NONE'` → `'IDLE'`** and uses exactly three values: `'IDLE'`, `'CAST'`, `'CATCH'`. The required edits (all in the `Hook` class) are:

- Constructor: `this._status = 'IDLE'` (was `'NONE'`).
- `clearCaptured()`: set `this._status = 'IDLE'` (was `'NONE'`) and reset `this._ropeLength = HOOK_REST_LENGTH`.
- `setCatch()` / `hadCatch()`: **unchanged** (`'CATCH'` semantics preserved — the Game collision loop at `index.js:751` depends on `hadCatch()`).

Transitions: `'IDLE'` (swinging) → `'CAST'` (extending along the frozen angle) → back to `'IDLE'`; or `'CAST'`/`'IDLE'` → `'CATCH'` (set externally by `setCatch`) → `'IDLE'` (via `clearCaptured()`).

**Frozen angle is an explicit field.** `_angle` is the *live* swing angle (updated only while IDLE). `_castAngle` is captured at the IDLE→CAST transition and is the angle `_endpoint()` uses while `_status` is `'CAST'` or `'CATCH'`. Making the freeze an explicit field (rather than "stop advancing the phase") removes any dependence on update ordering and is directly assertable in tests.

`update()` (the `spaceHeld` guard reuses the existing rule — Space held AND not Left/Right):

- **IDLE:** if `spaceHeld` → `this._castAngle = this._angle` (freeze the fire-time angle), `_status = 'CAST'`, begin extending (`_ropeLength += HOOK_CAST_SPEED`); else advance the swing: `_swingPhase += HOOK_SWING_SPEED; _angle = HOOK_MAX_SWING_ANGLE * Math.sin(_swingPhase)`.
- **CAST:** while `spaceHeld` AND `_endpoint().getY() < gameHeight * HOOK_MAX_DEPTH_FACTOR` → `_ropeLength += HOOK_CAST_SPEED` (uses `_castAngle` → straight inclined cast). Otherwise retract: `_ropeLength -= HOOK_REEL_SPEED`; when `_ropeLength <= HOOK_REST_LENGTH` → snap to `HOOK_REST_LENGTH`, return to `'IDLE'` (swing resumes from the retained `_swingPhase`).
- **CATCH** (`setCatch` was called): retract `_ropeLength -= HOOK_REEL_SPEED` along `_castAngle`; when back at rest → `clearCaptured()` → `'IDLE'`.

`_endpoint()` selects the angle: `const a = (this._status === 'IDLE') ? this._angle : this._castAngle;` — so a captured fish (CATCH) and an in-flight cast both track the frozen inclination, while the idle hook swings live.

### Rope + hook draw (`draw()`)

Replace the vertical line with `moveTo(pivot)` → `lineTo(endpoint)` (visibly inclined dashed rope), and draw the hook image at `getPosition()`. Debug readout updated to the angled coords. The caught fish keeps drawing itself at `this._hook.getPosition()` — it now follows the inclined line for free.

### New constants (added next to `index.js:8-13`)

```js
const HOOK_PIVOT_X_OFFSET   = 45;     // px - rod-tip x offset from player left edge (matches existing rope origin)
const HOOK_PIVOT_Y_FACTOR   = 0.6;    // fraction of player height - rod-tip y (pendulum pivot)
const HOOK_REST_LENGTH      = 60;     // px - rope length while idle (hook hangs and swings here)
const HOOK_MAX_SWING_ANGLE  = 0.5236; // rad - max pendulum angle from vertical (~30 deg)
const HOOK_SWING_SPEED      = 0.04;   // rad/tick - swing phase advance (~2.6s period at 60fps)
const HOOK_CAST_SPEED       = 5;      // px/tick - rope extension speed while casting (matches old descent)
const HOOK_REEL_SPEED       = 5;      // px/tick - rope retraction speed while reeling
const HOOK_MAX_DEPTH_FACTOR = 0.95;   // fraction of canvas height - deepest the hook can descend
```

### Testability

`Hook` is not currently exported and its constructor calls `document.getElementById('hook')` (fails under Jest). To unit-test the pendulum math: (a) guard the lookup — `this._image = (typeof document !== 'undefined') ? document.getElementById('hook') : null;`; (b) add `Hook` to `module.exports`. Tests build a `mockPlayer` (with `getPosition()`/`getSize()` and a `_game` exposing `hasKey`/`getSize`/`isDebug`) and call `hook.update()` directly — no canvas needed for the geometry/state.

### Autonomous decisions

- **`getPosition()` recomputes fresh (no per-frame cache).** ~6 trig calls/frame is negligible and avoids stale-position bugs across the player→hook update ordering; matches `Trash`/`Octopus`.
- **Player wind-up animation gating left as-is** (`index.js:510-511`): `if(this.__castAnimationEnded || this._state !== 'CAST') this._hook.update();`. **Trace of why freeze ≈ fire-time (corrects a spec-review concern):** on the press frame the player sets `_state='CAST'` and `__castAnimationEnded=false`, so the gate is *false* and `hook.update()` is **skipped** — the hook is **not** updated during the wind-up. Its `_angle` therefore stays at the value from the last IDLE tick *before* the press (within one tick, ≈ 0.04 rad). When `__castAnimationEnded` flips true and Space is still held, the hook resumes, is still `'IDLE'`, and immediately captures `_castAngle = _angle` — i.e. the press-time angle, **not** the animation-end angle. The freeze is correct *because* the hook is frozen during wind-up, and `_castAngle` makes it explicit rather than relying on this subtlety. No `Player` change needed.
- **Cast requires holding Space through the wind-up** (spec-review #3): if Space is released before `__castAnimationEnded`, the player returns to `'IDLE'`, the hook resumes swinging, and no cast occurs. This matches the existing control (the old hook also required holding Space to descend). Verified in the browser E2E (hold vs. tap).
- **Explicit `_castAngle` field adopted** (spec-review #2) over "halt the phase": minimal extra state, decouples the freeze from update ordering, and is directly assertable (`_castAngle` is set and held across cast/catch updates).

## Files to modify

- **`index.js`**
  - Add the 8 `HOOK_*` constants after `index.js:13`.
  - Rewrite `Hook.update()`, override `Hook.getPosition()`, rewrite `Hook.draw()`; add `_pivot()`/`_endpoint()` helpers; add `_swingPhase`/`_angle`/`_castAngle`/`_ropeLength`/`_status='IDLE'` fields in the constructor; guard the `getElementById('hook')` lookup. Update `clearCaptured()` to set `'IDLE'` (not `'NONE'`) and reset `_ropeLength`. Keep `hadCatch()`/`setCatch()` unchanged (Game collision at `index.js:751` depends on `hadCatch()`).
  - Add `Hook` to `module.exports` (`index.js:844`).
- **`__tests__/hook.test.js`** (new) — one unit test class for `Hook` (mirrors `__tests__/trash.test.js` mock style).

## Progress Tracking

- [x] **Task 1: Constants + idle pendulum swing + `getPosition()` override.** Add the `HOOK_*` constants; add swing state + `_pivot()`/`_endpoint()`; advance `_angle` while idle; override `getPosition()` to return the endpoint; guard the image lookup; export `Hook`. TDD in `__tests__/hook.test.js`.
  - Files: `index.js`, `__tests__/hook.test.js`
  - Verify: `npm test` (new swing/projection tests green + all existing green)
- [x] **Task 2: Angle-frozen cast + reel state machine + Space wiring.** Implement IDLE→CAST freeze, rope extend (depth-bounded), release/catch reel, return-to-idle. TDD: angle frozen across cast updates, rope grows/shrinks by the speed constants, endpoint X offset from pivot when angle ≠ 0 (angled capture point), reel returns to IDLE.
  - Files: `index.js`, `__tests__/hook.test.js`
  - Verify: `npm test`
- [x] **Task 3: Inclined rope + hook rendering.** Draw the rope `pivot → endpoint` and the hook at `getPosition()`; update the debug readout. Canvas — verified in the browser, not unit-tested.
  - Files: `index.js`
  - Verify: `npm test` (no regression) + browser E2E (below)

## Definition of Done

- New `Hook` unit tests (assert observable behavior, not ctx mock calls):
  - Idle swing: `_angle === 0` before update; `≈ HOOK_MAX_SWING_ANGLE * sin(HOOK_SWING_SPEED)` after one update; follows `MAX * sin(SWING_SPEED * n)` across n updates.
  - `getPosition()` returns `pivot + L*(sin,cos)` projection (x offset by `-w/2`), verified at a known angle + rope length.
  - Cast freeze: when IDLE→CAST transition fires, `_castAngle === _angle` at that tick; across subsequent cast updates `_castAngle` is unchanged while `_ropeLength` increases by `HOOK_CAST_SPEED` per tick.
  - Angled capture point: with a non-zero frozen angle, `getPosition().getX()` differs from the straight-down position by `L*sin(angle)` (proves capture can occur off-vertical).
  - Reel: after Space released (no catch), `_ropeLength` shrinks by `HOOK_REEL_SPEED` and `_status` returns to `'IDLE'` at rest.
  - Mock `_game.getSize()` returns a tall canvas (e.g. `Size(2000, 800)`) so the depth bound doesn't stop the cast mid-test; `mockCtx` unused for geometry tests.
- All existing tests pass (octopus 10 + trash 13 unchanged; `module.exports` addition is additive).
- Browser E2E (golden path): idle hook visibly swings side-to-side at the rod tip; pressing Space at a non-vertical moment casts the hook along the inclined angle with the rope rendered inclined; a fish is caught along the inclined line and reeled up. Boat still moves with Left/Right.

## Goal Verification

- **Truth 1:** `Hook.update()` advances `_swingPhase` and sets `_angle = HOOK_MAX_SWING_ANGLE * Math.sin(_swingPhase)` while idle.
- **Truth 2:** `Hook.getPosition()` returns an endpoint computed as `pivot + _ropeLength * (sin _angle, cos _angle)` — i.e. it depends on `_angle` (not a fixed X).
- **Truth 3:** On the IDLE→CAST transition, `_castAngle` is set to the current `_angle`; across cast updates `_castAngle` is unchanged and `_ropeLength` grows by `HOOK_CAST_SPEED` along that frozen angle; `clearCaptured()` sets `_status = 'IDLE'` (not `'NONE'`).
- **Truth 4:** For a non-zero `_castAngle`, the hook's capture position is horizontally offset from the pivot by `_ropeLength * sin(_castAngle)` — capture is possible off-vertical.
- **Truth 5:** All hook tunables are module-level `HOOK_*` constants (no numeric literals for pivot, length, angle, speeds, or depth in the `Hook` body).
- **Truth 6:** Diff is scoped to the constants block, the `Hook` class, and `module.exports`; `Player`/`Enemy`/`Trash`/`Octopus`/`Game`/collision are unchanged.

## Risks

| Risk | Mitigation |
|------|------------|
| Swing too subtle/wide at rest length 60 / ±30° | All tunables are constants; adjust `HOOK_REST_LENGTH` / `HOOK_MAX_SWING_ANGLE` during browser E2E without structural change. |
| Player wind-up gating delays the freeze past the press | Traced explicitly (Autonomous Decisions). The hook is frozen during wind-up; `_castAngle` is captured at the first IDLE update after `__castAnimationEnded` — ≈ press-time angle. Verify feel in browser; if the delay is perceptible, a one-tick pre-capture in `Player.update()` is the isolated fix. |
| Sign of angle flips swing direction unexpectedly | `θ` from vertical with `+sin` = right; isolated one-line sign flip if it reads backward in the browser. |
| Existing tests break from `module.exports` change | Addition is additive (only adds `Hook`); run full suite. |

## Out of Scope

- Arrow-key aiming of the swing (user chose automatic pendulum).
- Curved/continued-swing casts (user chose freeze-at-fire-time).
- Changing fish/octopus/bottle behavior, the collision algorithm, or the catch/score flow.
- Pendulum physics realism (gravity-accurate period); a sinusoidal swing is sufficient and matches the existing motion model.

## Verification

1. `npm test` — new `Hook` tests + existing 23 green, 0 failures.
2. Serve and browser-verify (Chrome DevTools MCP): `python3 -m http.server 8000` → `http://localhost:8000/main.html`.
   - Observe the idle hook swinging side-to-side at the rod tip.
   - Hold Space at a non-vertical moment → confirm the rope renders inclined and the hook travels along the frozen angle.
   - Catch a fish on an inclined cast → confirm it is captured and reeled up along the line.
   - Press Left/Right → confirm the boat still moves.
