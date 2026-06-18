# ADR-0031: Hooked Fish Struggle Animation

**Date:** 2026-06-18
**Status:** Accepted
**Author:** smarcet@gmail.com

---

## Context

When a catchable fish is hooked and hanging from the line, it was rendered completely static. The fish had a species-specific capture pose (defined in ADR-0029 via `captureRotation`, `captureOffsetX`, `captureOffsetY`) but showed no signs of being alive. This felt flat — a living creature should visually resist capture.

The goal was to add a subtle, data-driven visual struggle: a sinusoidal rotation oscillation plus a small horizontal shake, scaling in intensity with how close the fish is to escaping.

---

## Decision

### What we decided

Add a per-species struggle animation to `EnemyWithAnimation.drawCaptured()` driven by three new fields in `FISH_DEFINITIONS` (catchable fish only — trash items carry none):

| Field | Type | Purpose |
|-------|------|---------|
| `struggleSpeed` | number | Angular frequency of oscillation (rad/tick) |
| `struggleRotationAmplitude` | number | Peak rotation delta (degrees) |
| `struggleOffsetAmplitude` | number | Peak horizontal shake (px) |

Whether a hooked entity struggles is derived from the class hierarchy — `getFightSpec() !== null` — rather than a per-species `struggleEnabled` flag. `CatchableFish.getFightSpec()` returns `{strength, escapeRate}`; `InertObject.getFightSpec()` returns `null`. The flag was redundant and has been removed.

The animation formula:
```js
const dangerScale = 1 + escapeDanger * STRUGGLE_DANGER_FACTOR;
const speedScale  = 1 + escapeDanger * STRUGGLE_DANGER_SPEED_FACTOR;
const sRot  = Math.sin(t * struggleSpeed * speedScale) * struggleRotationAmplitude * dangerScale;
const sOffX = Math.sin(t * struggleSpeed * 0.7 * speedScale) * struggleOffsetAmplitude * dangerScale;
```

- `t` = `this._captureTick` (already incremented every frame via `updateCaptured()`)
- `escapeDanger` = 0..1, already computed in `drawCaptured()` for the glow pulse system
- `STRUGGLE_DANGER_FACTOR = 2.0`: at max danger the amplitude triples (was 1.0 — doubled — but user feedback indicated the visual change wasn't noticeable enough)
- `STRUGGLE_DANGER_SPEED_FACTOR = 2.0`: at max danger the oscillation frequency triples, making frantic near-escape visually obvious
- The 0.7 frequency factor de-correlates the rotation and horizontal waves so they don't move in lockstep

The guard `this._hook.isHooked()` (checks `this._status === HOOK_STATUS_HOOKED`) ensures the animation only fires while the hook is in the HOOKED state — NOT during `HOOK_STATUS_CAPTURE_LAUNCH`.

---

## Analysis: What Was Considered

### Option A (chosen): Rendering transform in `drawCaptured()`

Add the oscillation deltas (`sRot`, `sOffX`) to the `ctx.translate` and `ctx.rotate` calls inside `drawCaptured()`. The fish's logical position (`_position`) never moves — only the canvas transform for that one draw call is modified.

**Pros:**
- Zero risk of interfering with the gameplay escape/resistance mechanic (`_escapeProgress`, `HOOK_STRUGGLE_*`)
- `drawCaptured()` is the single rendering path for ALL hooked entities — adding the animation here guarantees every species gets it automatically once it extends `CatchableFish`
- Perfectly isolated from `_drawCaptureLaunch` in `Hook.js`, which draws the fly-to-boat arc using raw `_captureRotation` — the launch arc is always smooth
- Aligns with the existing ADR-0029 pattern: presentation data (rotation, offset) lives in `FISH_DEFINITIONS`, consumed by the rendering path

**Cons:**
- Animation lives in the rendering layer, not the simulation layer — purists might argue game state should drive rendering, not the other way around. However, the struggle is purely cosmetic: it adds no information that gameplay can't already infer from `_escapeProgress`.

### Option B (rejected): Positional update in `Enemy.update()` / `updateCaptured()`

Store a `_struggleOffset` on the entity and update it each tick in `updateCaptured()`. The rendering path would read `_struggleOffset` and apply it.

**Rejected because:**
- `_position` and related fields feed back into collision and hook-line geometry. Modifying them for a visual effect invites subtle interaction bugs (e.g., hook endpoint drifting if position is used in endpoint calculation).
- Requires an additional field per entity that is never used outside the rendering read, adding state with no simulation value.
- Does not compose cleanly with the capture-launch phase where the hook sets velocity, not position.

### Option C (rejected): Per-species subclass override of `drawCaptured()`

Let each species override `drawCaptured()` to apply its own animation.

**Rejected because:**
- ADR-0027 explicitly established that per-species behavior belongs in `FISH_DEFINITIONS`, not in per-species code. Seventeen overrides would be seventeen maintenance points.
- The animation formula is identical across species — only the tunables differ.

---

## Tradeoffs

| Concern | Decision |
|---------|----------|
| Gameplay interference | None: purely visual transform, `_position` unchanged |
| CAPTURE_LAUNCH isolation | Guarded by `isHooked()` — returns false during LAUNCH state |
| Trash items | `getFightSpec() === null` guard — class hierarchy, not a per-species flag |
| Amplitude at capture moment | `Math.sin(0) = 0`: no jump when the fish is first hooked |
| Difficulty tuning | All four fields are in `FISH_DEFINITIONS` — one-line change per species |
| Mobile scaling | Animation uses `_captureTick` and `_captureRotation` which are profile-agnostic; struggle amplitude is in degrees/px, not sprite-scale-relative, so it auto-scales with the canvas transform applied upstream |

---

## Danger-Scaling Rationale

Two orthogonal scaling axes were chosen to make the near-escape state unmistakable:

| Constant | Value | Effect at max danger |
|----------|-------|----------------------|
| `STRUGGLE_DANGER_FACTOR` | 2.0 | Amplitude triples (`dangerScale = 3`) |
| `STRUGGLE_DANGER_SPEED_FACTOR` | 2.0 | Frequency triples (`speedScale = 3`) |

Initial value of `STRUGGLE_DANGER_FACTOR` was 1.0 (amplitude doubled). User feedback indicated the visual change wasn't noticeable during play, so both constants were raised to 2.0 and frequency scaling was added. Mirrors the glow pulse pattern (`CAPTURE_PULSE_DANGER_FACTOR = 3` triples pulse speed), keeping danger feedback consistent across all visual channels.

All three rationales still apply:
1. `escapeDanger` is already computed in `drawCaptured()` for the glow system — zero extra computation.
2. Visual feedback matches the gameplay signal: a fish about to escape is visually frantic.
3. Both factors are single tunable constants — independently adjustable without touching per-species data.

---

## Guard Design: Two-Level Check

The struggle guard combines a **state check** and a **type check**:

```js
const struggleActive = this._hook && this._hook.isHooked() && this instanceof CatchableFish;
```

**`isHooked()` vs `isCatchableFishHooked()` (state gate):** `isCatchableFishHooked()` (Hook.js line 409) tests `this._catch instanceof CatchableFish` — during `HOOK_STATUS_CAPTURE_LAUNCH` the `_catch` reference may still point to a `CatchableFish`, so this method returns `true` even while the fish is flying to the boat. `isHooked()` (Hook.js line 405) tests the actual state machine (`this._status === HOOK_STATUS_HOOKED`). Using `isCatchableFishHooked()` for the state gate would have caused the struggle animation to fire during the launch arc.

**`instanceof CatchableFish` (type gate):** Replaces the retired `struggleEnabled` boolean flag. `CatchableFish` and `InertObject` are already distinct branches of the class hierarchy — a separate per-entry flag was redundant state. This check is performed inside `drawCaptured()` which is defined on `EnemyWithAnimation`, a base class shared by both branches; `this instanceof CatchableFish` is the canonical way to distinguish them at that level. This change removed `struggleEnabled` from all 17 `FISH_DEFINITIONS` entries and its propagation in `EnemyFactory`. An earlier iteration used `getFightSpec() !== null` (duck-typing) before the refactor settled on the direct class check.

---

## Files Changed

| File | Change |
|------|--------|
| `src/constants.js` | Added `STRUGGLE_DANGER_FACTOR` (2.0) and `STRUGGLE_DANGER_SPEED_FACTOR` (2.0); added 3 struggle fields to 11 catchable-fish `FISH_DEFINITIONS` entries (no fields on 6 trash entries); exported both constants |
| `src/EnemyFactory.js` | Propagated 3 struggle fields (speed, rotAmp, offAmp) in constructor forEach and `createEnemy()` — no `struggleEnabled` |
| `src/EnemyWithAnimation.js` | Added struggle oscillation with `dangerScale`+`speedScale`; guard uses `instanceof CatchableFish` instead of `_struggleEnabled` flag |
| `__tests__/enemy-with-animation.test.js` | New: 3 tests — struggle-active (CatchableFish), InertObject no-struggle, non-HOOKED guard |
| `__tests__/enemy-factory.test.js` | Added: 1 test verifying struggle fields propagated for ClownFish |
| `__tests__/catchablefish.test.js` | Added `isHooked: () => false` to hook stub (new guard now calls `isHooked()` on all CatchableFish instances) |
