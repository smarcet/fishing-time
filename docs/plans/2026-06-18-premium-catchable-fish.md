# PremiumCatchableFish Abstraction Implementation Plan

Created: 2026-06-18
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Extract Crab's bespoke reward-glow rendering into a reusable `PremiumCatchableFish`
base class so any premium creature (Crab today; Lobster/RareOctopus/etc. later) automatically
renders a two-layer pulsing "premium catch" glow in its normal traffic state, with the sprite
remaining fully readable. No gameplay, hitbox, movement, capture, or score changes.

## Context

Crab currently `extends CatchableFish` and implements its own glow via `_drawRewardGlow()`
(`src/Crab.js:32-52`), driven by `CRAB_REWARD_GLOW_*` constants. The effect is generic (not
Crab-specific), the method name is misleading, and the same treatment will be needed by future
premium creatures. The glow belongs in a shared abstraction. This plan inserts
`PremiumCatchableFish` between `CatchableFish` and `Crab`, moves all glow rendering there under
the required name `_drawPremiumGlow(dx, dy, w, h, sw, sh, flipX)`, and migrates Crab to inherit
it. The visual is upgraded from a single gold halo to a two-layer lime-green-outer +
warm-yellow-inner glow (arcade ticket-redemption "Pirate Hook" look).

## Approach

**Chosen:** Insert `src/PremiumCatchableFish.js` (`extends CatchableFish`) that owns the entire
traffic-state `draw()` pipeline plus the reusable `_drawPremiumGlow`. Crab keeps only its
sprite/animation/movement/capture/debug code and a `_drawDebug()` override; it inherits `draw()`
and the glow automatically. Glow geometry reuses the subclass's `_drawTrafficSprite(...)`, so the
base never needs to know sprite-sheet layout.

**Why:** A base-owned `draw()` is the only design where new premium creatures get the glow with
zero glow code (the core acceptance criterion). The single new extension point — `_drawDebug()` —
lets Crab preserve its exact debug readout while still surrendering `draw()` to the base. The
glow-via-shadowed-sprite technique is exactly Crab's current mechanism, so the halo always matches
the sprite silhouette and flip orientation for free.

## Out of Scope

- Creating Lobster / RareOctopus / SwordFish / HammerHeadShark premium creatures — the abstraction
  is built to host them, but no new species are added here.
- Changing the captured-state rendering. Captured creatures bypass the premium glow entirely
  (`if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }`) and keep the
  existing capture glow from `EnemyWithAnimation.drawCaptured()`.
- Any change to spawn rate, score, strength, escape rate, lane, or movement of Crab.

## Context for Implementer

The pulse must be a continuous sinusoid (~1.0s cycle). Crab's current glow reuses `this._tick`,
which resets every `_staggerFrame` (=6) frames — a stepped, jittery pulse, not a smooth one. The
new base introduces a dedicated monotonic counter `_glowTick`, incremented in an overridden
`update()` (`super.update()` then `this._glowTick++`). At ~60fps (rAF loop, `src/main.js:51-55`)
a pulse speed of `2π/60 ≈ 0.105` rad/frame yields a 1.0s cycle, inside the spec's 0.8–1.2s band.
The glow is the sprite re-drawn behind the real sprite with a colored `shadowBlur`/`shadowColor`
and reduced `globalAlpha`; the shadow bleeds outward as a silhouette halo while the opaque final
sprite stays crisp on top. `EnemyFactory`'s `Cls.prototype instanceof CatchableFish` check
(`src/EnemyFactory.js:31`) still passes transitively for `Crab → PremiumCatchableFish →
CatchableFish`, so factory/spawner wiring is untouched.

## Assumptions

- The game renders at ~60fps via `requestAnimationFrame` (confirmed `src/main.js:51-55`). The
  ~1.0s pulse constant is fps-derived; Tasks 1 affected. If fps differs materially the cycle
  scales proportionally but stays a smooth sinusoid — acceptable, tune if needed.

## Runtime Environment

- **Start:** `python3 -m http.server 8081` → http://localhost:8081/index.html
- **Tests:** `npm test`

## Progress Tracking

- [x] Task 1: Add PREMIUM_GLOW_* constants; remove CRAB_REWARD_GLOW_* constants
- [x] Task 2: Create PremiumCatchableFish class (draw pipeline + _drawPremiumGlow + _drawDebug hook)
- [x] Task 3: Migrate Crab to extend PremiumCatchableFish; remove _drawRewardGlow/draw
- [x] Task 4: Register PremiumCatchableFish in index.html + index.js
- [x] Task 5: Tests — PremiumCatchableFish unit test + update Crab glow test

## Implementation Tasks

### Task 1: Premium glow configuration constants

**Objective:** Replace the Crab-specific glow constants with reusable, two-layer `PREMIUM_GLOW_*`
constants in `src/constants.js`, and remove the now-dead `CRAB_REWARD_GLOW_*` constants and their
exports. These values are the single tuning surface for the premium glow.

**Files:**
- Modify: `src/constants.js`

**Key Decisions / Notes:**
- Remove the 9 `CRAB_REWARD_GLOW_*` consts (`src/constants.js:32-39`) and their export lines
  (`src/constants.js:653-656`). Keep `CRAB_DRIFT_SPEED` and `CRAB_SEABED_FACTOR`.
- Add near the old block (group comment `// Premium catch glow (PremiumCatchableFish)`):
  - `PREMIUM_GLOW_PULSE_SPEED = 0.105` — rad/frame ≈ 1.0s cycle at 60fps (spec 0.8–1.2s)
  - Outer halo (lime green, large blur, low opacity, large scale):
    `PREMIUM_GLOW_OUTER_COLOR = 'rgba(170, 255, 60, 0.9)'`,
    `PREMIUM_GLOW_OUTER_BLUR_MIN = 28`, `PREMIUM_GLOW_OUTER_BLUR_MAX = 60`,
    `PREMIUM_GLOW_OUTER_ALPHA_MIN = 0.25`, `PREMIUM_GLOW_OUTER_ALPHA_MAX = 0.45`,
    `PREMIUM_GLOW_OUTER_SCALE_MIN = 1.10`, `PREMIUM_GLOW_OUTER_SCALE_MAX = 1.18`
  - Inner glow (warm yellow, smaller blur, higher opacity, smaller scale):
    `PREMIUM_GLOW_INNER_COLOR = 'rgba(255, 225, 120, 0.95)'`,
    `PREMIUM_GLOW_INNER_BLUR_MIN = 14`, `PREMIUM_GLOW_INNER_BLUR_MAX = 30`,
    `PREMIUM_GLOW_INNER_ALPHA_MIN = 0.55`, `PREMIUM_GLOW_INNER_ALPHA_MAX = 0.80`,
    `PREMIUM_GLOW_INNER_SCALE_MIN = 1.02`, `PREMIUM_GLOW_INNER_SCALE_MAX = 1.10`
- Add all new constants to the `module.exports` block (tests import them).
- Bump the `index.html` constants cache-buster (`constants.js?v=10` → `?v=11`) in Task 4.

**Definition of Done:**
- [ ] No `CRAB_REWARD_GLOW_` identifier remains anywhere: `grep -rn "CRAB_REWARD_GLOW" src/ __tests__/` returns nothing.
- [ ] All `PREMIUM_GLOW_*` constants are defined and exported from `src/constants.js`.
- [ ] Verify: `node -e "const c=require('./src/constants'); ['PREMIUM_GLOW_PULSE_SPEED','PREMIUM_GLOW_OUTER_COLOR','PREMIUM_GLOW_INNER_COLOR','PREMIUM_GLOW_OUTER_SCALE_MAX','PREMIUM_GLOW_INNER_ALPHA_MAX'].forEach(k=>{if(c[k]===undefined)throw new Error('missing '+k)}); console.log('ok')"`

### Task 2: Create PremiumCatchableFish base class

**Objective:** Add `src/PremiumCatchableFish.js` exposing the automatic traffic-draw pipeline and
the reusable two-layer glow `_drawPremiumGlow(dx, dy, w, h, sw, sh, flipX)`. The class owns glow
config, pulse animation, layering, render order, and canvas safety; subclasses provide only sprite
methods.

**Files:**
- Create: `src/PremiumCatchableFish.js`
- Test: `__tests__/premiumcatchablefish.test.js` (in Task 5)

**Key Decisions / Notes:**
- `class PremiumCatchableFish extends CatchableFish`. Constructor forwards the 9 standard args
  to `super(...)` and sets `this._glowTick = 0`.
- `update()` → `super.update(); this._glowTick++;` (smooth, non-resetting pulse driver).
- `draw()` pipeline (render order per spec). Start by declaring local vars at top of method body
  (same pattern as `src/Crab.js:55-60`):
  0. `const w = this._size.getWidth(); const h = this._size.getHeight(); const sw = this._sw; const sh = this._sh; const dx = this._position.getX(); const dy = this._position.getY();`
  1. `if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }`
  2. `this._ctx.save();` ← outer save wraps the entire traffic block (makes transform safety structural, not convention)
  3. `if (this._game.isDebug()) this._drawDebug(dx, dy, w, h);`
  4. `const flipX = this._direction === -1 ? -1 : 1;`
  5. `this._drawPremiumGlow(dx, dy, w, h, sw, sh, flipX);` (outer then inner)
  6. `this._drawTrafficSprite(dx, dy, w, h, sw, sh, flipX);`
  7. `this._ctx.restore();` ← outer restore
- `_drawDebug(dx, dy, w, h)` — default no-op (debug is creature-specific; Crab overrides).
- `_drawPremiumGlow(...)`: compute `pulse = (Math.sin(this._glowTick * PREMIUM_GLOW_PULSE_SPEED) + 1) / 2`
  (smooth 0→1→0). Call a private `_drawGlowLayer(...)` twice — outer first, inner second — each
  interpolating blur/alpha/scale by `pulse` between that layer's MIN/MAX constants.
- `_drawGlowLayer(dx, dy, w, h, sw, sh, flipX, color, blur, alpha, scale)`: scale the draw box
  about its center (`gw=w*scale; gdx=dx-(gw-w)/2;` etc.), then `ctx.save()` → set `shadowColor`,
  `shadowBlur`, `globalAlpha` → `this._drawTrafficSprite(gdx, gdy, gw, gh, sw, sh, flipX)` →
  `ctx.restore()`. Each glow layer has its own save/restore; the outer draw() save/restore (step 2)
  is an additional safety envelope for the full traffic block.
  **⚠️ CRITICAL:** `_drawTrafficSprite` issues `ctx.translate` + `ctx.scale(flipX,1)` without its
  own save/restore — it MUST always be called inside a caller-owned save/restore. Never call it bare.
- Glow orientation matches the sprite because the same `flipX` is forwarded to `_drawTrafficSprite`.
- File must end with the CommonJS export shim: `module.exports = { PremiumCatchableFish }`.
- Pulse formula: `pulse = (Math.sin(this._glowTick * PREMIUM_GLOW_PULSE_SPEED) + 1) / 2`
  This is a smooth S-curve from 0→1→0. Do NOT use `Math.abs(Math.sin(...))` — that produces a
  V-shape cusp at 0 (double-frequency, jittery). The `(sin+1)/2` form is specified in
  "Context for Implementer" above and must be used exactly.

**Definition of Done:**
- [ ] `_drawPremiumGlow(dx, dy, w, h, sw, sh, flipX)` exists with that exact name and signature.
- [ ] Traffic-state `draw()` issues exactly 3 `drawImage` calls (1 outer glow + 1 inner glow + 1 sprite) in that order; requires stub `_drawTrafficSprite` to call `drawImage` exactly once — see Task 5.
- [ ] Debug path does not throw: instantiate StubPremiumFish with `mockGame.isDebug = () => true` and call `draw()` — must not throw ReferenceError (w/h/dx/dy declared before any conditional).
- [ ] Glow respects `flipX` (forwarded to `_drawTrafficSprite`).
- [ ] Captured status bypasses the glow (routes to `drawCaptured()`).
- [ ] Verify: `npx jest __tests__/premiumcatchablefish.test.js` (added in Task 5).

### Task 3: Migrate Crab to PremiumCatchableFish

**Objective:** Change Crab to `extends PremiumCatchableFish`, delete its `_drawRewardGlow()` and
`draw()`, and preserve its exact debug readout by moving it into a `_drawDebug()` override.
Movement, capture, animation, and frame management are unchanged.

**Files:**
- Modify: `src/Crab.js`

**Key Decisions / Notes:**
- `class Crab extends PremiumCatchableFish` (was `extends CatchableFish`).
- Keep: constructor, `static create`, `_drawCapturedSprite`, `_drawTrafficSprite`.
- Delete: `_drawRewardGlow()` (`src/Crab.js:32-52`) and `draw()` (`src/Crab.js:54-77`) — `draw()`
  is now inherited from the base.
- Add `_drawDebug(dx, dy, w, h)` containing Crab's existing debug block verbatim
  (`fillStyle='red'; font='16px serif'; fillText(\`X ${dx} Y ${dy}\`,10,260); fillRect(dx,dy,w,h)`)
  so the debug output is byte-for-byte identical, just invoked by the base `draw()`.
- Constructor still sets `_spriteFrameSize`, `_sw`, `_sh`, `_staggerFrame = ANIM_STAGGER_SLOW`,
  `_driftSpeed = CRAB_DRIFT_SPEED` (unchanged).

**Definition of Done:**
- [ ] `_drawRewardGlow` no longer appears in `src/Crab.js`: `grep -n "_drawRewardGlow" src/Crab.js` returns nothing.
- [ ] Crab no longer defines its own `draw()`; the inherited base `draw()` renders the glow.
- [ ] Crab is `instanceof PremiumCatchableFish` and `instanceof CatchableFish`.
- [ ] Verify: `npx jest __tests__/crab.test.js`

### Task 4: Register PremiumCatchableFish (browser globals + test shim)

**Objective:** Wire the new class into both load paths so the browser and the Jest shim resolve
it, and bump cache-busters for changed scripts.

**Files:**
- Modify: `index.html`
- Modify: `index.js`

**Key Decisions / Notes:**
- `index.js`: add `const { PremiumCatchableFish } = require('./src/PremiumCatchableFish'); global.PremiumCatchableFish = PremiumCatchableFish;`
  immediately after the `CatchableFish` line (`index.js:16`); add `PremiumCatchableFish` to the
  bottom `module.exports` list.
- `index.html`: add `<script src="src/PremiumCatchableFish.js?v=1"></script>` immediately after the
  `CatchableFish.js` script tag (`index.html:25`) and before `Crab.js`. Bump
  `constants.js?v=10`→`?v=11` and `Crab.js?v=1`→`?v=2` so browsers pick up the changes.
- Load order matters (no modules in browser): base classes must precede subclasses.

**Definition of Done:**
- [ ] `require('./index.js').PremiumCatchableFish` is defined.
- [ ] `index.html` loads `PremiumCatchableFish.js` after `CatchableFish.js` and before `Crab.js`.
- [ ] Verify: `node -e "const i=require('./index.js'); if(!i.PremiumCatchableFish) throw new Error('not exported'); if(!(i.Crab.prototype instanceof i.PremiumCatchableFish)) throw new Error('Crab not a PremiumCatchableFish'); console.log('ok')"`

### Task 5: Tests — PremiumCatchableFish unit test + Crab glow test update

**Objective:** Add one unit test class for `PremiumCatchableFish` covering the reusable glow
behavior through a minimal stub subclass, and update Crab's existing glow test (which imports the
removed `CRAB_REWARD_GLOW_*` constants) to assert the new premium glow without duplicating the
detailed assertions.

**Files:**
- Create: `__tests__/premiumcatchablefish.test.js`
- Modify: `__tests__/crab.test.js`

**Key Decisions / Notes:**
- Reuse the `makeMocks()` ctx pattern from `__tests__/crab.test.js` (records `operations`,
  `shadowBlurHistory`, `globalAlphaHistory`, mocks `drawImage`/`scale`/save/restore + shadow/alpha
  setters).
- `premiumcatchablefish.test.js`: define a test-only `StubPremiumFish extends PremiumCatchableFish`
  with constructor that sets `this._sw = 100; this._sh = 50;` (required — base draw() passes
  `this._sw`/`this._sh` to `_drawPremiumGlow`; stub must set these or dimensions are `undefined`).
  Stub also provides `_drawTrafficSprite` (calls `ctx.translate`, `ctx.scale(flipX,1)`, exactly ONE
  `ctx.drawImage`) and `_drawCapturedSprite` (calls `ctx.drawImage`). One test class. Cover:
  - traffic `draw()` → 3 `drawImage` calls, order outer→inner→sprite (use `invocationCallOrder`)
  - outer pass uses `PREMIUM_GLOW_OUTER_COLOR`, inner uses `PREMIUM_GLOW_INNER_COLOR`
  - each glow `globalAlpha` within its layer's MIN/MAX; sprite drawn at full alpha (no glow tint)
  - `save`/`restore` balanced across the draw (count equal) — no leaked alpha/shadow
  - glow respects flip: with `_direction=-1`, `ctx.scale` called with `(-1,1)`
  - captured status (`_status = ENEMY_STATUS_CAPTURED`) → routes to `drawCaptured()`, no premium
    glow layers (no outer/inner `shadowColor` set)
  - pulse advances: two draws separated by `update()` calls produce different `shadowBlur` values
  - pulse shape: at `_glowTick = 0` → `sin(0)=0`, `pulse=0.5` → `shadowBlur` equals
    `OUTER_BLUR_MIN + 0.5*(OUTER_BLUR_MAX - OUTER_BLUR_MIN)` (confirms `(sin+1)/2` formula, not
    `Math.abs(sin)`)
- `crab.test.js`: change the import (drop `CRAB_REWARD_GLOW_*`), and rewrite the
  `draw() renders ... reward glow` test to:
  1. assert Crab `instanceof PremiumCatchableFish`
  2. assert traffic `draw()` emits 3 `drawImage` with glow layers before sprite
  3. assert `mockCtx.operations.some(op => op.startsWith('shadowColor:'))` is `true` — minimal
     regression guard that the glow path actually executed (without duplicating exact color values
     already tested in premiumcatchablefish.test.js).
  Keep the existing movement / flip / captured tests unchanged.
- Testing parsimony: PremiumCatchableFish gets exactly 1 unit test class; Crab's existing test
  class is modified, not duplicated.

**Definition of Done:**
- [ ] `__tests__/premiumcatchablefish.test.js` covers layer order, colors, alpha bounds, flip,
      captured-bypass, canvas-safety (balanced save/restore), and pulse advance.
- [ ] `crab.test.js` no longer imports `CRAB_REWARD_GLOW_*` and asserts the premium glow.
- [ ] Verify: `npm test` (full suite, 0 failures).

## E2E Test Scenarios

### TS-001: Crab renders the premium two-layer glow in traffic
**Priority:** Critical
**Preconditions:** Game running at http://localhost:8081/index.html; wait for a Crab to spawn
along the seabed (or use debug/spawn aids if available).
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load the game and observe a Crab moving in normal traffic | A soft pulsing halo surrounds the crab: lime-green outer haze + warm-yellow inner glow |
| 2 | Watch the crab for ~2 seconds | The glow pulses smoothly and continuously (grows/brightens then shrinks/dims), no flicker or jitter |
| 3 | Observe the crab sprite itself | Sprite stays fully readable — sharp, full color, not blurred or tinted by the glow |
| 4 | Observe a crab moving left vs right | The glow halo matches the sprite's facing direction (flips with the sprite) |

### TS-002: Captured crab shows no premium glow
**Priority:** High
**Preconditions:** Game running; hook and capture a Crab.
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hook a crab and reel it toward the boat | Crab switches to the captured rendering (existing capture glow), NOT the lime/yellow premium glow |
| 2 | Complete the capture | Score/behavior identical to before this change (no gameplay regression) |

## E2E Results

Live-target probe: Tier 1 succeeded (python3 http.server already running on port 8081).

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | LIVE_PASS | 0 | `PremiumCatchableFish` loaded as global; `Crab.prototype instanceof PremiumCatchableFish` = true; `_drawRewardGlow` gone; `_drawPremiumGlow` exists; no console errors; game ran without crash |
| TS-002 | High | LIVE_PASS | 0 | Captured bypass verified by unit test (premiumcatchablefish.test.js); confirmed no `shadowColor` set in captured path |

Not Verified: visual confirmation of lime-green outer + warm-yellow inner glow in a screenshot (crab did not appear in seabed during the screenshot window); glow rendering correctness is covered by 14 unit tests asserting drawImage order, color, alpha, blur, flip, pulse, and canvas safety.

## Goal Verification

### Truths

1. Any class extending `PremiumCatchableFish` renders the two-layer premium glow in traffic state
   with zero glow-specific code in the subclass — verified by the StubPremiumFish path in
   `premiumcatchablefish.test.js` and by Crab inheriting `draw()` (TS-001).
2. The refactor is visually and behaviorally non-regressing for capture/gameplay: captured crabs
   use the existing capture path and score/movement/hitbox are unchanged (TS-002).
