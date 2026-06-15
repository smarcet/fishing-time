# Bottle (Trash) Animation Improvements Implementation Plan

Created: 2026-06-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The floating bottle (`Trash`) bobs up and down, rocks side to side, cycles its sprite frames at a readable speed, and drifts more slowly than the fish — giving it a lively "floating in water" feel. The change ships with a Jest unit-test harness (the project's first) and an ADR recording the decision.

## Out of Scope

- Animation changes to fish or the octopus — their motion stays byte-for-byte identical (guaranteed via a default-valued `_driftSpeed`).
- Capture state visuals: when the bottle is hooked (`CAPTURED`), it still draws statically at the hook position. Bobbing/rocking only apply while it floats.
- Sound, scoring, or gameplay changes.

## Approach

**Chosen:** Extend `Trash.update()` / `Trash.draw()` (index.js:236) with sinusoidal bob + rock and a frame-stagger, plus a low `_driftSpeed`; make the shared base classes parameterizable without altering existing callers; add Jest + dual-mode (browser/CommonJS) exports to `index.js` so the math is unit-testable.
**Why:** Keeps the new motion localized to `Trash` while reusing the existing `update()`/`draw()` lifecycle and getter conventions; the only base-class edits are two overridable field defaults (`_driftSpeed`, `_staggerFrame`) — no constructor-signature changes — so fish/octopus behavior is preserved and `Trash` opts in by overriding the fields after `super()`.

## Context for Implementer

`index.js` is a single 748-line browser script with **no module system and no build step**. Sprites are preloaded as hidden `<img>` tags in `main.html` and fetched via `document.getElementById` *inside constructors* (`Hook`, `Player`, `Bubble`, `EnemyFactory`) — but `Trash`/`Enemy` receive their image as a constructor argument, so `Trash` is the one entity that can be instantiated headless with a mock image. The only top-level browser reference is the `window.addEventListener('load', ...)` bootstrap at index.js:703 — guarding it behind `typeof window !== 'undefined'` makes the file safe to `require()` under Node/Jest.

Class chain: `GameObject → Enemy → EnemyWithAnimation → Trash`. `Trash` currently has **no** `update()` of its own (it inherits `EnemyWithAnimation.update`, which advances `frameX` every tick with no stagger and drifts at the hardcoded ±1.5 from `Enemy.update`, index.js:111).

## Animation Parameters (pronounced / playful feel)

| Param | Value | Meaning |
|-------|-------|---------|
| `_bobAmplitude` | `12` px | vertical bob magnitude |
| `_bobSpeed` | `0.08` rad/tick | phase increment (~1.3 s period @60fps) |
| `_maxAngle` | `0.1745` rad (≈10°) | max rock tilt |
| `_staggerFrame` | `6` | advance sprite frame every 6 ticks |
| `_driftSpeed` | `0.6` px/tick | horizontal drift (vs fish 1.5) |

Bob and rock are deliberately out of phase so the bottle tilts as it rises/falls: `bobOffset = amp * sin(phase)`, `angle = maxAngle * cos(phase)`.

## Assumptions

- Jest's default test environment (`node`) is sufficient — `Trash.update()` touches no DOM. Task 4 depends on this.
- `Trash` is constructed with `maxFrames = 10` matching the 10-frame `green_bottle_sprite.png` (760×92, ten 76px frames) — confirmed via the sprite file and `Game` constructor at index.js:599.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Base-class edits change fish/octopus motion | Low | High | `_driftSpeed` defaults to `1.5` and `staggerFrame` defaults to `1` in the base constructors; existing callers pass neither, so behavior is unchanged. Task 4 includes a regression assertion that a plain `EnemyWithAnimation` drifts at 1.5 and advances every tick. |
| `require('./index.js')` throws in Node on the `window` bootstrap | Med | High | Guard the bootstrap with `typeof window !== 'undefined'`; verified by the test suite simply loading. |

## Progress Tracking

- [x] Task 1: Parameterize base classes (`Enemy._driftSpeed`, `EnemyWithAnimation` stagger) without changing fish behavior
- [x] Task 2: Implement pronounced bob + rock + stagger + slow drift in `Trash`
- [x] Task 3: Add Jest harness + dual-mode (browser/CommonJS) `index.js`
- [x] Task 4: Unit tests for `Trash` animation + base-class regression
- [x] Task 5: Write ADR recording the animation + test-harness decisions

## Implementation Tasks

### Task 1: Parameterize base classes without changing existing behavior

**Objective:** Make horizontal drift speed and frame-advance stagger configurable on the shared base classes so `Trash` can opt into slower, staggered motion, while fish and the octopus keep their exact current behavior through default values.

**Files:**

- Modify: `index.js` (`Enemy` constructor + `update` at ~111; `EnemyWithAnimation` constructor + `update` at ~146)

**Key Decisions / Notes:**

- In `Enemy` constructor add `this._driftSpeed = 1.5;`. In `Enemy.update` replace the two hardcoded `1.5` / `-1.5` literals with `this._driftSpeed` / `-this._driftSpeed`.
- In `EnemyWithAnimation` constructor add `this._staggerFrame = 1;` and `this._tick = 0;` (overridable field defaults — **no new constructor param**). In `update`, gate the existing `frameX`/`frameY` advance behind `if (++this._tick % this._staggerFrame === 0)`. With the default `1`, the gate is always true → identical to today.
- Using field defaults rather than positional params avoids forcing `Trash` to pass `undefined` placeholders for the existing `maxFrameY`/`dieFrameX`/`dieFrameY` args; the fish (`…, 10`) and octopus (`EnemyFactory`) call sites are untouched.

**Definition of Done:**

- [ ] A `new EnemyWithAnimation(...)` with no stagger/drift args advances `frameX` every `update()` and drifts at 1.5 (unchanged).
- [ ] `Enemy.update` no longer contains the literals `1.5` / `-1.5`.
- [ ] Verify: `npx jest` (the Task 4 regression test exercises this).

### Task 2: Implement pronounced bob + rock + stagger + slow drift in Trash

**Objective:** Give the floating bottle a playful animation: it bobs vertically, rocks (tilts) side to side out of phase with the bob, cycles its sprite frames at a readable staggered speed, and drifts horizontally slower than the fish. Captured-state drawing is unchanged.

**Files:**

- Modify: `index.js` (`Trash` class at ~236)

**Key Decisions / Notes:**

- Constructor: after `super(...)` (unchanged call), override the inherited fields — `this._staggerFrame = 6`, `this._driftSpeed = 0.6` — and set `this._bobAmplitude = 12`, `this._bobSpeed = 0.08`, `this._maxAngle = 0.1745`, `this._bobPhase = 0`, `this._bobOffset = 0`, `this._angle = 0`.
- Add `Trash.update()`: call `super.update()` (handles staggered frame advance + slow drift), then `this._bobPhase += this._bobSpeed; this._bobOffset = this._bobAmplitude * Math.sin(this._bobPhase); this._angle = this._maxAngle * Math.cos(this._bobPhase);`
- In `Trash.draw()` non-captured branch: apply `dy + this._bobOffset` and wrap the `drawImage` in a rotation around the bottle center — `ctx.save(); ctx.translate(dx + w/2, dy + this._bobOffset + h/2); ctx.rotate(this._angle); ctx.drawImage(image, this._frameX*w, 0, w, h, -w/2, -h/2, w, h); ctx.restore();`
- Remove only the no-op `this._ctx.filter = opacity(${this._opacity})` line from `Trash.draw` (it's a full override with no `super.draw()`, so removal is local and safe). **Do NOT remove the `_opacity` field** — it is still assigned in the base `EnemyWithAnimation` and is not globally dead. `Game.draw` already resets `ctx.filter = 'none'` each frame (index.js:669).
- Keep the `CAPTURED` branch (draws frame `0,0` at the hook, index.js:248-260) and debug overlay exactly as-is — bob/rock apply only to the floating branch.
- Note (intended): at spawn `_bobPhase = 0` → `cos(0)=1` so the bottle starts at max tilt (±10°) with zero bob offset, then settles into the cycle. Acceptable for the playful feel.

**Definition of Done:**

- [ ] After repeated `update()` calls, `_bobOffset` equals `12*Math.sin(phase)` and `_angle` equals `0.1745*Math.cos(phase)` (assert with `toBeCloseTo`).
- [ ] With pre-increment `++this._tick` gating: `_frameX` stays `0` through updates 1–5, becomes `1` on update 6, and wraps `9 → 0` on update 60.
- [ ] Bottle starts at `x=0` so `lBound === 0` sets `_speedX = +0.6` on the first `update()` → x becomes `0.6`; a second `update()` yields `1.2` (sustained drift at 0.6, never 1.5).
- [ ] Verify: `npx jest`.

### Task 3: Add Jest harness and make index.js loadable under Node

**Objective:** Introduce the project's first test tooling (Jest) and make `index.js` usable both in the browser (unchanged) and as a CommonJS module so its classes can be required in tests.

**Files:**

- Create: `package.json`
- Modify: `index.js` (guard bootstrap at ~703; add conditional exports at end of file)

**Key Decisions / Notes:**

- `package.json`: `{"name":"fishing-time","private":true,"scripts":{"test":"jest"},"devDependencies":{"jest":"^29"}}`. Default Jest test env is `node` — no jsdom needed.
- Wrap the bootstrap: `if (typeof window !== 'undefined') { window.addEventListener('load', function(){ ... }); }`. No logic changes inside.
- At the very end of `index.js`: `if (typeof module !== 'undefined' && module.exports) { module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash }; }`. Guarded so the browser `<script>` path is untouched.
- Document the new `npm test` command in `.claude/rules/fishing-time-project.md` (Running the Game section gains a Testing note).

**Definition of Done:**

- [ ] `require('./index.js')` under Node returns the exported classes without throwing.
- [ ] Loading `main.html` in a browser still runs the game (no `module is not defined` / behavior change).
- [ ] Verify: `npx jest` runs (even before tests exist it must not error on import).

### Task 4: Unit tests for Trash animation and base-class regression

**Objective:** Cover the bottle's animation math and prove fish behavior is preserved, asserting observable `update()` outputs with a mock ctx/image/game — no canvas rendering.

**Files:**

- Create: `__tests__/trash.test.js`

**Key Decisions / Notes:**

- One unit test class for `Trash` (the testing-posture ceiling). Instantiate **only** `Size`, `Point`, `Trash`, and `EnemyWithAnimation` — do NOT instantiate `Game`, `Player`, `Hook`, `Bubble`, or `EnemyFactory`, as those call `document.getElementById` inside their constructors and throw under the Jest `node` environment.
- `mockGame` must have `getSize: () => new Size(600, 800)` — width `800` large enough that the bottle never hits the right wall during the assertions. If width is too small, `rBound >= width` fires and flips `_speedX` to `-0.6`, breaking the drift assertion silently.
- `mockCtx` no-op stubs (`drawImage`, `beginPath`, etc.) — not asserted on. `mockImage = {}`.
- Behavior-focused assertions (assert computed outputs, not which mock was called):
  - bob: after zero updates, `_bobOffset === 0`; after one update, `_bobOffset` ≈ `12*Math.sin(0.08)` (toBeCloseTo).
  - rock: after one update, `_angle` ≈ `0.1745*Math.cos(0.08)` (toBeCloseTo; NOT `cos(0)` — phase advanced before rock computed).
  - stagger: `_frameX === 0` after updates 1–5; `=== 1` after update 6; wraps to `0` after update 60 (maxFrameX=10, 6 ticks × 10 frames).
  - drift: start at `x=0` → after update 1, `getPosition().getX() === 0.6` (lBound===0 triggers `_speedX=+0.6`); after update 2, `getPosition().getX() ≈ 1.2` (sustained).
  - regression: a plain `EnemyWithAnimation` with same mock at `x=0` advances `_frameX` on every tick (stagger=1) and has `getPosition().getX() === 1.5` after one update.
- Use `toBeCloseTo` for all trig assertions (derive expected from `Math.sin`/`Math.cos`, never eyeballed).

**Definition of Done:**

- [ ] Bob: `_bobOffset` is `0` before any update, `≈12*Math.sin(0.08)` after one update.
- [ ] Rock: `_angle ≈ 0.1745*Math.cos(0.08)` after one update (phase advanced first).
- [ ] Stagger: `_frameX===0` for 5 updates, `===1` on the 6th, wraps to `0` after 60.
- [ ] Drift: `getX()===0.6` after update 1, `≈1.2` after update 2 (starting at `x=0`, wide mock game).
- [ ] Regression: plain `EnemyWithAnimation` at `x=0` → `frameX` advances every tick, `getX()===1.5` after one update.
- [ ] Verify: `npx jest` → all green, 0 failures.

### Task 5: Write the ADR

**Objective:** Record the architectural decisions (the bottle animation model and, more significantly, introducing a Jest test harness + dual-mode module exports into a previously no-build vanilla-JS project) so the rationale survives.

**Files:**

- Create: `docs/adr/0001-bottle-animation-and-test-harness.md`

**Key Decisions / Notes:**

- Standard ADR format: Context · Decision · Consequences · Alternatives considered.
- Context: lively bottle motion wanted; no test infra existed.
- Decision: sinusoidal bob (out-of-phase rock), frame stagger, configurable `_driftSpeed`; Jest + `typeof window` guard + conditional CommonJS exports for headless testability.
- Consequences: `node_modules` now exists; `index.js` is dual-mode; base classes carry additive params; fish/octopus unchanged.
- Alternatives: `node --test` (rejected — user chose Jest); extracting classes into separate ES modules (rejected — larger blast radius for a single-file game).
- Draft content is mirrored in the "ADR Draft" appendix below so the user reviews it with this plan.

**Definition of Done:**

- [ ] `docs/adr/0001-bottle-animation-and-test-harness.md` exists with Context/Decision/Consequences/Alternatives matching what was implemented.
- [ ] No code/test verification needed (docs-only task).

---

## ADR Draft (preview — Task 5 writes this to `docs/adr/0001-…`)

```markdown
# ADR 0001: Bottle Animation Model and Test Harness

Date: 2026-06-14
Status: Accepted

## Context

`fishing-time` is a single-file (`index.js`) HTML5-canvas game with no module
system, no build step, and no tests. The floating bottle (`Trash`) animated
stiffly: it advanced sprite frames every frame (too fast), drifted at the same
speed as the fish, and had no vertical or rotational motion. We want it to feel
like it is bobbing in water, and we want the animation math under test — which
requires running game code outside the browser for the first time.

## Decision

1. **Animation:** Add sinusoidal vertical bob (amplitude 12px) and an
   out-of-phase rocking tilt (±10°, driven by `cos` against the bob's `sin`),
   a 6-tick sprite-frame stagger, and a slower horizontal drift (0.6 vs 1.5
   px/tick). The motion lives in `Trash.update()`/`draw()`.
2. **Parameterization:** Promote drift speed and frame stagger to base-class
   fields (`Enemy._driftSpeed = 1.5`, `EnemyWithAnimation` `staggerFrame = 1`)
   with defaults that preserve existing fish/octopus behavior exactly.
3. **Test harness:** Adopt Jest. Make `index.js` dual-mode — guard the
   `window.addEventListener('load')` bootstrap with `typeof window !== 'undefined'`
   and append a `typeof module` guarded `module.exports`. The browser `<script>`
   path is unchanged; Node/Jest can `require()` the classes.

## Consequences

- The repo gains `package.json` and `node_modules` (dev-only). The game itself
  still needs no build to run.
- `index.js` is now loadable in both browser and CommonJS contexts.
- Base classes carry two additive parameters; all current call sites rely on the
  defaults, so fish and octopus motion is byte-for-byte unchanged (covered by a
  regression test).
- `Trash` is the one entity unit-testable headless because it takes its sprite
  image as a constructor argument rather than via `document.getElementById`.

## Alternatives Considered

- **Node built-in test runner (`node --test`):** zero dependencies and closer to
  the project's no-build ethos, but Jest was chosen for its richer matchers and
  familiarity.
- **Extracting classes into ES modules:** cleaner separation but a much larger
  blast radius for a single-file game; deferred.
```

## Verification

End-to-end after implementation:

1. `npx jest` → all unit tests pass (bob, rock, stagger, slow drift, base regression).
2. Serve and open in a browser: `python3 -m http.server 8000` → `http://localhost:8000/main.html`. Observe the bottle bobbing up/down, tilting side to side, cycling frames smoothly, and drifting slower than the fish. Confirm fish/octopus look unchanged and the bottle still draws on the hook when caught (browser automation per the frontend-verification rule).
3. Confirm `docs/adr/0001-bottle-animation-and-test-harness.md` matches the implementation.
