# Premium Fish Rim-Glint + Sparkle Refinement Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The prior plan (`2026-06-18-premium-catchable-fish.md`, COMPLETE) introduced the
`PremiumCatchableFish` base class and gave it a **dual-layer `shadowBlur` glow**
(outer + inner blurred, scaled-up duplicate sprite copies). At the spec-verify
Code Review Gate the user rejected the **visual**: the abstraction is correct, but
the effect reads as a "neon glow / magical aura / blurred halo / soft shadow" —
an *enchanted creature*, not the *valuable arcade target* Pirate Hook uses.

This plan refines only the visual treatment. Replace the blur-based glow with a
lightweight, clean, arcade-style highlight: a **tight warm rim glint** hugging the
sprite (gold/amber radial gradient that fades to fully transparent — no halo) plus
**2-3 small 4-point sparkles** that twinkle in and out near the fish. No
`shadowBlur`, no oversized glow layers, no duplicated/scaled sprites; the fish is
drawn exactly once, unmodified. Confirmed design choices (via AskUserQuestion):
**Effect = rim glint + sparkles**, **Palette = gold/amber** (glint
`rgba(255, 200, 90, a)`, sparkle white-gold `#FFF6D0`).

**Reference screenshot (provided by user, 2026-06-18 21:46):** The Pirate Hook
game shows the target premium-fish style. The crab sits clearly on top of a
bright, crisp circular radial gradient (yellow-amber core, strong saturation, fades
at the edge) — no blur, no halo, fish entirely readable. This confirms the rim-glint
approach; note the glint is visually prominent (bright), so alpha values must be
calibrated to match that weight.

**Outcome:** premium fish stay easy to spot and clearly readable, the effect is
visibly cleaner, the blurry halo is gone, and presentation matches Pirate Hook's
reward-highlight feel. Because the effect lives entirely in the base class,
`Crab` (and any future premium species) inherit it with zero per-species code.

## Summary

**Goal:** Replace the `shadowBlur` dual-glow on `PremiumCatchableFish` with a
gold/amber rim glint (tight radial gradient behind the fish) + twinkling 4-point
sparkles, drawing the fish once unmodified. Update the constants, the class, its
tests, the one broken Crab test, the cache-bust versions, and add an ADR.

## Workspace Scan

- Effect source: `src/PremiumCatchableFish.js` (`draw()` + `_drawPremiumGlow` + `_drawGlowLayer`, `_glowTick`).
- Constants: `src/constants.js:33-49` (15 `PREMIUM_GLOW_*` consts) and export block `:663-669`.
- Tests asserting OLD behavior: `__tests__/premiumcatchablefish.test.js` (full rewrite); `__tests__/crab.test.js:126` ("3 drawImage calls" — breaks).
- Reference pattern for particle rendering: `src/CapturePoofAnimation.js` (per-particle save → globalAlpha → beginPath/arc/fill → restore).
- Cache-bust: `index.html:9` (`constants.js?v=11`), `index.html:26` (`PremiumCatchableFish.js?v=1`). `Crab.js` is NOT modified → no bump.
- Old symbols confirmed referenced ONLY in `src/PremiumCatchableFish.js`, `src/constants.js`, `__tests__/premiumcatchablefish.test.js` (grep verified). `index.js` does not reference them.
- Highest ADR: `0033` → new ADR `0034`.

## Design

### Render order (in `draw()`, inside one outer save/restore)
1. `_drawPremiumGlint(dx,dy,w,h)` — tight radial gradient BEHIND the fish.
2. `_drawTrafficSprite(...)` — the fish, once, unmodified, **wrapped in its own
   save/restore** (it issues `translate`+`scale` without restoring; the sparkles
   that follow must not inherit that transform).
3. `_drawPremiumSparkles(dx,dy,w,h)` — twinkling sparkles ON TOP of the fish.

Captured fish still bypass everything → `drawCaptured()`. `_drawDebug` no-op hook
(overridden by `Crab`) is preserved. `_glowTick` is renamed `_pulseTick`.

### Glint (no halo)
Radial gradient `createRadialGradient(cx,cy,0, cx,cy,radius)` with core
`PREMIUM_GLINT_COLOR_CORE` → edge `PREMIUM_GLINT_COLOR_EDGE` (alpha 0). Radius =
`max(w,h) * PREMIUM_GLINT_RADIUS_FACTOR` (factor < 1 → hugs the sprite, never an
oversized halo). Alpha pulses `MIN→MAX` via
`pulse = (sin(_pulseTick * PREMIUM_PULSE_SPEED) + 1) / 2`. Own save/restore.

### Sparkles (blink in/out)
For each anchor in `PREMIUM_SPARKLE_ANCHORS` (`{ox,oy,phase}`):
`t = ((_pulseTick + phase) % PREMIUM_SPARKLE_PERIOD) / PREMIUM_SPARKLE_PERIOD`;
visible only while `t < PREMIUM_SPARKLE_DUTY`, brightness
`twinkle = sin((t/DUTY) * π)` (0→1→0 = short lifetime / low frequency). Position
`(cx + ox*w, cy + oy*h)`. `_drawSparkleStar` produces a **4-pointed star** via an
8-vertex path (alternating 4 outer points at `r*twinkle` and 4 inner at `r*0.38`)
filled with `PREMIUM_SPARKLE_COLOR`, alpha = `twinkle`. Own save/restore per
sparkle. Deterministic (no RNG) → testable.

**Phase-spacing invariant:** The `min(counts)===0` test guarantee holds only when
`phase spacing (32) > ceil(PERIOD * DUTY) = ceil(96 * 0.32) = 31`. Current
constants satisfy this by exactly 1 frame — do not increase `DUTY` above 0.32
without re-verifying the invariant. The test includes an explicit guard assertion
(see Task 2).

### New constants (gold/amber) — replace all 15 `PREMIUM_GLOW_*`
```js
const PREMIUM_PULSE_SPEED         = 0.105;                  // ~1.0s glint cycle @60fps
const PREMIUM_GLINT_COLOR_CORE    = 'rgba(255, 200, 90, 1)';
const PREMIUM_GLINT_COLOR_EDGE    = 'rgba(255, 200, 90, 0)';
const PREMIUM_GLINT_RADIUS_FACTOR = 0.62;                  // x max(w,h); <1 hugs sprite
const PREMIUM_GLINT_ALPHA_MIN     = 0.30;
const PREMIUM_GLINT_ALPHA_MAX     = 0.65;  // raised from 0.45 — matches brightness of Pirate Hook reference
const PREMIUM_SPARKLE_COLOR       = 'rgba(255, 246, 208, 1)';  // #FFF6D0 white-gold
const PREMIUM_SPARKLE_SIZE_FACTOR = 0.14;                  // x max(w,h) = peak outer radius
const PREMIUM_SPARKLE_PERIOD      = 96;                    // frames/cycle (~1.6s)
const PREMIUM_SPARKLE_DUTY        = 0.32;                  // visible fraction of cycle
const PREMIUM_SPARKLE_ANCHORS     = [
  { ox:  0.42, oy: -0.34, phase: 0  },
  { ox: -0.40, oy:  0.30, phase: 32 },
  { ox:  0.18, oy:  0.40, phase: 64 },
];
```
Add all eleven to the `module.exports` block; remove all `PREMIUM_GLOW_*` exports.

## Progress Tracking

Completed: 5 / 5 — Remaining: 0

- [x] **Task 1 — Swap constants (gold/amber glint + sparkle)**
- [x] **Task 2 — Rewrite `PremiumCatchableFish` effect + its tests (RED→GREEN)**
- [x] **Task 3 — Fix the broken `Crab` glow test + mock**
- [x] **Task 4 — Bump cache-bust versions**
- [x] **Task 5 — ADR 0034**

---

### Task 1 — Swap constants (gold/amber glint + sparkle)

**Files:** `src/constants.js`

Replace the 15 `PREMIUM_GLOW_*` constants (`:33-49`) with the eleven new
`PREMIUM_PULSE_SPEED` / `PREMIUM_GLINT_*` / `PREMIUM_SPARKLE_*` constants above.
Replace the `PREMIUM_GLOW_*` entries in the export block (`:663-669`) with the new
names. Keep alphabetical/group ordering consistent with the file.

`Trivial:` Data-only change (no control flow, no new public function). Covered by
the Task 2 class tests, which import these constants and fail to load if a name is
missing. Verify: `node -e "const c=require('./src/constants'); ['PREMIUM_PULSE_SPEED','PREMIUM_GLINT_COLOR_CORE','PREMIUM_GLINT_COLOR_EDGE','PREMIUM_GLINT_RADIUS_FACTOR','PREMIUM_GLINT_ALPHA_MIN','PREMIUM_GLINT_ALPHA_MAX','PREMIUM_SPARKLE_COLOR','PREMIUM_SPARKLE_SIZE_FACTOR','PREMIUM_SPARKLE_PERIOD','PREMIUM_SPARKLE_DUTY','PREMIUM_SPARKLE_ANCHORS'].forEach(k=>{if(c[k]===undefined)throw new Error('missing '+k)}); console.log('ok')"`

**DoD:** All new constants exported; no `PREMIUM_GLOW_*` symbol remains in
`src/constants.js` (grep returns nothing); verify command prints `ok`.

---

### Task 2 — Rewrite `PremiumCatchableFish` effect + its tests (RED→GREEN)

**Files:** `src/PremiumCatchableFish.js`, `__tests__/premiumcatchablefish.test.js`

**RED — rewrite `__tests__/premiumcatchablefish.test.js`** for the new behavior.
Extend `makeMocks()` to add: `createRadialGradient` (jest.fn returning
`{ addColorStop(){} }`, recorded with its args), a recording `fillStyle` setter
(`fillStyleHistory`), and no-op `arc`/`moveTo`/`lineTo`/`closePath`/`fill` (push to
`operations`). Keep `StubPremiumFish` (`_sw=100,_sh=50`, stub
`_drawTrafficSprite`/`_drawCapturedSprite`, no-op `drawCaptured`). Single unit test
class (one describe per state — traffic + captured). Behavior assertions:

- Sprite drawn exactly **once** (`drawImage` called 1×) — proves no duplicate sprites.
- `shadowBlurHistory` is **empty** — proves the blur halo is gone.
- `createRadialGradient` called once; glint radius (5th arg) is `> 0` and `< Math.max(w,h)` — tight, not an oversized halo.
- **Operations sub-sequence check** (must_fix from review): assert that the operations array contains, in order, the sub-sequence `['fill', 'restore', 'save', 'translate', 'scale', 'drawImage', 'restore']`. This proves (a) glint fill is before the sprite, (b) the glint's save/restore closes before the sprite's own save, and (c) the sprite's translate+scale stays within its own save/restore — so sparkles can't inherit the flip transform.
- Glint `globalAlpha` within `[PREMIUM_GLINT_ALPHA_MIN, PREMIUM_GLINT_ALPHA_MAX]` AND `> 0.1` (concrete visibility floor — catches a silently-zeroed alpha range).
- **Sparkle phase invariant guard:** `expect(PREMIUM_SPARKLE_ANCHORS[1].phase - PREMIUM_SPARKLE_ANCHORS[0].phase).toBeGreaterThan(Math.ceil(PREMIUM_SPARKLE_PERIOD * PREMIUM_SPARKLE_DUTY))` — ensures phase spacing always exceeds the active window so `min(counts)===0` is achievable.
- Sparkles twinkle in/out: stepping `update()` across one `PREMIUM_SPARKLE_PERIOD` and counting `fillStyle === PREMIUM_SPARKLE_COLOR` draws per frame, `max(counts) > 0` AND `min(counts) === 0`.
- `save`/`restore` balanced.
- Sprite flips with direction: `_direction=-1` → `scale(-1,1)`; `_direction=1` → `scale(1,1)`.
- Glint pulse advances: two draws separated by `update()`s yield different glint `globalAlpha`.
- Debug path (`isDebug()` true) does not throw.
- Captured: `_status=ENEMY_STATUS_CAPTURED` → `createRadialGradient` not called AND `drawImage` not called (routes to no-op `drawCaptured`).

Verify RED: `npx jest __tests__/premiumcatchablefish.test.js` fails (new
assertions against the still-old class).

**GREEN — rewrite `src/PremiumCatchableFish.js`** per the Design section: rename
`_glowTick`→`_pulseTick`; new `draw()` order (glint → save/sprite/restore →
sparkles); replace `_drawPremiumGlow`/`_drawGlowLayer` with `_drawPremiumGlint`,
`_drawPremiumSparkles`, `_drawSparkleStar`; preserve `_drawDebug` no-op and the
captured bypass. No `shadowBlur` anywhere. Keep the module.exports footer.

**DoD:** `npx jest __tests__/premiumcatchablefish.test.js` passes; no `shadowBlur`,
`PREMIUM_GLOW_*`, `_glowTick`, `_drawGlowLayer`, or `_drawPremiumGlow` remains in
the class (grep). **Verify:** `npx jest __tests__/premiumcatchablefish.test.js`.

---

### Task 3 — Fix the broken `Crab` glow test + mock

**Files:** `__tests__/crab.test.js`

`Crab.js` is unmodified (effect is inherited). Its `makeMocks()` lacks the new
canvas primitives — after Task 2, `crab.draw()` will throw a `TypeError` before
any assertion runs.

**RED sub-step:** Run `npx jest __tests__/crab.test.js` immediately after Task 2
completes. Confirm it crashes with a `TypeError` (e.g. "ctx.createRadialGradient
is not a function") — this proves the mock is incomplete and the task is needed.

**Fix:** Add to the crab `makeMocks()`:
- `createRadialGradient`: `jest.fn(() => ({ addColorStop(){} }))` — recorded in `operations`.
- No-op `arc`/`moveTo`/`lineTo`/`closePath`/`fill` — each pushes its name to `operations`.
- `fillStyle` setter recorded in `operations`.

Rewrite the `'renders premium glow'` test (`:126`) to assert the new behavior:
exactly **1** `drawImage`, `createRadialGradient` called, `shadowBlurHistory` empty,
`strokeRect` not called, and the same operations sub-sequence check used in Task 2
(`['fill','restore','save','translate','scale','drawImage','restore']` in order —
proves glint behind + inner save/restore correct). The two direction-flip tests stay
(they pass once the mock supports the primitives).

**DoD:** `npx jest __tests__/crab.test.js` passes; no assertion references
`shadowColor`/3-drawImage. **Verify:** `npx jest __tests__/crab.test.js`.

---

### Task 4 — Bump cache-bust versions

**Files:** `index.html`

`constants.js?v=11` → `v=12`; `PremiumCatchableFish.js?v=1` → `v=2`. Leave
`Crab.js?v=2` unchanged.

`Trivial:` Version-string bump only. Verify: `grep -n "constants.js?v=12\|PremiumCatchableFish.js?v=2" index.html`.

**DoD:** Both bumped; `Crab.js?v=2` untouched.

---

### Task 5 — ADR 0034

**Files:** `docs/adr/0034-premium-fish-rim-glint-sparkle.md`

Document the decision: replace the `shadowBlur` dual-glow with a gold/amber rim
glint + twinkling 4-point sparkles; record the avoid-list rationale (no halo, no
blur, no scaled sprite copies, fish drawn once), the chosen palette/constants, and
that the effect lives in the base class so all premium species inherit it. Note it
supersedes the glow visual decided in the prior premium-catchable-fish ADR/plan.

`Trivial:` Documentation only. **Verify:** file exists, references constants and rationale.

**DoD:** ADR 0034 created with Context / Decision / Consequences.

---

## Goal Verification

1. No `shadowBlur` is set by `PremiumCatchableFish` — grep `shadowBlur` in `src/PremiumCatchableFish.js` returns nothing; test asserts `shadowBlurHistory` empty.
2. The fish sprite is drawn exactly once per frame (no duplicated/scaled copies) — test asserts `drawImage` called 1×.
3. The glint is tight, not a halo — `createRadialGradient` radius `< max(w,h)` and edge color alpha is 0; test asserts radius bound.
4. Sparkles appear and disappear (twinkle) — test asserts per-frame sparkle count varies between 0 and >0 across a period.
5. Effect uses the gold/amber palette — glint `rgba(255,200,90,*)`, sparkle `#FFF6D0`.
6. `Crab` and future premium species inherit the new effect with no per-species code — `Crab.js` is unchanged; crab tests pass.
7. Premium fish remain readable and identifiable in the running game — browser E2E (see Verification).

## Verification

- **Unit:** `npm test` — full suite green (0 failures), especially `premiumcatchablefish.test.js` and `crab.test.js`.
- **Static:** grep confirms no `PREMIUM_GLOW_*` / `_glowTick` / `_drawGlowLayer` / `shadowBlur` remains in `src/`.
- **E2E (Full profile — UI change):** `python3 -m http.server 8081`, open `http://localhost:8081/` in a browser-automation tool (Claude Code Chrome → Chrome DevTools MCP → playwright-cli → agent-browser). Play until a Crab (premium) spawns; visually confirm: (a) a tight warm gold glint hugs the crab with NO large blurry halo, (b) small white-gold sparkles twinkle in/out near it, (c) the crab sprite is fully readable/un-blurred, (d) the effect reads as a valuable arcade target, not a magical aura. Capture a screenshot as evidence. Confirm non-premium fish are unaffected.

## Out of Scope

- Migrating `Octopus` (or any other species) to `PremiumCatchableFish` — future work.
- Sound/score/gameplay changes — visual only.
- Touching the prior plan file `2026-06-18-premium-catchable-fish.md`.

## Risks

| Risk | Mitigation |
|------|------------|
| Lingering canvas transform from `_drawTrafficSprite` shifts/flips the sparkles | Wrap the sprite draw in its own `save`/`restore`; sparkles run after restore (covered by save/restore-balance + position tests). |
| Renaming `_glowTick`→`_pulseTick` breaks a hidden reference | grep confirmed the symbol is local to `PremiumCatchableFish.js`; no external readers. |
| Glint still reads as a halo if radius too large | `RADIUS_FACTOR < 1` + edge alpha 0; test asserts radius `< max(w,h)`; tune in E2E. |
| Sparkle visibility flaky to assert at a single tick | Tests step across a full period and assert the min/max envelope, not a single frame. |
