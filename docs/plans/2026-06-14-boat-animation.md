# Boat Animation Fix Plan

Created: 2026-06-14
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** The fisherman's boat animation looks unrealistic: (1) the boat faces right even when moving left; (2) the boat sits rigidly on the water while everything else (Trash, Octopus) bobs; (3) when a fish is caught and reeled in, the fisherman shows no reaction.
**Trigger:** Always visible during play.
**Root Causes:**
- `index.js:639` — `Player.draw()` has no horizontal flip for `MOVING_L` state.
- `index.js:571` — `Player` constructor sets no `_bobPhase`/`_bobOffset`/`_angle`; `update()` never computes sinusoidal bob; `draw()` reads `_position` directly instead of the bob-aware `getPosition()`.
- `index.js:580-581` — `Player` loads only `boat_idle` and `boat_cast`; the available `__fisherman_in_boat_catch_fish.png` sprite is never loaded; `draw()` has no REEL state to play it.

## Investigation

**Left flip:** `Player.draw()` at `index.js:639` calls `drawImage` directly with no `ctx.save/translate/scale(-1,1)/restore` wrapper for `MOVING_L`. The Fish class (`index.js:~430`) and Octopus class (`index.js:376`) both demonstrate the correct pattern: `flipX = direction === 1 ? -1 : 1` followed by `save/translate/scale/drawImage(-w/2,-h/2,...)/restore`.

**Water bob:** The constants `ANIM_BOB_AMPLITUDE = 12`, `ANIM_BOB_SPEED = 0.08`, and `ANIM_MAX_TILT_ANGLE = 0.1745` at `index.js:8-10` were clearly intended for the boat too — they are used by Trash (`index.js:268-280`) and Octopus (`index.js:336-348`) with identical bob+tilt logic (`_bobPhase += speed; _bobOffset = amplitude * sin(phase); _angle = maxAngle * cos(phase)`). Both classes also override `getPosition()` to return `new Point(x, y + _bobOffset)` so the hook pivot automatically follows the bob. Player has none of this. The Hook's `_pivot()` method reads `this._player.getPosition()` at `index.js:~470`, so overriding `Player.getPosition()` will make the fishing rod tip bob with the boat for free.

**Catch animation:** `images/items/` already has `__fisherman_in_boat_idle.png` (1619×1578, 4×5 = 20 frames) and `__fisherman_in_boat_cast.png` (1619×947, 4×3 = 12 frames), both resized from originals at `~/.../character/spritesheets/`. The original `__fisherman_in_boat_catch_fish.png` is 4268×5824 (4×7 = 28 frames). Scaling to the game's width (1619px, same factor ~0.379) yields 1619×2209 with 315.6px-tall rows = exactly 7 rows × 4 cols. The Hook's `hadCatch()` (`index.js:556`) returns `true` while the hook is in CATCH state. Player must check this and override its state to 'REEL', playing `_catchAnimation` cycling through cols 0–3 and rows 0–6 (28 frames, loops).

**Magic number cleanup:** `this.STAGGERFRAME = 5` at `index.js:585` is an instance property holding what should be a module-level constant (all other animation timing is a `const` at the top of the file).

**Working examples:**
- Trash.draw() + update() → bob + tilt pattern to replicate
- Fish.draw() → save/translate/scale(-1,1)/drawImage(-w/2,-h/2)/restore → flip pattern to replicate

## Behavior Contract

**Given:** A Player boat on the canvas, water-surface objects (Trash, Octopus) already bob.
**When:** (1) `_state = 'MOVING_L'` and `draw()` is called; (2) Player.update() runs each tick; (3) Hook enters CATCH state.

**Currently (bug):**
1. Moving left plays the idle sprite facing right (no flip).
2. The boat Y is always `-30`; no sinusoidal offset; no tilt — it looks glued to the surface.
3. When a fish is caught and Hook enters CATCH, Player continues showing idle or cast frames with no reaction.

**Expected (fix):**
1. When `_state === 'MOVING_L'`, the sprite is mirrored horizontally (fisherman faces left).
2. Every tick, `_bobOffset = ANIM_BOB_AMPLITUDE * sin(_bobPhase)` and `_angle = ANIM_MAX_TILT_ANGLE * cos(_bobPhase)` are computed; `getPosition()` returns `y + _bobOffset`; draw applies `rotate(_angle)`.
3. When `hook.hadCatch()` is true, Player overrides state to 'REEL' and plays `__fisherman_in_boat_catch_fish.png` cycling 28 frames; when hook returns to IDLE the player returns to IDLE/MOVING.

**Anti-regression:**
- Cast animation still plays correctly when Space is held and hook is not in CATCH.
- Fish / Octopus / Trash behavior unchanged (no changes outside Player).
- All existing tests pass: `npm test` (octopus × 10, trash × 13, hook × 16, fish × 12).

## Fix Approach

**Chosen:** Extend Player with bob + flip + catch animation, following the Trash/Octopus/Fish patterns.

**Why:** The codebase already has the exact patterns needed (bob in Trash/Octopus, flip in Fish). Reusing them keeps the Player consistent and makes the fix structurally identical to proven working code.

**Files to modify:** `index.js`, `main.html`
**New files:** `images/items/__fisherman_in_boat_catch_fish.png` (resized from downloads)

**Strategy:**
1. Add 3 module-level constants (stagger renamed, catch grid size):
   ```js
   const PLAYER_ANIM_STAGGER      = 5;   // ticks per sprite frame (boat)
   const PLAYER_CATCH_MAX_FRAME_X = 3;   // 0-indexed: 4 columns in catch sprite
   const PLAYER_CATCH_MAX_FRAME_Y = 6;   // 0-indexed: 7 rows in catch sprite (28 frames)
   ```
2. **Player constructor:** add bob fields (`_bobPhase`, `_bobOffset`, `_angle`), `_catchAnimation` image ref, `_catchFrameX/Y`; replace `this.STAGGERFRAME = 5` → `PLAYER_ANIM_STAGGER`.
3. **Player.getPosition():** override to return `new Point(x, y + _bobOffset)` (Trash pattern).
4. **Player.update():** add bob phase advance (`_bobPhase += ANIM_BOB_SPEED`, etc.); add REEL state override (`if (this._hook.hadCatch()) this._state = 'REEL';`); reset catch frames on REEL entry.
5. **Player.draw():** wrap idle/moving branch with `save/translate/rotate(_angle)/scale(flipX,1)/drawImage(-w/2,-h/2)/restore` where `flipX = this._state === 'MOVING_L' ? -1 : 1`; add REEL branch that plays `_catchAnimation` with same save/rotate/restore pattern.
6. **main.html:** add `<img src="images/items/__fisherman_in_boat_catch_fish.png" id="boat_catch"/>`.
7. **Guard getElementById:** wrap all `document.getElementById` calls in Player constructor with `typeof document !== 'undefined' ? … : null` (same pattern as Hook, enables Jest testing).
8. **Export Player:** add `Player` to `module.exports` (additive, non-breaking).

**Tests:** new `__tests__/player.test.js` — one unit test class (mirrors `__tests__/hook.test.js` mock style). mockGame returns a mock Hook with controllable `hadCatch()`.

**Defense-in-depth:** none needed — all changes are contained in the Player class and the main.html `<img>` declaration.

## Verification Scenario

### TS-001: Left flip, water bob, and catch animation

**Preconditions:** Game served at `http://localhost:8000/main.html`.

| Step | Action | Expected Result (after fix) |
|------|--------|-----------------------------|
| 1 | Load the game | Boat is visible at the top. It visibly bobs up and down with a slight tilt — never perfectly flat. |
| 2 | Press and hold Left arrow | Fisherman sprite mirrors to face left; boat moves left. |
| 3 | Release Left, press Right | Fisherman faces right again; boat moves right. |
| 4 | Hold Space to cast, wait for hook to descend and catch a fish | As soon as hook catches a fish, the boat animation switches to the catch/fight sprite (fisherman pulling back the rod). |
| 5 | Release Space or wait for reel-in to complete | Boat returns to idle sprite, bob continues. No regression in cast or octopus/trash behavior. |

## Tasks

- [x] Task 1: Write Reproducing Test (RED)
- [x] Task 2: Implement Fix at Root Cause
- [x] Task 3: Quality Gate

### Task 1: Write Reproducing Test (RED)

**Objective:** Encode the Behavior Contract as failing tests before any fix code.

**Files:**

- Test: `__tests__/player.test.js` (new)
- Modify: `index.js` — guard `document.getElementById` in Player constructor + export `Player`

**Key Decisions / Notes:**

- Entry point: `Player.draw()` and `Player.update()` via `Player` constructor (same approach as `hook.test.js`).
- Need to guard all three `document.getElementById` calls in Player constructor (boat_idle, boat_cast) plus the new boat_catch. Same pattern used in Hook.
- Mock hook: `{ hadCatch: () => false, hadCatch_true: () => true, update: () => {}, draw: () => {}, getPosition: () => new Point(0,0) }` — player test controls `hadCatch()` return.
- Three RED tests:
  1. **Flip:** `ctx.scale` is called with `(-1, 1)` when `_state = 'MOVING_L'` and `draw()` runs.
  2. **Bob:** After 10 calls to `update()`, `player._bobOffset` equals `ANIM_BOB_AMPLITUDE * Math.sin(10 * ANIM_BOB_SPEED)` (not 0).
  3. **REEL state:** When mockHook returns `hadCatch() = true`, `update()` sets `player._state` to `'REEL'`.

**Definition of Done:**

- [ ] `__tests__/player.test.js` exists with 3 tests, each named `test_player_<bug>_<expected>`.
- [ ] Tests fail because `Player` is not exported / guard not applied / fields don't exist.
- [ ] No existing test broken by the `document.getElementById` guard and `module.exports` addition.
- [ ] Verify: `npm test -- __tests__/player.test.js` — must FAIL with expected errors.

### Task 2: Implement Fix at Root Cause

**Objective:** Add flip, bob, catch animation, and REEL state to Player so all 3 RED tests pass.

**Files:**

- Modify: `index.js` (Player class + constants block + module.exports)
- Modify: `main.html` (add boat_catch img tag)
- New: `images/items/__fisherman_in_boat_catch_fish.png` (resize from downloads)

**Key Decisions / Notes:**

- Resize command (Python PIL): `from PIL import Image; img = Image.open('...downloads.../character/spritesheets/__fisherman_in_boat_catch_fish.png'); img.resize((1619, int(img.height * 1619 / img.width)), Image.LANCZOS).save('images/items/__fisherman_in_boat_catch_fish.png')`
- The combined draw (flip + tilt) uses ONE save/restore block: `save → translate(cx, cy) → rotate(angle) → scale(flipX, 1) → drawImage(-w/2, -h/2) → restore`.
- REEL state entry: detect transition by checking `this._state !== 'REEL'` before the override, reset `_catchFrameX = _catchFrameY = 0` on entry.
- Catch frame advance: same stagger pattern (`_gameFrame % PLAYER_ANIM_STAGGER === 0`), iterates col 0→PLAYER_CATCH_MAX_FRAME_X then row, loops at row PLAYER_CATCH_MAX_FRAME_Y.
- `getPosition()` override: `return new Point(super.getPosition().getX(), super.getPosition().getY() + this._bobOffset);` — matches Trash pattern.

**Definition of Done:**

- [ ] All 3 player RED tests pass.
- [ ] Diff touches `index.js` (Player class, constants, module.exports) and `main.html`.
- [ ] Verify: `npm test -- __tests__/player.test.js` — must PASS.

### Task 3: Quality Gate

**Objective:** Full suite green; browser E2E from Verification Scenario.

**Files:**

- No production files expected; plan status updated.

**Key Decisions / Notes:**

- Suite: `npm test` (octopus × 10, trash × 13, hook × 16, fish × 12, player × 3+ = all green).
- E2E uses Chrome DevTools MCP: serve `python3 -m http.server 8000`, navigate to `http://localhost:8000/main.html`, walk TS-001.

**Definition of Done:**

- [ ] `npm test` — all suites green, 0 failures.
- [ ] Browser: boat bobs, left-flip works, catch animation plays on reel-in.
- [ ] Verify: `npm test && python3 -m http.server 8000 &`
