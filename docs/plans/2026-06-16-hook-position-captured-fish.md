# Hook Appears Above Captured Fish Fix Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** When the hook captures any fish or object, the hook sprite appears far above the fish sprite instead of centered on it. Most visible with ClownFish (h=114px) and other larger fish.
**Trigger:** Any successful capture — hook transitions to HOOKED state and draws the caught entity via `drawCaptured()`.
**Root Cause:** `src/EnemyWithAnimation.js:96` — `drawCaptured()` computes `cy = hookTip.getY() + h / 2`, which places the fish display-top at the rope endpoint (hook top), so the hook sprite (25px) overlaps only the top 22% of a 114px fish. The visible fish body — centered within the die-frame cell — appears substantially below the hook.

## Investigation

- `Hook.getEndpoint()` returns the rope tip, which equals the **top** of the hook sprite (drawn at `pos.getY() = ep.getY()`). The hook barb is at `ep.getY() + 25` (hook height = 25px from `new Size(25, 25)` in `Player.js:9`).
- `drawCaptured()` (`EnemyWithAnimation.js:76-121`) computes the fish display center as `cy = hookTip.getY() + h/2`. This makes the fish top = hook top, placing the hook in the upper ~22% of a ClownFish (h=114) or ~30% of a ButterflyFish (h=82). Visually the hook is far above the fish center.
- The ClownFish move-frames have 93px of blank space at the top of each 321px cell (see `scripts/assemble_clown_fish_sprite.py`), amplifying the effect: the actual fish image starts well below the display-top, widening the visual gap.
- The throw-arc line (`EnemyWithAnimation.js:106`) encodes the same assumption: `cy += (target.getY() - (hookTip.getY() + h / 2)) * t` — must be kept consistent with whatever initial `cy` value is chosen.
- All captured entities share `EnemyWithAnimation.drawCaptured()`: ButterflyFish, ClownFish, LionFish, HammerHeadShark, SwordFish, Tuna, Crab, Octopus, DiscardedBottle. A single fix in the base class is generic across all.
- Working reference: the hook is centered when `cy = hookTip.getY()` — fish center equals the rope endpoint. The hook (25px) then spans from the fish center downward into the lower-center portion of the fish, which is the natural "hooked fish" appearance.
- No existing tests cover `drawCaptured()` positioning.

## Behavior Contract

**Given:** A fish is in HOOKED state, `hookTip = hook.getEndpoint()` at coordinates `(rx, ry)`.
**When:** `drawCaptured()` is called.
**Currently (bug):** `ctx.translate()` is called with `y = ry + h/2` — fish center is half a fish-height below the rope endpoint; hook appears far above the fish center.
**Expected (fix):** `ctx.translate()` is called with `y = ry` — fish center is at the rope endpoint; hook sprite (top at `ry`, barb at `ry+25`) lies in the upper-center portion of the fish body.
**Anti-regression:** All existing Jest tests pass; the throw-arc animation still interpolates the fish center from the hook endpoint to `getLandingTarget()`.

## Fix Approach

**Chosen:** Fix at source — change the `cy` formula in `EnemyWithAnimation.drawCaptured()`.
**Why:** Two lines, one file. Changing `cy = hookTip.getY() + h/2` to `cy = hookTip.getY()` makes the fish center the rope endpoint (generic — no dependency on fish height `h`). The throw-arc line must also be updated from `(hookTip.getY() + h / 2)` to `hookTip.getY()` to stay consistent.

**Files:** `src/EnemyWithAnimation.js`
**Strategy:** Line 96: `let cy = hookTip.getY();` (remove `+ h / 2`). Line 106: `cy += (target.getY() - hookTip.getY()) * t;` (remove `+ h / 2` from the subtracted term).
**Tests:** New test in `__tests__/catchablefish.test.js` (the existing test class for base capture behavior).
**Defense-in-depth:** N/A — isolated 2-line formula fix, no layered validation needed.

## Verification Scenario

### TS-001: Hook Centered on Captured ClownFish

**Preconditions:** Game running, ClownFish visible in the water.

| Step | Action | Expected Result (after fix) |
|------|--------|-----------------------------|
| 1 | Cast the hook and catch a ClownFish | Hook sprite overlaps the **center** of the ClownFish body, not its top-quarter |
| 2 | Hold Space to reel; observe animation during retrieval | Hook remains visually centered on the fish as it rises |
| 3 | Fish is thrown to the boat | Throw arc animation looks natural (fish arcs from hook to boat) |
| 4 | Catch a ButterflyFish | Hook also centered on ButterflyFish body |

## Tasks

> Always 3 tasks below. The `- [ ]` checkboxes immediately under this heading are the progress tracker; the `### Task N:` blocks hold the bodies.

- [x] Task 1: Write Reproducing Test (RED)
- [x] Task 2: Implement Fix at Root Cause
- [x] Task 3: Quality Gate

### Task 1: Write Reproducing Test (RED)

**Objective:** Encode the Behavior Contract as a failing test BEFORE writing any fix code.

**Files:**

- Test: `__tests__/catchablefish.test.js`

**Key Decisions / Notes:**

- Entry point: `fish.draw()` (which routes to `drawCaptured()` when status is CAPTURED)
- Build a minimal mock hook exposing `getEndpoint()`, `getSize()`, `isCatchableFishHooked()`, `_escapeProgress`, `getCaptureRawProgress()` (< CAPTURE_THROW_THRESHOLD), and `getLandingTarget()`
- Set hook endpoint Y to a known value (e.g. 300), fish `h = 82` (ButterflyFish size)
- After `fish.captured(hook)` and `fish.draw()`, assert `mockCtx.translate` was called with `(rx, ry)` — i.e. the **second argument is `ry`**, NOT `ry + h/2`
- Test name: `test_drawCaptured_translatesTo_hookEndpoint_not_hookEndpointPlusHalfHeight`

**Definition of Done:**

- [ ] Test exists and is named as above.
- [ ] Test fails because `translate` is currently called with `y = ry + 41` (ry + h/2 for h=82).
- [ ] Verify: `npm test -- --testPathPattern=catchablefish --silent` (must FAIL)

### Task 2: Implement Fix at Root Cause

**Objective:** Change the two affected lines in `drawCaptured()` so the reproducing test passes without breaking `Anti-regression`.

**Files:**

- Modify: `src/EnemyWithAnimation.js`

**Key Decisions / Notes:**

- Line 96: `let cy = hookTip.getY() + h / 2;` → `let cy = hookTip.getY();`
- Line 106: `cy += (target.getY() - (hookTip.getY() + h / 2)) * t;` → `cy += (target.getY() - hookTip.getY()) * t;`
- No other files need touching — all fish subclasses inherit `drawCaptured()`.

**Definition of Done:**

- [ ] Reproducing test passes.
- [ ] Diff touches only `src/EnemyWithAnimation.js`.
- [ ] No workaround at call sites.
- [ ] Verify: `npm test -- --testPathPattern=catchablefish --silent` (must PASS)

### Task 3: Quality Gate

**Objective:** Lint + full suite pass after fix.

**Files:**

- No production files expected; update this plan's progress and status.

**Key Decisions / Notes:**

- No build step (vanilla JS). No type checker. Lint is implicit (no ESLint config — Jest suite is the quality gate).

**Definition of Done:**

- [ ] Full suite is green (0 failures).
- [ ] No SPEC-DEBUG markers in the diff.
- [ ] Verify: `npm test -- --silent`
