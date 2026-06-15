# Rope Pivot Doesn't Follow Rod Tip During Cast Fix Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Bugfix

## Summary

**Symptom:** When the hook is being cast (SPACE held), the upper end of the rope animation floats above or below the tip of the fishing rod instead of staying attached to it. The rope pivots from the wrong Y coordinate.

**Trigger:** Whenever the boat is bobbing (which is always — `_bobOffset` ≠ 0) and the player starts casting.

**Root Cause (1):** `index.js:477` — `Hook._pivot()` subtracted `this._player._bobOffset` from `pos.getY()` during CAST/CATCH states, but `pos.getY()` already includes `_bobOffset` (because `Player.getPosition()` adds it). Fixed by removing the subtraction.

**Root Cause (2):** `HOOK_PIVOT_X_OFFSET = 45` and `HOOK_PIVOT_Y_FACTOR = 0.6` were calibrated for the idle sprite's rod-tip position. The cast final frame has the rod pointing down-left with its tip at approximately (x≈12px from left, y≈65% from top) in sprite-frame coordinates. Fixed by adding `HOOK_CAST_PIVOT_X_OFFSET = 12` and `HOOK_CAST_PIVOT_Y_FACTOR = 0.65` used when player._state is 'CAST'.

**Root Cause (3):** `_pivot()` used `this._status === 'CAST'` to select pivot constants, but `this._status` (hook internal state) and `this._player._state` (player visual state) desync during reel-in: releasing SPACE immediately sets `player._state = 'IDLE'` (idle sprite shown) while `hook._status` stays 'CAST' until rope retracts to REST_LENGTH. During this window, CAST constants were applied to the idle sprite — wrong rod-tip position. Fixed by changing the condition to `this._player._state === 'CAST'`, keeping the pivot synchronized with the visible sprite.

## Investigation

- `Player.getPosition()` (line 614–617) returns `(p.getX(), p.getY() + this._bobOffset)` — the Y always includes the current bob offset. This is used for both rendering the sprite and computing the hook pivot.
- The player sprite is drawn with its top-left at `(pos.getX(), pos.getY())`, i.e., `(_position.getY() + _bobOffset)`. The visual rod tip in the sprite is therefore at Y = `_position.getY() + _bobOffset + height * HOOK_PIVOT_Y_FACTOR`.
- In `Hook._pivot()` lines 468–479, the existing code is:
  ```js
  const bobOffset = (this._status === 'IDLE') ? 0 : (this._player._bobOffset || 0);
  const py = (pos.getY() - bobOffset) + this._player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR;
  ```
  During CAST: `pos.getY() = _position.getY() + _bobOffset`, so after subtracting `_bobOffset`:
  `py = _position.getY() + H * FACTOR` — the bob is cancelled out.
  But the sprite rod tip is at `_position.getY() + _bobOffset + H * FACTOR`.
  Discrepancy = `_bobOffset` (up to ±12 px).
- During IDLE the same formula uses `bobOffset = 0`, so `py = pos.getY() + H * FACTOR` which *does* include the bob. The IDLE state is correct. Only CAST/CATCH is broken.
- The misleading comment at line 476 ("strip the bob offset so the rope top stays fixed at the rod-tip position in the sprite (which doesn't oscillate in the cast animation)") describes the wrong intent: even if the cast animation frames don't change during the bob, the entire sprite translates up/down with `_bobOffset`, so the rod tip in screen space does oscillate.
- No recent commits changed the CAST bob-stripping logic; the bug was introduced with the original cast implementation (`fcb1570`).

## Behavior Contract

**Given:** The boat is floating and `_bobOffset` is non-zero (normal condition — the boat always bobs).

**When:** The player presses SPACE to cast the hook (`Hook._status` transitions to `'CAST'`).

**Currently (bug):** The rope's pivot point (top end) sits at `_position.getY() + H * HOOK_PIVOT_Y_FACTOR`, which is `_bobOffset` pixels above the actual rendered rod tip. The rope appears to detach from the rod tip and float independently.

**Expected (fix):** The rope's pivot Y equals `pos.getY() + H * HOOK_PIVOT_Y_FACTOR` = `_position.getY() + _bobOffset + H * HOOK_PIVOT_Y_FACTOR`, matching the rendered rod-tip screen coordinate in all hook states (IDLE, CAST, CATCH).

**Anti-regression:** `Hook getPosition() projection` suite and all existing `hook.test.js` tests must still pass — they use `_bobOffset = undefined` (treated as 0), so the expected pivot Y is unchanged for zero-bob cases.

## Fix Approach

**Chosen:** Remove the special-casing in `Hook._pivot()` and always use `pos.getY()` directly.

**Why:** The IDLE branch already computes `py = pos.getY() + H * FACTOR` correctly (it passes `bobOffset = 0`). The CAST/CATCH branch introduces an unnecessary subtraction that breaks the invariant. Deleting the 2-line `bobOffset` variable and the conditional expression restores the correct, already-working formula for all states. No other fix is needed.

**Files:** `index.js` (3-line change inside `_pivot()`, lines 477–478)

**Strategy:** Replace:
```js
const bobOffset = (this._status === 'IDLE') ? 0 : (this._player._bobOffset || 0);
const py = (pos.getY() - bobOffset) + this._player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR;
```
With:
```js
const py = pos.getY() + this._player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR;
```

**Tests:** `__tests__/hook.test.js` — add one new test in a new `describe` block that sets a non-zero `_bobOffset` on the mock player, puts the hook in CAST status, and asserts `pivot.getY() === player.getPosition().getY() + PLAYER_H * HOOK_PIVOT_Y_FACTOR`.

## Verification Scenario

### TS-001: Rope Top Stays Attached to Rod Tip During Cast

**Preconditions:** Game loaded, boat visible and bobbing at water surface.

| Step | Action | Expected Result (after fix) |
|------|--------|-----------------------------|
| 1 | Hold SPACE to cast the hook | Rope upper end stays glued to the rod tip as the boat bobs |
| 2 | Watch the boat bob up and down while casting | Rope pivot moves with the rod tip — no gap or floating detachment |
| 3 | Release SPACE to reel in | Rope retracts while remaining attached to rod tip throughout |

## Tasks

> Always 3 tasks below. The `- [ ]` checkboxes immediately under this heading are the progress tracker; the `### Task N:` blocks hold the bodies.

- [x] Task 1: Write Reproducing Test (RED)
- [x] Task 2: Implement Fix at Root Cause
- [x] Task 3: Quality Gate

### Task 1: Write Reproducing Test (RED)

**Objective:** Encode the Behavior Contract as a failing test BEFORE writing any fix code.

**Files:**

- Test: `__tests__/hook.test.js` (add a new `describe` block at the end of the file)

**Key Decisions / Notes:**

- Entry point: `Hook._pivot()` via direct call — it is a public-ish internal method that drives `getPosition()` and `draw()`. Testing it directly is the shortest path to encode "pivot Y follows rod-tip including bob".
- The existing `makeHook()` factory uses `_bobOffset = undefined`. We need a variant `makeHookWithBob(bobOffset, state)` that sets `_bobOffset` on the mock player and makes `getPosition()` return `new Point(PLAYER_X, PLAYER_Y + bobOffset)`.
- Set `hook._status = 'CAST'` directly (avoids needing game loop ticks for reproduction).
- Assert `pivot.getY()` equals `(PLAYER_Y + BOB) + PLAYER_H * HOOK_PIVOT_Y_FACTOR`.

**Definition of Done:**

- [ ] Test named `test('pivot y tracks rod-tip Y during CAST when boat is bobbing', ...)`.
- [ ] Test fails with the current (buggy) code — pivot Y will be `PLAYER_Y + PLAYER_H * HOOK_PIVOT_Y_FACTOR` (189), not `PLAYER_Y + BOB + PLAYER_H * HOOK_PIVOT_Y_FACTOR` (201 for BOB=12).
- [ ] Verify: `npm test -- --testPathPattern=hook.test.js --silent` → test fails.

### Task 2: Implement Fix at Root Cause

**Objective:** Minimal change at `index.js:477` that makes the reproducing test pass.

**Files:**

- Modify: `index.js` (inside `Hook._pivot()`, lines 477–478)

**Key Decisions / Notes:**

- Delete lines that compute `bobOffset` and the old `py`.
- Replace with `const py = pos.getY() + this._player.getSize().getHeight() * HOOK_PIVOT_Y_FACTOR;`
- Remove the now-obsolete comment at line 476 that described the (wrong) intent.

**Definition of Done:**

- [ ] Reproducing test passes.
- [ ] Diff touches only `Hook._pivot()` in `index.js`.
- [ ] No try/catch or callsite patch; fix is at the root cause function.
- [ ] Verify: `npm test -- --testPathPattern=hook.test.js --silent` → all tests pass.

### Task 3: Quality Gate

**Objective:** Full test suite green, no lint/type issues.

**Files:**

- No production files expected; update plan progress and status.

**Key Decisions / Notes:**

- Project is vanilla JS with Jest only — no TypeScript or linter configured, so the gate is the full Jest suite.

**Definition of Done:**

- [ ] Full suite is green.
- [ ] No SPEC-DEBUG markers in the diff.
- [ ] Plan status updated to COMPLETE.
- [ ] Verify: `npm test -- --silent`
