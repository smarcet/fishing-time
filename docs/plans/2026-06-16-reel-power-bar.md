# ReelPowerBar HUD Component Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `ReelPowerBar` HUD component that visualizes reel capture power (0.0–1.0) via a color-coded horizontal bar in the top-left corner, driven by a custom `reelPowerChanged` DOM event emitted by `Hook.update()` — keeping HUD rendering fully decoupled from gameplay logic.

## Approach

**Chosen:** Standalone class mirroring `ScoreSystem` pattern — event-listener-driven, no `GameObject` inheritance.
**Why:** `ScoreSystem` already proves this pattern works cleanly in this codebase: constructor registers `document` listeners, `update()` drives animation state, `draw(ctx)` renders to canvas, `destroy()` removes listeners. Reusing it avoids coupling `ReelPowerBar` to `Hook` internals and keeps `Hook` unaware of the HUD.

## Context for Implementer

Two separate concerns drive visibility:
1. **`_visible`** — toggled by `EVENT_HOOK_IDLE` (hide) and implicitly by receiving `EVENT_REEL_POWER_CHANGED` (show). The bar shows exactly when a `CatchableFish` is actively being fought; it hides for inert objects (bottles) because those never trigger `EVENT_REEL_POWER_CHANGED`.
2. **`_power`** — set by every `EVENT_REEL_POWER_CHANGED` frame. Formula in Hook: `1 - Math.min(1, this._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE)`. Result: 1.0 when fish is safely held, 0.0 when about to escape.

The event fires inside the existing `HOOK_STATUS_HOOKED` + `isCatchableFishHooked()` branch that already runs per-frame — no new state machine needed.

## File Structure

- `src/constants.js` (modify) — add `EVENT_REEL_POWER_CHANGED`
- `src/Hook.js` (modify) — dispatch `EVENT_REEL_POWER_CHANGED` per-frame during fish fight
- `src/ReelPowerBar.js` (create) — standalone HUD class
- `src/Game.js` (modify) — instantiate, update, draw
- `main.html` (modify) — add `<script>` tag
- `index.js` (modify) — add CommonJS require/export for tests
- `__tests__/reel-power-bar.test.js` (create) — unit tests
- `docs/adr/0011-reel-power-bar-custom-events.md` (create) — ADR

## Progress Tracking

- [x] Task 1: Add `EVENT_REEL_POWER_CHANGED` constant and dispatch from `Hook`
- [x] Task 2: Create `ReelPowerBar.js`
- [x] Task 3: Wire `ReelPowerBar` into `Game.js`, `main.html`, and `index.js`
- [x] Task 4: Unit tests for `ReelPowerBar`
- [x] Task 5: ADR 0011 — ReelPowerBar custom-event HUD pattern

## Implementation Tasks

---

### Task 1: Add `EVENT_REEL_POWER_CHANGED` constant and dispatch from `Hook`

**Objective:** Define the new event name constant in `constants.js` and export it. Then dispatch `reelPowerChanged` from `Hook.update()` every frame while a `CatchableFish` is actively being fought, so `ReelPowerBar` receives real-time power data without polling Hook internals.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/Hook.js`

**Key Decisions / Notes:**

- Add at line 112 (immediately after the existing `EVENT_HOOK_IDLE` declaration on line 111): `const EVENT_REEL_POWER_CHANGED = 'reelPowerChanged';`
- In `module.exports` (line 187), append `, EVENT_REEL_POWER_CHANGED` after `EVENT_HOOK_IDLE` on that same line.
- In `Hook.update()`, inside the `} else if (this._status === HOOK_STATUS_HOOKED) {` branch, the escape threshold check currently reads:
  ```js
  if (this._escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE) {
    // ... build explosion, reset, fire EVENT_HOOK_IDLE, return
  }
  ```
  Add the dispatch as an explicit `else` branch so it is structurally impossible to fire on the escape frame:
  ```js
  if (this._escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE) {
    // existing escape logic unchanged
  } else if (typeof document !== 'undefined') {
    const power = 1 - Math.min(1, this._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE);
    document.dispatchEvent(new CustomEvent(EVENT_REEL_POWER_CHANGED, { detail: { power } }));
  }
  ```
- The `typeof document !== 'undefined'` guard matches the existing pattern used throughout `Hook.js`.

**Definition of Done:**

- [ ] `EVENT_REEL_POWER_CHANGED` is defined in `constants.js` and present in `module.exports`
- [ ] `Hook.update()` dispatches `reelPowerChanged` each frame when `isCatchableFishHooked()` is true and fish has NOT yet escaped
- [ ] `power` value ranges from `1.0` (escape progress = 0) to `0.0` (escape progress = max)
- [ ] Verify: `npm test -- --testPathPattern=hook --silent` passes with 0 failures

---

### Task 2: Create `ReelPowerBar.js`

**Objective:** Implement the standalone `ReelPowerBar` class that listens to `EVENT_REEL_POWER_CHANGED` (show/update) and `EVENT_HOOK_IDLE` (hide), and renders a compact horizontal bar in the top-left corner colored red→green by power level.

**Files:**

- Create: `src/ReelPowerBar.js`

**Key Decisions / Notes:**

- **Class structure mirrors `ScoreSystem`** (`src/ScoreSystem.js:38-148`): constructor registers listeners, `update()` is a no-op (all state driven by events), `draw(ctx)` renders, `destroy()` removes listeners.
- **Visibility:** `_visible = false` initially; set `true` on `EVENT_REEL_POWER_CHANGED`, set `false` on `EVENT_HOOK_IDLE`.
- **Layout constants (module-private):**
  ```js
  const RPB_X        = 10;     // px from left edge
  const RPB_Y        = 10;     // px from top edge
  const RPB_WIDTH    = 150;    // px total bar track width
  const RPB_HEIGHT   = 14;     // px bar track height
  const RPB_LABEL_Y  = 24;     // px baseline y for "REEL" label
  const RPB_BAR_Y    = 28;     // px top of bar track
  const RPB_BG_PAD   = 4;      // px padding around the whole widget
  const RPB_FONT     = 'bold 12px monospace';
  const RPB_TRACK_COLOR = 'rgba(0,0,0,0.35)';  // semi-transparent track
  ```
- **Color formula** (power 0.0→1.0 maps red→green):
  ```js
  const r = Math.round(255 * (1 - power));
  const g = Math.round(255 * power);
  const fillColor = `rgb(${r},${g},0)`;
  ```
- **draw() pseudo-code:**
  ```
  if (!_visible) return;
  ctx.save()
    draw dark background rect (RPB_X - RPB_BG_PAD) ... (RPB_WIDTH + RPB_BG_PAD*2)
    fillStyle='white', font=RPB_FONT → fillText('REEL', RPB_X, RPB_LABEL_Y)
    fillStyle=RPB_TRACK_COLOR → fillRect(RPB_X, RPB_BAR_Y, RPB_WIDTH, RPB_HEIGHT)
    fillStyle=fillColor → fillRect(RPB_X, RPB_BAR_Y, _power * RPB_WIDTH, RPB_HEIGHT)
  ctx.restore()
  ```
- **CommonJS dual-mode guard at bottom** (matches pattern in every other `src/` file):
  ```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReelPowerBar };
  }
  ```
- No sprite images, no `<img>` tags needed.

**Definition of Done:**

- [ ] `ReelPowerBar` class exists in `src/ReelPowerBar.js` with `constructor`, `update()`, `draw(ctx)`, `destroy()`
- [ ] `_visible` starts `false`; `EVENT_REEL_POWER_CHANGED` sets `_visible = true` and updates `_power`; `EVENT_HOOK_IDLE` sets `_visible = false`
- [ ] `draw()` is a no-op when `_visible` is false; draws bar when true
- [ ] Bar fill color interpolates from red (`power=0`) to green (`power=1`)
- [ ] `destroy()` removes both listeners
- [ ] Verify: file exists and is syntactically valid via `node -e "require('./src/ReelPowerBar.js')"`

---

### Task 3: Wire `ReelPowerBar` into `Game.js`, `main.html`, and `index.js`

**Objective:** Integrate `ReelPowerBar` into the game loop and HTML entry point so it renders every frame during a fish fight.

**Files:**

- Modify: `src/Game.js`
- Modify: `main.html`
- Modify: `index.js`

**Key Decisions / Notes:**

- **`Game.js` constructor** — after `this._scoreSystem = new ScoreSystem();` (line 46), add:
  ```js
  this._reelPowerBar = new ReelPowerBar();
  ```
- **`Game.update()`** — after `this._scoreSystem.update();` (line 62), add:
  ```js
  this._reelPowerBar.update();
  ```
- **`Game.draw()`** — after `this._scoreSystem.draw(this._ctx, this._size.getWidth());` (line 121), add:
  ```js
  this._reelPowerBar.draw(this._ctx);
  ```
  Draw after score so bar renders on top of score if regions ever overlap (they won't — score is top-right, bar is top-left).
- **`main.html`** — add script tag immediately after ScoreSystem:
  ```html
  <script src="src/ReelPowerBar.js?v=1"></script>
  ```
  Must be before `Game.js` (line 32) since Game.js references `ReelPowerBar`.
- **`index.js`** — add after the `ScoreSystem` require line (line 22):
  ```js
  const { ReelPowerBar } = require('./src/ReelPowerBar'); global.ReelPowerBar = ReelPowerBar;
  ```
  Add `ReelPowerBar` to `module.exports`.
- **`Trivial:`** `update()` wiring — ≤5 net new lines in Game.js; covered by full test suite run.

**Definition of Done:**

- [ ] `Game.js` constructs, updates, and draws `_reelPowerBar`
- [ ] `main.html` loads `src/ReelPowerBar.js` before `src/Game.js`
- [ ] `index.js` exports `ReelPowerBar` so tests can `require('../index.js')`
- [ ] Verify: `npm test --silent` passes (0 failures across the full suite)

---

### Task 4: Unit tests for `ReelPowerBar`

**Objective:** Cover `ReelPowerBar` behavior through its public event-driven interface — not its internal fields. One test class; scenarios cover initial state, event handling, draw routing, and destroy.

**Files:**

- Create: `__tests__/reel-power-bar.test.js`
- Test: `src/ReelPowerBar.js` (via `require('../index.js')`)

**Key Decisions / Notes:**

- `score-system.test.js` calls handlers directly (`_handleCapture`) and never uses `dispatchEvent`. `audio-system.test.js` only counts `addEventListener` call counts. Neither demonstrates a routing listener map. Use this explicit mock in `beforeEach`:
  ```js
  let listeners = {};
  global.document = {
    addEventListener:    (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    removeEventListener: (evt, fn) => { if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== fn); },
    dispatchEvent:       (e)       => { (listeners[e.type] || []).forEach(fn => fn(e)); },
  };
  ```
  And `afterEach`: `delete global.document; listeners = {};`
- `ReelPowerBar` must store its bound handler references as instance properties (e.g. `this._handlePowerChanged = (e) => { ... };`) so `removeEventListener` in `destroy()` can match the exact reference. An inline arrow in `constructor` + `destroy()` will NOT match — same pattern as `AudioSystem.js`.
- Test scenarios (one `describe` block per concern):
  1. **Initial state** — `_visible` is false, `_power` is 0.
  2. **`EVENT_REEL_POWER_CHANGED`** — sets `_visible = true`, updates `_power` to `detail.power`.
  3. **`EVENT_HOOK_IDLE`** — sets `_visible = false`.
  4. **`draw()` visibility gate** — when `_visible = false`, `ctx.fillRect` is never called; when `_visible = true`, it is.
  5. **`draw()` color interpolation** — at `power=1.0` fill contains green; at `power=0.0` fill contains red (capture the `fillStyle` setter as done in score-system tests).
  6. **`destroy()`** — after calling `destroy()`, dispatching events has no effect on state.
- Do NOT add assertions for internal private fields beyond what is already observable through the behavior above (test desiderata: behavior not structure).

**Definition of Done:**

- [ ] `__tests__/reel-power-bar.test.js` exists with ≥ 6 behavioral tests
- [ ] All tests pass: `npm test -- --testPathPattern=reel-power-bar --silent`
- [ ] Full suite passes: `npm test --silent`

---

### Task 5: ADR 0011 — ReelPowerBar custom-event HUD pattern

**Objective:** Document the architectural decision to use DOM custom events as the communication channel between `Hook`/reel gameplay logic and the `ReelPowerBar` HUD, so future contributors understand why the bar does not read Hook state directly.

**Files:**

- Create: `docs/adr/0011-reel-power-bar-custom-events.md`

**Key Decisions / Notes:**

- ADR format matches the existing ones (`docs/adr/0010-*.md`): `# ADR NNNN — Title`, `**Date:**`, `**Status:** Accepted`, then `## Context`, `## Decisions`, `## Consequences` (some ADRs call it `## Trade-offs`).
- Content must cover:
  - **Context:** Why a HUD indicator was needed; the tight-coupling risk if `ReelPowerBar` read `Hook._escapeProgress` directly.
  - **Decision 1:** Introduce `EVENT_REEL_POWER_CHANGED` dispatched from `Hook.update()` with a normalized `power` payload. Explain why a normalized float (0–1) is a more stable API than exposing raw progress integers.
  - **Decision 2:** Standalone class pattern (not extending `GameObject`) — consistent with `ScoreSystem` and `AudioSystem`; avoids inheriting the `getPosition()`/`getSize()` contract that canvas HUD elements don't need.
  - **Decision 3:** Visibility driven by `EVENT_HOOK_IDLE` rather than polling a `Hook.isHooked()` getter — keeps `ReelPowerBar` zero-dependency on `Hook`.
  - **Consequences:** Hook can be replaced or refactored without touching HUD code; multiple HUD components can consume the same events independently; the event channel adds one `dispatchEvent` call per frame during a fish fight (negligible cost).
  - **Known pre-existing violation:** `EnemyWithAnimation.js` (line 83) still reads `this._hook._escapeProgress` directly for its glow-color computation. Document this as technical debt — a future migration could replace that access with a `reelPowerChanged` listener or a normalized getter on `Hook`, but that refactor is out of scope for this plan.
- **`Trivial:`** Documentation-only file — no production code changes; no covering test needed.

**Definition of Done:**

- [ ] `docs/adr/0011-reel-power-bar-custom-events.md` exists with Context, Decisions, and Consequences sections
- [ ] ADR accurately describes the three decisions above
- [ ] Verify: `ls docs/adr/0011-reel-power-bar-custom-events.md` exits 0
