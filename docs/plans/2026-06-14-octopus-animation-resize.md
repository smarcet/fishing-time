# Octopus Animation & Resize Implementation Plan

Created: 2026-06-14
Author: smarcet@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The octopus (`pulpo`) is the large animated enemy spawned by `EnemyFactory` (`index.js:551`). Today it is a plain `EnemyWithAnimation`: it only drifts horizontally (1.5 px/tick, bouncing off walls) and cycles its 4×4 swim spritesheet on **every** frame, which looks fast and flat. It is also oversized at `Size(489.5, 397.5)`.

The bottle was just given a natural sinusoidal motion (vertical sine **bob** + out-of-phase rotational **rock** + slowed frame stagger) via the `Trash` subclass. The user wants the octopus to feel the same way, be half its current size, and visually turn to face its travel direction when it bounces off a wall.

**Outcome:** a smaller octopus that bobs and rocks like the bottle, swims at a calmer frame rate, and flips horizontally to face the way it is moving.

## Requirements (from user)

1. **Natural motion** — bob (vertical sine) + rock (gentle out-of-phase rotation), same feel as the bottle.
2. **Slow the swim cycle** — add a frame stagger so the 4×4 sheet cycles more slowly (like the bottle's `_staggerFrame = 6`).
3. **Half size** — `Size(489.5, 397.5)` → `Size(244.75, 198.75)` (both dimensions halved; hitbox halves too).
4. **Face travel direction** — when the octopus reaches a wall and reverses, mirror the sprite horizontally so it faces the new direction.

## Design

Add a dedicated **`Octopus extends EnemyWithAnimation`** subclass — the direct parallel of the bottle's `Trash` subclass. This keeps the change self-contained: fish (other `EnemyWithAnimation` instances) and the freshly-verified `Trash`/bottle are **untouched**, so there is zero regression risk to existing motion.

The octopus reuses the existing engine primitives:
- **Drift + direction** already exist in `Enemy.update()` (`index.js:112`): `_speedX`/`_direction` flip at `lBound === 0` and `rBound >= width`. No change needed to the bounce logic — `_direction` (`+1` right, `-1` left) already tracks facing.
- **Frame cycling + stagger** already exist in `EnemyWithAnimation` (`index.js:164`): `++_tick % _staggerFrame === 0` gates `_frameX`/`_frameY` advance across the 4×4 grid. Setting `_staggerFrame = 6` slows it.
- **Bob + rock** mirror the `Trash` implementation (`index.js:255-302`): phase-advanced `Math.sin`/`Math.cos`, applied in `draw()` via `save`/`translate(center)`/`rotate`/`drawImage(centered)`/`restore`, plus a `getPosition()` override so collision tracks the bobbed Y.
- **Direction flip** is the one genuinely new draw behavior: a `ctx.scale(_direction === -1 ? -1 : 1, 1)` inside the transform mirrors the sprite when moving left. Because the octopus spawns at `Point(0, 300)` (`lBound === 0`), the **first** `update()` already sets `_direction = 1` — so the flip is active from update 1, not only after the first wall bounce. The visual default (no flip) corresponds to moving right.

`Octopus.draw()` differs from `Trash.draw()` in two necessary ways: it indexes the **4×4** sheet (`_frameX*w, _frameY*h`, not hardcoded row 0) and its CAPTURED branch uses the octopus's **die-frames** (`_dieFrameX`/`_dieFrameY`), matching the base `EnemyWithAnimation.draw()` behavior.

### Autonomous decision: dedicated subclass vs. lifting bob/rock into the base

Chosen: **dedicated `Octopus` subclass**, accepting ~11 lines of bob/rock similarity with `Trash`. Rationale: zero blast radius on fish and the just-verified bottle, directly parallels the bottle's design ("similar to the bottle"), and is trivially unit-testable in isolation. Lifting the mechanism into `EnemyWithAnimation` would touch the shared fish update/draw path and refactor recently-verified code for marginal DRY gain — deferred until a third animated enemy actually needs it (YAGNI). This trade-off is documented so the code review does not re-flag the duplication.

### Parameters (match the bottle's feel — user chose "like bottle", not "bigger sway")

`_staggerFrame = 6`, `_bobAmplitude = 12`, `_bobSpeed = 0.08`, `_maxAngle = 0.1745` (~10°). These may be nudged up during browser verification if the bob reads too subtly on the larger sprite — noted as a visual tunable, not a code change to the structure.

## Files to modify

- **`index.js`**
  - Add `class Octopus extends EnemyWithAnimation` after `Trash` (~line 303).
    - **⛔ Constructor must take the full frame signature** `(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY)` and forward **all nine** args to `super(...)`. Do **NOT** copy `Trash`'s `(…, maxFrames)` single-arg shape: `Trash` hardcodes row 0 and CAPTURED source `0,0`, so it can leave `maxFrameY`/`dieFrameX`/`dieFrameY` undefined. The octopus indexes the full **4×4** sheet (`_frameX*w, _frameY*h`) and uses `_dieFrameX`/`_dieFrameY` in CAPTURED — undefined there means `_frameY` never advances (top rows of the swim never play) and a captured octopus draws from `NaN` source coords (blank). All four frame params are required.
    - Constructor then sets the motion params (`_staggerFrame=6, _bobAmplitude=12, _bobSpeed=0.08, _maxAngle=0.1745`) + `_bobPhase/_bobOffset/_angle = 0`.
    - `update()` advances phase and computes `_bobOffset`/`_angle`; `getPosition()` returns bobbed Y; `draw()` renders the 4×4 frame with the bob/rock transform + horizontal flip, and a CAPTURED branch using die-frames (`_dieFrameX`/`_dieFrameY`).
  - `EnemyFactory` constructor (`index.js:551`): octopus `size` → `new Size(244.75, 198.75)`.
  - `EnemyFactory.createEnemy()` (`index.js:561`): construct `new Octopus(...)` instead of `new EnemyWithAnimation(...)`. Spawn `new Point(0, 300)` unchanged.
  - `module.exports` (`index.js:770`): add `Octopus`.
- **`__tests__/octopus.test.js`** (new) — unit tests for the testable motion logic (see DoD). Mirrors `__tests__/trash.test.js` structure; one test class for the `Octopus` production class.

## Progress Tracking

- [x] **Task 1: `Octopus` class + export.** Implement the subclass (bob, rock, slowed stagger, direction-flip draw, 4×4 + die-frame branches) and add it to `module.exports`. TDD via `__tests__/octopus.test.js`.
  - Files: `index.js`, `__tests__/octopus.test.js`
  - Verify: `npm test` (new octopus tests green + all existing green)
- [x] **Task 2: Factory wiring + half size.** Set octopus spec size to `Size(244.75, 198.75)` and have `createEnemy('octopus', …)` build `new Octopus(game, ctx, spec.size, new Point(0,300), spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY)` passing all four frame params (they already exist on the spec object). Spawn point unchanged.
  - Files: `index.js`
  - Verify: `npm test`; browser load shows a half-size octopus that bobs/rocks, swims slower, and flips at the wall.

## Definition of Done

- New `Octopus` unit tests (assert observable behavior, not ctx mock calls):
  - `_bobOffset` is `0` before any update; `≈ 12*sin(0.08)` after one update; follows `12*sin(0.08*n)` across n updates.
  - `getPosition().getY()` reflects the bob offset (`base_y + _bobOffset`) after update.
  - `_angle ≈ 0.1745*cos(0.08)` after one update (rock, out of phase with bob).
  - Frame stagger: `_frameX` stays `0` for the first 5 updates and becomes `1` on the 6th (`_staggerFrame = 6`).
  - `_direction === 1` after the first update (the spawn at `lBound === 0` immediately sets rightward direction).
  - **Mock helpers** use a `mockGame` returning `Size(600, 800)` (800px wide) so a right-wall bounce does not pollute `_direction` or `_speedX` during the stagger or bob tests. The `mockCtx` must include `scale: () => {}` (needed by `Octopus.draw()`).
  - `makeOctopus()` must pass all four frame params: `maxFrameX=4, maxFrameY=4, dieFrameX=1, dieFrameY=1`.
- All existing tests still pass (fish regression + 13 Trash tests unchanged).
- Browser E2E (golden path): octopus renders at half size, bobs vertically, rocks gently, swim frames cycle slower than before, and the sprite mirrors horizontally after it bounces off a wall. Fish and bottle motion visibly unchanged.

## Goal Verification

- **Truth 1:** `index.js` defines `class Octopus extends EnemyWithAnimation` and exports it.
- **Truth 2:** The octopus factory spec size is `Size(244.75, 198.75)` (exactly half of `489.5 × 397.5`).
- **Truth 3:** `createEnemy` returns an `Octopus` instance for `'octopus'`.
- **Truth 4:** `Octopus.update()` advances `_bobPhase` and sets `_bobOffset`/`_angle` from sin/cos; `Octopus.draw()` applies the bob/rock transform and a `ctx.scale(...)` horizontal flip keyed on `_direction`.
- **Truth 5:** `Octopus._staggerFrame === 6` (slower swim cycle than the prior every-frame default).
- **Truth 6:** No change to `Trash`, fish construction, or `Enemy`/`EnemyWithAnimation` shared methods (diff scoped to the additions above).

## Risks

| Risk | Mitigation |
|------|------------|
| Sprite flips the wrong way (native facing unknown) | Verify visually in browser; swap the `_direction` sign in the single `ctx.scale` call if it faces backward. Isolated one-line tunable. |
| Bob amplitude too subtle on the larger sprite | Visual tunable; bump `_bobAmplitude`/`_maxAngle` during E2E without structural change. |
| Half-size hitbox changes catch difficulty | Expected/intended; capture still works via `getPosition()`+`getSize()` AABB. Confirm capture in browser. |
| Duplication with `Trash` re-flagged by review | Documented autonomous decision (YAGNI, zero-risk); not a defect. |

## Out of Scope

- Lifting bob/rock into `EnemyWithAnimation` (deferred until a third animated enemy needs it).
- Changing fish behavior (fish do not flip — pre-existing, not requested).
- Changing octopus drift speed (stays at the inherited 1.5 px/tick).
