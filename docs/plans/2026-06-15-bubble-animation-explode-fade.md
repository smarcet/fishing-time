# Bubble Animation Explode/Fade Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** When bubbles reach the water surface (y ≤ 300) they play a ring-explosion animation — 3 expanding arc rings that spread outward and fade over 30 frames — instead of instantly disappearing.

## Approach

**Chosen:** Add `startDying()` to `Bubble` in `src/Bubble.js`; Game triggers it instead of `markDead()`.
**Why:** Self-contained in one class — bubble owns its death animation. Avoids adding animation state to `Game`. Uses canvas `arc`/`stroke` — no new sprite assets. Image is moved to a constructor param (matches Fish pattern) to make the class testable under Jest.

## Autonomous Decisions

- **Ring style:** 3 concentric rings, staggered start (0 / 0.15 / 0.30 of total duration). Each ring starts at the bubble's natural radius and expands to 3× radius while fading from full opacity to 0.
- **Ring color:** `rgba(150, 200, 255, 1)` (light blue-white — water ripple) with decreasing `lineWidth` (4 → 0px) as it expands.
- **Duration:** 30 frames (`BUBBLE_DIE_DURATION = 30`) ≈ 0.5 s at 60 fps.
- **Questions skipped:** animation style was confirmed by user (ring explode).

## Context for Implementer

Bubbles are currently browser-only (no `module.exports`). Their image is fetched via `document.getElementById('bubble')` in the constructor, which fails under Jest's node environment. This plan refactors the constructor to accept `image` as a parameter (same pattern as `Fish`) and adds `module.exports = { Bubble }` so the class can be unit-tested. `Game.js` must then pass `document.getElementById('bubble')` when spawning bubbles. The dying-animation lifecycle is:

1. `Game.update()` detects `b.getPosition().getY() <= 300` → calls `b.startDying()` (idempotent).
2. Bubble's `update()` stops Y movement, increments `_dieFrame`. At frame 30 → `markDead()`.
3. Bubble's `draw()` skips the sprite and instead draws 3 expanding arc rings.
4. Dead bubbles are already filtered out by `Game.update()`'s `this._bubbles.filter(b => b.isLive())` at the top of each frame.

## Runtime Environment

- **Start:** `yarn dev` → `python3 -m http.server 8081`
- **URL:** `http://localhost:8081/main.html`
- **Test:** `npm test`

## Goal Verification

### Truths

1. Bubbles never vanish instantly — every bubble at y ≤ 300 plays the ring animation before `isLive()` returns `false`.
2. The ring animation runs for exactly `BUBBLE_DIE_DURATION` frames (30), then the bubble removes itself from the game.

## E2E Test Scenarios

### TS-001: Bubble Ring Explosion at Water Surface

**Priority:** High
**Preconditions:** `yarn dev` running; browser opened at `http://localhost:8081/main.html`
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load `http://localhost:8081/main.html` | Game canvas renders; bubbles visible rising from bottom |
| 2 | Wait 15–20 seconds | Bubbles rise to the water surface region (y ~300) |
| 3 | Observe bubbles reaching the surface | Each bubble spawns 3 expanding arc rings that spread outward and fade over ~0.5 s; the original bubble sprite disappears immediately when the rings begin |
| 4 | Let all bubbles die | A new batch of 15 bubbles spawns; ring effect repeats |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | High     | PASS   | 0            | Ring explosion visible at water surface; multiple staggered rings expanding and fading confirmed in browser at 26s after page load |

## Progress Tracking

- [x] Task 1: Barrel + constructor refactor + failing tests (RED)
- [x] Task 2: Implement ring-explosion animation in Bubble.js (GREEN)
- [x] Task 3: Wire up startDying() in Game.js
- [x] Task 4: Quality gate

## Implementation Tasks

### Task 1: Barrel + constructor refactor + failing tests (RED)

**Objective:** Make `Bubble` importable under Jest by adding `module.exports`, moving the image dependency to a constructor parameter, adding `BUBBLE_DIE_DURATION` to constants, and registering `Bubble` in the index.js barrel. Then write a failing test for the not-yet-implemented `startDying()` method to establish the RED baseline.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/Bubble.js`
- Modify: `index.js`
- Create: `__tests__/bubble.test.js`

**Key Decisions / Notes:**

- `src/constants.js`: add `const BUBBLE_DIE_DURATION = 30;` and include it in the `module.exports` object.
- `src/Bubble.js`: change constructor signature from `(game, ctx, size, position)` to `(game, ctx, size, position, image)`. Remove `document.getElementById('bubble')` from the constructor; use the `image` param instead. Add `module.exports = { Bubble }` at the bottom (same guard pattern as other src files).
- `index.js`: add `const { Bubble } = require('./src/Bubble'); global.Bubble = Bubble;` and add `Bubble` to the `module.exports` line.
- `__tests__/bubble.test.js`: import `{ Bubble, Size, Point }` from `../index.js`. In `makeBubble()` helper, pass a `{}` mock for the image param. Write tests for `startDying()` and `_dieFrame` behavior. These **must FAIL** at this point because `startDying()` does not exist yet.

**Definition of Done:**

- [ ] `npm test -- --testPathPattern=bubble` runs (may pass or fail on test logic; barrel must be importable without errors)
- [ ] Tests for `startDying()` FAIL with "bubble.startDying is not a function" or similar
- [ ] Verify: `npm test -- --testPathPattern=bubble`

---

### Task 2: Implement ring-explosion animation in Bubble.js (GREEN)

**Objective:** Add `startDying()`, dying `update()` logic, and dying `draw()` (3 expanding arc rings) to `Bubble`. All Task 1 tests must pass after this task. The sprite disappears immediately when dying; only rings are drawn.

**Files:**

- Modify: `src/Bubble.js`

**Key Decisions / Notes:**

- Add to constructor: `this._dying = false; this._dieFrame = 0;`
- `startDying()`: if `this._dying` return early (idempotent); else `this._dying = true; this._dieFrame = 0;`
- `update()`: if `this._dying`, increment `this._dieFrame`, call `markDead()` if `>= BUBBLE_DIE_DURATION`, then `return` (skip Y movement). Otherwise proceed with existing Y movement.
- Add `if (!this._image) return;` before the non-dying `drawImage` call — defensive guard against `drawImage(null, ...)` DOMException. The dying rings branch does not use `this._image`, so the guard only covers the sprite-draw path.
- `draw()` while dying: skip sprite; draw 3 arc rings with loop `for (let i = 0; i < 3; i++)`. Each ring uses:
  - `delay = i * 0.15` (stagger — ring 0 starts at frame 0, ring 1 at 15%, ring 2 at 30%)
  - `progress = this._dieFrame / BUBBLE_DIE_DURATION` (0 → 1)
  - `t = Math.max(0, progress - delay)` — local time for this ring
  - `if (t <= 0) continue`
  - `radius = (this._size.getWidth() / 2) * (1 + t * 2)` — starts at bubble radius, expands to 3×
  - `alpha = Math.max(0, 1 - t / (1 - delay))` — fades from 1 → 0
  - `lineWidth = Math.max(0.5, 4 * (1 - t))`
  - `ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(150,200,255,1)'; ctx.lineWidth = lineWidth; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.stroke(); ctx.restore()`
  - `cx = this._position.getX() + this._size.getWidth() / 2`
  - `cy = this._position.getY() + this._size.getHeight() / 2`

**Definition of Done:**

- [ ] `bubble._dying` starts `false`; `startDying()` sets it to `true`
- [ ] Calling `startDying()` twice leaves `_dieFrame` unchanged (still 0) and `_dying` still `true` (idempotent)
- [ ] After `BUBBLE_DIE_DURATION` calls to `update()` post-`startDying()`, `bubble.isLive()` is `false`
- [ ] Bubble's Y position does NOT change after `startDying()` is called
- [ ] Verify: `npm test -- --testPathPattern=bubble`

---

### Task 3: Wire up startDying() in Game.js

**Objective:** Update `Game.js` so that (a) the Bubble constructor receives the image element, and (b) `startDying()` is called at the surface threshold instead of `markDead()`.

**Files:**

- Modify: `src/Game.js`

**Key Decisions / Notes:**

- In the bubble spawning loop (~line 84), change `new Bubble(this, this._ctx, new Size(h, h), new Point(x, this._size.getHeight()))` to `new Bubble(this, this._ctx, new Size(h, h), new Point(x, this._size.getHeight()), document.getElementById('bubble'))`. `main.html:42` already has `<img src="images/bubble.svg" id="bubble"/>` — the element exists.
- In the bubble update loop (~line 99), replace `b.markDead()` with `b.startDying()`. `startDying()` is idempotent so no guard is needed.
- Remove the `console.log('marking dead bubble')` debug line that's currently next to the `markDead()` call.
- Ordering note: `b.update()` runs before the surface check in the `forEach` loop (Game.js:95-101), so `startDying()` fires after the bubble has already moved 0.5px past y=300 on the triggering frame. Ring animation centers on that post-move position. This is imperceptible but implementers should not expect rings centered exactly at y=300.
- Dead-bubble re-entry note: bubbles that call `markDead()` inside `update()` (at `_dieFrame >= 30`) remain in the `forEach` iteration on their final frame. The surface check still fires (`y <= 300` stays true while dying). `startDying()` is safe because `_dying=true` triggers the early return. Do NOT change the guard to `if (!this.isLive()) return` — that would break the draw path for valid dying bubbles.

**Definition of Done:**

- [ ] Game spawns bubbles with the image passed as a parameter
- [ ] Bubbles no longer vanish instantly — ring explosion visible in browser at the water surface
- [ ] No console.log debug noise on bubble death
- [ ] Verify: `npm test` (full suite green); then open `http://localhost:8081/main.html` and observe ring explosions

---

### Task 4: Quality gate

**Objective:** Full test suite green; no type or lint errors; game runs correctly with ring animation.

**Files:**

- No production files expected — update plan progress and status only.

**Key Decisions / Notes:**

- Record baseline test count before Task 1 starts (`npm test`). After Task 2, confirm total = baseline + new bubble tests. Do not hard-code a count.
- No TypeScript or lint step for this vanilla JS project.

**Definition of Done:**

- [ ] `npm test` passes with 0 failures
- [ ] TS-001 E2E scenario confirmed in browser (bubbles explode with rings at surface, new batch respawns)
- [ ] Verify: `npm test`
