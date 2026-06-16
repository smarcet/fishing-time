# TimerSystem Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `TimerSystem extends GameObject` that draws a golden circular countdown clock at the top-center of the canvas, emits `EVENT_TIMER_TIMEUP` exactly once when the countdown reaches zero, and causes `Game` to freeze the loop and display a centered "YOU WIN!" (green) or "GAME OVER" (red) message depending on whether the player reached `GAME_NEEDED_SCORE = 500` points.

## Approach

**Chosen:** `TimerSystem extends GameObject` with dt-driven countdown, event dispatch, and Canvas 2D arc-pie rendering — integrating into `Game` the same way `ScoreSystem` and `ReelPowerBar` do (`update(dt)` + `draw()`).

**Why:** The user explicitly requires `TimerSystem extends GameObject`. The `GameObject` base provides `this._ctx` and `this._size`, which `TimerSystem` needs to draw at top-center without extra constructor arguments — exactly as `Player`, `Bubble`, and enemies do. Extending `GameObject` is also the right semantic choice: `TimerSystem` is an active entity in the game world (ticks time, participates in the draw order).

## Context for Implementer

**dt unit:** `main.js` computes `deltaTime = timestamp - lastTime` where both are `requestAnimationFrame` timestamps in milliseconds. `Game.update(dt=0)` receives this. First call is `dt=0` (no-op). Normal 60fps gives ~16ms per frame. `TimerSystem.update(dt)` must handle this correctly.

**Centering:** `TimerSystem` receives the same `size` as `Game` (canvas size). Use `this._size.getWidth() / 2` for horizontal center. `getWidth()` and `getHeight()` are on the `Size` object (see `src/Size.js`).

**Event dispatch pattern:** Same as `Hook.js` — `typeof document !== 'undefined'` guard before `document.dispatchEvent(...)`. Dispatch only once (guard with `this._fired`).

**Game freeze:** When `this._gameResult !== null`, `Game.update()` returns early (after `_timerSystem.update(dt)` so the timer stops cleanly). The draw loop continues to show the overlay. This matches the spec: "El mensaje debe quedar visible en pantalla".

**ScoreSystem access:** Add `getScore()` to `ScoreSystem` so `Game` doesn't access `_score` directly. 1-line addition, covered by a test added to `score-system.test.js`.

## File Structure

- `src/constants.js` (modify) — add `EVENT_TIMER_TIMEUP`, `GAME_NEEDED_SCORE`
- `src/TimerSystem.js` (create) — `TimerSystem extends GameObject`, countdown logic, circular clock draw
- `src/ScoreSystem.js` (modify) — add `getScore()` public method
- `src/Game.js` (modify) — instantiate timer, listen for `EVENT_TIMER_TIMEUP`, freeze loop on game-over, draw overlay
- `main.html` (modify) — add `<script>` tag for `TimerSystem.js` before `Game.js`
- `index.js` (modify) — require/export `TimerSystem`
- `__tests__/timer-system.test.js` (create) — unit tests for `TimerSystem`
- `__tests__/score-system.test.js` (modify) — add `getScore()` test
- `docs/adr/0017-timer-system-game-object.md` (create) — ADR

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `dt` spike (tab backgrounded) jumps timer past 0 | Medium | Low | `Math.max(0, this._timeMs - dt)` clamps; dispatch fires exactly when `_timeMs` transitions to 0 |
| `Game.update()` freeze prevents `TimerSystem.update()` from firing | Low | High | Call `this._timerSystem.update(dt)` BEFORE the early-return guard; only game-world entities freeze |

## E2E Test Scenarios

### TS-001: Timer renders at top-center on game load
**Priority:** Critical
**Preconditions:** `python3 -m http.server 8000` running; `http://localhost:8000/main.html` open
**Mapped Tasks:** Task 1, Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:8000/main.html` | Game canvas loads |
| 2 | Take screenshot | Circular golden clock visible centered horizontally near top of screen |

### TS-002: GAME OVER fires when score < 500
**Priority:** Critical
**Preconditions:** Game running; score starts at 0
**Mapped Tasks:** Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Inject `document.dispatchEvent(new CustomEvent('timerTimeUp'))` via DevTools | Event fires |
| 2 | Take screenshot | Red "GAME OVER" text centered on screen |

### TS-003: YOU WIN! fires when score >= 500
**Priority:** Critical
**Preconditions:** Game running (DevTools console available)
**Mapped Tasks:** Task 2, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In DevTools console: `game._scoreSystem._score = 600` (directly sets internal score above threshold) | No visible change yet |
| 2 | In DevTools console: `document.dispatchEvent(new CustomEvent('timerTimeUp'))` | Event fires |
| 3 | Take screenshot | Green "YOU WIN!" text centered on screen |

## Progress Tracking

- [x] Task 1: Add `EVENT_TIMER_TIMEUP` and `GAME_NEEDED_SCORE` constants
- [x] Task 2: Create `TimerSystem.js` with countdown logic and circular clock draw
- [x] Task 3: Add `getScore()` to `ScoreSystem`
- [x] Task 4: Wire `TimerSystem` into `Game` — freeze loop, overlay, event handler
- [x] Task 5: Wire into `main.html`, `index.js`
- [x] Task 6: ADR 0017 — TimerSystem as a GameObject

## Implementation Tasks

---

### Task 1: Add `EVENT_TIMER_TIMEUP` and `GAME_NEEDED_SCORE` constants

**Objective:** Define the two new constants in `src/constants.js` and export them. `EVENT_TIMER_TIMEUP` is the DOM CustomEvent name dispatched by `TimerSystem`. `GAME_NEEDED_SCORE` is the score threshold `Game` uses to decide win vs. loss.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add after `EVENT_REEL_POWER_CHANGED` (line 112):
  ```js
  const EVENT_TIMER_TIMEUP  = 'timerTimeUp';
  const GAME_NEEDED_SCORE   = 500;
  ```
- In `module.exports` (end of file), add `EVENT_TIMER_TIMEUP` to the existing event-names export line (line 188, alongside the other `EVENT_*` constants). Add `GAME_NEEDED_SCORE` on a separate new line — it is a game-balance constant, not an event name, and must NOT be placed on the event-names line:
  ```js
  // On the existing EVENT_* export line — append EVENT_TIMER_TIMEUP:
  EVENT_ENEMY_CAPTURED, ..., EVENT_REEL_POWER_CHANGED, EVENT_TIMER_TIMEUP,
  // On a new line — add GAME_NEEDED_SCORE:
  GAME_NEEDED_SCORE,
  ```

**Definition of Done:**

- [ ] `EVENT_TIMER_TIMEUP` and `GAME_NEEDED_SCORE` exported from `constants.js`
- [ ] Verify: `node -e "const c=require('./src/constants'); console.log(c.EVENT_TIMER_TIMEUP, c.GAME_NEEDED_SCORE)"` prints `timerTimeUp 500`

---

### Task 2: Create `src/TimerSystem.js`

**Objective:** Implement `TimerSystem extends GameObject`. The `constructor(ctx, size, initialSeconds = 60)` stores the countdown in milliseconds. `update(dt)` decrements the timer and dispatches `EVENT_TIMER_TIMEUP` exactly once when it reaches zero. `draw()` renders a golden circular countdown clock at the top-center of the canvas inspired by the reference image.

**Files:**

- Create: `src/TimerSystem.js`
- Create: `__tests__/timer-system.test.js`
- Modify: `index.js` (add `TimerSystem` require/export so tests can use `require('../index.js')` and get constants on global)

**Key Decisions / Notes:**

- **No special require guard needed inside `TimerSystem.js`.** Use `EVENT_TIMER_TIMEUP` as a bare global — same pattern as `ReelPowerBar.js` uses `EVENT_REEL_POWER_CHANGED`. The test file must `require('../index.js')` (NOT `require('../src/TimerSystem.js')` directly), which triggers `Object.assign(global, _c)` in `index.js`, making `EVENT_TIMER_TIMEUP` available globally before `TimerSystem` is constructed. This is why `index.js` wiring (normally Task 5) must be done in this task so tests pass at Task 2.
- Constructor: `super(ctx, size)` — `this._timeMs = initialSeconds * 1000; this._initialMs = initialSeconds * 1000; this._fired = false`
- `update(dt)`: `super.update();` then `if (this._fired) return; this._timeMs = Math.max(0, this._timeMs - dt); if (this._timeMs === 0 && typeof document !== 'undefined') { this._fired = true; document.dispatchEvent(new CustomEvent(EVENT_TIMER_TIMEUP)); }`
- Visual constants (module-private):
  ```js
  const TS_CENTER_Y   = 72;          // px from top
  const TS_RADIUS     = 54;          // outer radius of clock face
  const TS_RING_WIDTH = 7;           // gold outer ring line width
  const TS_BELL_R     = 9;           // bell semicircle radius
  const TS_BELL_DIST  = 30;          // bell center x offset from cx
  const TS_BG_COLOR   = '#150030';   // dark purple clock background
  const TS_ARC_COLOR  = '#cc00ff';   // magenta countdown arc fill
  const TS_GOLD       = '#ffd700';   // gold ring and bells
  const TS_FONT       = 'bold 18px monospace';
  ```
- `draw()` rendering order (use `this._ctx`, center at `cx = this._size.getWidth() / 2`, `cy = TS_CENTER_Y`):
  1. Two gold bell semicircles (top half arc) at `cx ± TS_BELL_DIST`, `cy - TS_RADIUS + 4`
  2. Dark background `fillArc(cx, cy, TS_RADIUS)` with `TS_BG_COLOR`
  3. Purple pie arc: `moveTo(cx,cy)`, `arc(cx, cy, TS_RADIUS - TS_RING_WIDTH, -π/2, -π/2 + ratio*2π)`, `closePath()`, `fill(TS_ARC_COLOR)` — ratio = `this._timeMs / this._initialMs`
  4. Gold outer ring stroke: `arc(cx, cy, TS_RADIUS)`, `stroke(TS_GOLD, lineWidth=TS_RING_WIDTH)`
  5. White minute hand: line from `(cx, cy)` to `(cx, cy - TS_RADIUS*0.62)`, lineWidth=3
  6. White hour hand: line from `(cx, cy)` to `(cx + TS_RADIUS*0.42, cy + TS_RADIUS*0.15)`, lineWidth=4
  7. Gold center dot: `fillArc(cx, cy, 4)`, `TS_GOLD`
  8. Seconds label: `Math.ceil(this._timeMs / 1000)` centered below clock at `cy + TS_RADIUS + 10`, white, `TS_FONT`
  - Wrap entire draw in `ctx.save()` / `ctx.restore()`
- CommonJS dual-mode guard at bottom: `if (typeof module !== 'undefined' && module.exports) { module.exports = { TimerSystem }; }`
- **Test file**: use listener-map mock pattern from `reel-power-bar.test.js` (same `makeDocMock()` shape). The test file begins with `const { TimerSystem } = require('../index.js');` — this triggers `Object.assign(global, constants)` in index.js, making `EVENT_TIMER_TIMEUP` a global before TimerSystem is constructed. Scenarios:
  - `_timeMs` starts at `initialSeconds * 1000`, `_fired = false`
  - `update(dt)` decrements `_timeMs` by dt
  - `update(dt)` does NOT dispatch `timerTimeUp` when `_timeMs > 0` after decrement
  - `update(dt)` dispatches `timerTimeUp` exactly once when `_timeMs` reaches 0
  - `update(dt)` does NOT dispatch a second time after `_fired = true` (idempotent)
  - `draw()` calls `ctx.arc` when `_timeMs > 0` (clock face is always visible)
  - `draw()` does NOT call `ctx.moveTo` for the pie segment when `_timeMs === 0` (ratio=0, no arc fill)
  - `draw()` wraps in `save()`/`restore()`

**Definition of Done:**

- [ ] `src/TimerSystem.js` exists and `node -e "require('./src/TimerSystem.js')"` exits 0
- [ ] All timer-system tests pass: `npm test -- --testPathPattern=timer-system --silent`
- [ ] Full suite passes: `npm test --silent`

---

### Task 3: Add `getScore()` to `ScoreSystem`

**Objective:** Add a one-line public getter `getScore()` to `ScoreSystem` so `Game` can read the score without accessing `_score` directly.

**Files:**

- Modify: `src/ScoreSystem.js`
- Modify: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- Add after `_persist()` (line 104):
  ```js
  getScore() { return this._score; }
  ```
- Add one test to `score-system.test.js` in the existing "ScoreSystem initial state" describe block:
  ```js
  test('getScore() returns 0 initially', () => {
    const ss = new ScoreSystem();
    expect(ss.getScore()).toBe(0);
  });
  ```
  Then one more after a capture:
  ```js
  test('getScore() reflects captured score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } });
    expect(ss.getScore()).toBe(100);
  });
  ```

**Definition of Done:**

- [ ] `ScoreSystem.getScore()` returns `this._score`
- [ ] Both new tests pass: `npm test -- --testPathPattern=score-system --silent`

---

### Task 4: Wire `TimerSystem` into `Game` — freeze loop, overlay, event handler

**Objective:** Instantiate `TimerSystem` in `Game.constructor`, call `update(dt)` and `draw()` each frame, register a `EVENT_TIMER_TIMEUP` listener that determines win/loss, freeze the game loop when `_gameResult` is set, and draw a centered YOU WIN! / GAME OVER overlay on top of all other renders.

**Files:**

- Modify: `src/Game.js`

**Key Decisions / Notes:**

- In `Game.constructor` (after `this._reelPowerBar = new ReelPowerBar()`):
  ```js
  this._timerSystem = new TimerSystem(ctx, size);
  this._gameResult  = null; // null | 'win' | 'lose'
  this._handleTimeUp = () => {
    if (this._gameResult !== null) return;
    this._gameResult = this._scoreSystem.getScore() >= GAME_NEEDED_SCORE ? 'win' : 'lose';
  };
  if (typeof document !== 'undefined') {
    document.addEventListener(EVENT_TIMER_TIMEUP, this._handleTimeUp);
  }
  ```
- In `Game.update(dt)` — call `this._timerSystem.update(dt)` FIRST (before the freeze guard), then add:
  ```js
  if (this._gameResult !== null) return; // freeze game-world on game-over
  ```
  This goes after `this._timerSystem.update(dt)` and before `this._scoreSystem.update()`.
- In `Game.draw()` — add after `this._reelPowerBar.draw(this._ctx)`:
  ```js
  this._timerSystem.draw();
  if (this._gameResult !== null) this._drawGameResult();
  ```
- Add private method `_drawGameResult()`:
  ```js
  _drawGameResult() {
    const ctx = this._ctx;
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 96px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black';
    const text = this._gameResult === 'win' ? 'YOU WIN!' : 'GAME OVER';
    const color = this._gameResult === 'win' ? '#00ff44' : '#ff2244';
    ctx.fillStyle = color;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();
  }
  ```
- **Verified insertion points** (actual `Game.js` read during planning): `update(dt)` starts with `super.update()` → `_scoreSystem.update()` → `_reelPowerBar.update()` → layers → bubbles → player → enemies. Insert `_timerSystem.update(dt)` immediately after `super.update()`, then the freeze guard immediately after. Draw method order: `_scoreSystem.draw(...)` → `_reelPowerBar.draw(...)`. Insert `_timerSystem.draw()` and result overlay after `_reelPowerBar.draw(...)`.
- **Verified order in `update(dt)` after changes:**
  ```
  super.update()
  this._timerSystem.update(dt)              ← NEW
  if (this._gameResult !== null) return;    ← NEW freeze guard
  this._scoreSystem.update()
  this._reelPowerBar.update()
  ... rest unchanged
  ```
- **Add `destroy()` to `Game`** to remove the listener (prevents accumulation if Game is re-instantiated in tests or a future restart feature):
  ```js
  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_TIMER_TIMEUP, this._handleTimeUp);
    }
  }
  ```

**Definition of Done:**

- [ ] `Game._timerSystem` instantiated in constructor, `_handleTimeUp` registered on `document`
- [ ] `Game.update(dt)` calls `_timerSystem.update(dt)` BEFORE freeze guard; freeze guard returns early when `_gameResult !== null`
- [ ] `Game.draw()` calls `_timerSystem.draw()` and `_drawGameResult()` when `_gameResult !== null`
- [ ] `Game.destroy()` removes `EVENT_TIMER_TIMEUP` listener
- [ ] Verify: `npm test --silent` (0 failures)

---

### Task 5: Wire into `main.html`

**Objective:** Load `src/TimerSystem.js` in the browser before `src/Game.js`. (`index.js` wiring was done in Task 2 so that Jest tests have access to `TimerSystem` and constants as globals.)

**Files:**

- Modify: `main.html`

**Key Decisions / Notes:**

- `main.html` — add immediately after the `ScoreSystem.js` script tag (line 9):
  ```html
  <script src="src/TimerSystem.js?v=1"></script>
  ```
  Must be before `src/Game.js` (line 33) since `Game.js` references `TimerSystem`.
- `Trivial:` 1 new line in `main.html`, no branch/loop, pure wiring; covered by `npm test --silent` (full suite).

**Definition of Done:**

- [ ] `main.html` loads `src/TimerSystem.js` before `src/Game.js`
- [ ] `npm test --silent` passes (0 failures)

---

### Task 6: ADR 0017 — TimerSystem as a GameObject

**Objective:** Document the architectural decision to implement `TimerSystem` as a `GameObject` subclass and to decouple the timer from both score evaluation and game-result rendering via the `EVENT_TIMER_TIMEUP` custom event.

**Files:**

- Create: `docs/adr/0017-timer-system-game-object.md`

**Key Decisions / Notes:**

- ADR format: matches `docs/adr/0016-audio-system-decoupled-event-listener.md` — `# ADR NNNN — Title`, `**Date:**`, `**Status:** Accepted`, `## Context`, `## Decisions`, `## Consequences`.
- Cover four decisions:
  1. **`TimerSystem extends GameObject`** — timer participates in the game-world update/draw loop naturally; `_ctx` and `_size` come from `GameObject`, avoiding extra constructor params; using the existing `update(dt)` hook provides real delta-time without a separate `setInterval` or internal `Date.now()` call.
  2. **Emit `EVENT_TIMER_TIMEUP` rather than deciding win/loss internally** — `TimerSystem` knows nothing about score, enemies, or game rules; a single normalized event keeps time logic orthogonal to game-result logic; multiple listeners (analytics, audio, etc.) can react independently in the future.
  3. **`Game` owns win/loss resolution** — `Game` already holds references to `_scoreSystem` and `_timerSystem`; centralizing the end-state decision in `Game` prevents coupling `ScoreSystem` to `TimerSystem` or vice versa; the threshold constant `GAME_NEEDED_SCORE` lives in `constants.js` where game-balance tunables belong.
  4. **Game loop freezes on game-over** — `Game.update()` returns early (after `_timerSystem.update(dt)`) when `_gameResult` is set; `draw()` continues so the overlay remains visible; this is the minimum change needed to make the game "feel stopped" without introducing a separate game-state machine.
- Note pre-existing pattern: `ScoreSystem` and `AudioSystem` are standalone (not `GameObject`) because they are pure HUD/audio — no `draw()` to override, no `ctx` needed in constructor. `TimerSystem` differs: it actively draws to the canvas and needs `_ctx` + `_size` from `GameObject`.
- `Trivial:` Documentation-only file — no production code changes.

**Definition of Done:**

- [ ] `docs/adr/0017-timer-system-game-object.md` exists with all four decisions documented
- [ ] Verify: `ls docs/adr/0017-timer-system-game-object.md` exits 0
