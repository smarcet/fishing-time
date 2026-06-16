# Capture Glow Effect Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the on/off blink (alpha toggling 1.0 ↔ 0.2) during the captured-entity reel-in animation with a smooth pulsing golden glow using `ctx.shadowBlur`, making hooked entities shimmer rather than strobe. The escape-approaching flicker in `Hook.js` is left unchanged.

## Approach

**Chosen:** Replace `blinkAlpha` in `EnemyWithAnimation.drawCaptured()` with `ctx.shadowColor` + `ctx.shadowBlur` pulsed via `Math.sin(captureTick * CAPTURE_GLOW_SPEED)`.
**Why:** All entity types (ButterflyFish, Crab, Octopus, DiscardedBottle) delegate to the base-class `drawCaptured()` — one method change covers the whole game. `ctx.save()`/`ctx.restore()` already wraps the draw call, so the shadow state is automatically cleaned up without bleeding onto other canvas elements. Performance impact is negligible (at most 1 captured entity at a time).

## Context for Implementer

`ctx.shadowBlur` requires `ctx.shadowColor` to be set first — setting blur alone has no visible effect. Both must be set inside the existing `ctx.save()` block so they're cleaned up by `ctx.restore()`. `shadowBlur` is expensive in some browsers when applied to many elements simultaneously, but with a single captured entity this is not a concern.

## Implementation Tasks

### Task 1: Replace blink with golden glow in `EnemyWithAnimation.drawCaptured()`

**Objective:** Remove the `blinkOn`/`blinkAlpha` toggle from `drawCaptured()` and replace it with a sin-driven `ctx.shadowBlur` pulse in gold. Entity is always fully opaque during the RISING phase; existing alpha fade during the THROWING phase is preserved. Remove `CAPTURE_BLINK_INTERVAL` from `constants.js` and `_blinkInterval` from the constructor; add `CAPTURE_GLOW_SPEED`.

**Files:**

- Modify: `src/EnemyWithAnimation.js`
- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Glow color: `rgba(255, 215, 0, 0.85)` — CSS gold, high visibility on the dark ocean background.
- Pulse formula: `const glowSize = 10 + 10 * Math.sin(this._captureTick * CAPTURE_GLOW_SPEED)` → range 0..20 px blur.
- `CAPTURE_GLOW_SPEED = 0.12` rad/tick → period ≈ 52 ticks ≈ 0.87 s at 60 fps (pleasant arcade pace).
- During THROWING phase: `this._ctx.shadowBlur = glowSize * (1.0 - t)` so the glow fades with the entity as it arcs into the boat.
- `_blinkInterval` removed from constructor; `CAPTURE_BLINK_INTERVAL` removed from constants.
- RISING phase: `alpha = 1.0` (no more 0.2 dip). THROWING phase: `alpha = 1.0 - t` (existing fade logic kept).
- `ctx.shadowColor` and `ctx.shadowBlur` must be set INSIDE the existing `ctx.save()` block (lines 82–87 of EnemyWithAnimation.js) so `ctx.restore()` cleans them up automatically.

**Definition of Done:**

- [ ] Catching any entity (fish, bottle, crab, octopus) shows a pulsing gold glow shimmer while reeling, with no on/off blink.
- [ ] The glow fades smoothly as the entity arcs into the boat during the THROWING phase.
- [ ] No gold shadow bleeds onto the background, player, or other entities (verified by visual inspection).
- [ ] `CAPTURE_BLINK_INTERVAL` is removed from `src/constants.js` exports and `_blinkInterval` is removed from `EnemyWithAnimation` constructor.
- [ ] Verify: `npm test -- --silent` — 108 tests pass (no behavioral change, suite stays green).

## Progress Tracking

- [x] Task 1: Replace blink with golden glow

## E2E Test Scenarios

### TS-001: Golden glow visible on captured fish
**Priority:** Critical
**Preconditions:** Game running at `http://localhost:8000/main.html`
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Ocean scene loads, fish swimming |
| 2 | Press Space to cast the hook | Hook descends |
| 3 | Wait for hook to collide with a fish | Hook attaches; fish enters captured state |
| 4 | Observe fish during reel-up | Fish has a pulsing gold shimmer/glow, no on/off blink |
| 5 | Let fish arc into boat (THROWING phase) | Gold glow fades as fish shrinks toward boat |
