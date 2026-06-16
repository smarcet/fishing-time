# Score System Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `ScoreSystem` class that listens to the existing `enemyCaptured` and `enemyEscaped` DOM events, maintains a running score (positive or negative), renders it in the top-right corner of the canvas each frame, and is wired into `Game.js`.

---

## Approach

**Chosen:** New `src/ScoreSystem.js` wired into `Game.constructor()` and `Game.draw()`.

**Why:** The existing event system (`Hook.js:66` `enemyCaptured`, `Hook.js:141` `enemyEscaped`) is the correct decoupling point — `ScoreSystem` subscribes once and never touches game internals. Rendering in `Game.draw()` (last call) guarantees the HUD is always on top of all sprites. No base-class extension needed; `ScoreSystem` is a pure UI/state class.

---

## Context for Implementer

`enemyCaptured` fires with `detail: { enemyType: <ClassName>, x, y }` and `enemyEscaped` fires with `detail: { enemyType: <ClassName> }`. The `enemyType` field is the JS class constructor name (`"Tuna"`, `"DiscardedBottle"`, etc.) — NOT the FISH_SPECS snake_case key. The `SCORE_MAP` must therefore use constructor names as keys.

Escape deduction formula: `score -= Math.floor(pts / 2)` where `pts = SCORE_MAP[enemyType]`. For negative-value enemies (DiscardedBottle, -20) this evaluates to `score -= -10` (i.e., a small gain if the trash falls off the hook). Score has no floor — it can go negative.

Canvas rendering must use `ctx.save()/restore()` so it doesn't pollute the game's global context state (fillStyle, font, textAlign, etc.).

---

## Runtime Environment

```bash
python3 -m http.server 8000   # then open http://localhost:8000/main.html
npm test                       # Jest unit tests (no browser required)
```

---

## Progress Tracking

Done: 5 / Left: 0

- [x] Task 1: ScoreSystem class + unit tests
- [x] Task 2: Wire into Game.js, main.html, index.js
- [x] Task 3: Score persistence + high-score tracking (localStorage)
- [x] Task 4: Score animations (floating "+N" text on capture/escape)
- [x] Task 5: Time-limit deduction (enemyEvaded event for off-screen fish)

---

## Implementation Tasks

### Task 1: ScoreSystem class + unit tests

**Objective:** Create `src/ScoreSystem.js` with the `SCORE_MAP` constant and `ScoreSystem` class. The class listens to `enemyCaptured`/`enemyEscaped` on `document`, updates `this._score`, and draws the current score in the top-right corner of the canvas.

**Files:**

- Create: `src/ScoreSystem.js`
- Create: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- `SCORE_MAP` keyed by JS class name (constructor.name), not FISH_SPECS snake_case:
  ```js
  const SCORE_MAP = {
    ButterflyFish:   10,
    LionFish:        20,
    Octopus:         15,
    Crab:            30,
    HammerHeadShark: 50,
    SwordFish:       80,
    Tuna:           100,
    DiscardedBottle: -20,
  };
  ```
- Constructor guards `typeof document !== 'undefined'` before calling `addEventListener` (same pattern as `src/EnemyFactory.js:64`) — keeps the class unit-testable in the Jest node environment.
- Bind handlers as arrow properties so `removeEventListener` works correctly (named references required):
  ```js
  this._handleCapture = (e) => { ... };
  this._handleEscape  = (e) => { ... };
  ```
- Unknown `enemyType` (not in `SCORE_MAP`) is silently ignored — no crash.
- `draw(ctx, canvasWidth)`: render `"Score: N"` at `(canvasWidth - 20, 40)` using `ctx.textAlign = 'right'`; white fill + black stroke (3 px) for legibility over any background. Use `ctx.save()/restore()`.
- Test pattern: call `scoreSystem._handleCapture({ detail: { enemyType: 'Tuna' } })` directly (no DOM needed in tests).

**Definition of Done:**

- [x] `SCORE_MAP.Tuna === 100`, `SCORE_MAP.DiscardedBottle === -20`
- [x] Capture increments score by `SCORE_MAP[enemyType]`; escape deducts `Math.floor(pts/2)`
- [x] Score starts at 0 and can go negative
- [x] Unknown enemyType silently ignored (score unchanged)
- [x] `draw()` calls `ctx.fillText` with the correct score string
- [x] Verify: `npm test -- --testPathPattern=score-system`

---

### Task 2: Wire ScoreSystem into Game.js, main.html, index.js

**Objective:** Instantiate `ScoreSystem` in `Game.constructor()` and call `this._scoreSystem.draw()` as the last call in `Game.draw()` so the score HUD renders above all game sprites. Add the script tag to `main.html` and require it in `index.js` for Jest.

**Files:**

- Modify: `src/Game.js`
- Modify: `main.html`
- Modify: `index.js`

**Key Decisions / Notes:**

- `Game.constructor()`: add `this._scoreSystem = new ScoreSystem();` after `this._inputHandler = new InputHandler(this);` (line 42).
- `Game.draw()`: add `this._scoreSystem.draw(this._ctx, this._size.getWidth());` as the last line (after bubbles draw, before the closing brace) so the HUD is always rendered on top.
- `main.html`: add `<script src="src/ScoreSystem.js"></script>` after `<script src="src/constants.js">` and before `<script src="src/Size.js">` — no upstream dependencies; `SCORE_MAP` is self-contained.
- `index.js`: add `const { ScoreSystem, SCORE_MAP } = require('./src/ScoreSystem'); global.ScoreSystem = ScoreSystem; global.SCORE_MAP = SCORE_MAP;` after the constants require.
- `Trivial:` No — touches 3 existing files and depends on Task 1 being wired.

**Definition of Done:**

- [x] `game._scoreSystem` exists (instanceof ScoreSystem) after Game construction
- [x] `game.draw()` calls `scoreSystem.draw(ctx, width)` (verified by `npm test` mock spy)
- [x] `npm test` passes: 0 failures across all 158 tests
- [x] Browser: "Score: 0" visible in top-right corner of `http://localhost:8000/main.html`
- [x] Verify: `npm test -- --silent` → 0 failures; `python3 -m http.server 8000` + browser visual check

---

## Goal Verification

### Truths

1. Score starts at 0, increments by the enemy's `SCORE_MAP` value on each `enemyCaptured` event, and decrements by `floor(pts/2)` on each `enemyEscaped` event — verified by unit tests.
2. The current score is rendered in the top-right corner of the canvas every frame, readable over any background (white fill + black stroke).

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `ctx.textAlign = 'right'` leaks into subsequent draws | Medium | Visual glitch | `ctx.save()/restore()` in `draw()` |
| `ScoreSystem` constructor throws in Jest node env (no `document`) | Medium | Test crash | `typeof document !== 'undefined'` guard before `addEventListener` |

---

---

### Task 3: Score persistence + high-score tracking

**Objective:** Persist `_score` and `_highScore` to `localStorage`. On construction read them back. Update `_highScore` whenever `_score` exceeds it. Render "Best: N" below "Score: N" in the HUD.

**Files:** `src/ScoreSystem.js`, `__tests__/score-system.test.js`

**Key Decisions:**
- Keys: `fishingTime_score`, `fishingTime_highScore`
- Guard all `localStorage` access with `typeof localStorage !== 'undefined'` for Jest compat
- `_highScore` updates after every score change (capture AND escape)
- HUD: two lines — "Score: N" at y=40, "Best: N" at y=65 (same x, same style)

**Definition of Done:**
- [ ] Score and high-score survive page reload (localStorage read on init)
- [ ] `_highScore` is always >= `_score` max seen
- [ ] "Best: N" rendered below "Score: N" in HUD
- [ ] Tests: localStorage read/write in constructor + handlers

---

### Task 4: Score animations (floating "+N" text)

**Objective:** When `enemyCaptured` fires, spawn a floating "+N" (or "-N" for negative) text at the fish's capture position that rises and fades over 60 frames.

**Files:** `src/ScoreSystem.js`, `src/Game.js`, `__tests__/score-system.test.js`

**Key Decisions:**
- `this._animations = []` — array of `{ text, x, y, alpha, vy }` objects
- `_handleCapture` uses `e.detail.x, e.detail.y` (already in the event) to spawn animation
- `update()` method: advance each animation (y += vy, alpha -= 1/60), remove when alpha <= 0
- `draw()` renders animations with `ctx.globalAlpha` set, font "bold 20px monospace"
- Game.js: call `this._scoreSystem.update()` in `Game.update()` before entities
- No animation on `enemyEscaped` (hook position not in event detail)

**Definition of Done:**
- [ ] Floating "+N"/"-N" text appears at capture position
- [ ] Text rises and fades over ~1 second (60 frames)
- [ ] `update()` correctly advances and removes expired animations
- [ ] `Game.update()` calls `this._scoreSystem.update()`
- [ ] Tests: `update()` advances alpha; expired animations removed

---

### Task 5: Time-limit deduction (evaded fish)

**Objective:** Dispatch `enemyEvaded` from `Game.update()` for enemies that swim off-screen without being hooked. `ScoreSystem` listens and deducts `Math.floor(pts / 4)` for positive-value enemies (negative-value enemies escaping offscreen give no reward/penalty).

**Files:** `src/Game.js`, `src/ScoreSystem.js`, `__tests__/score-system.test.js`

**Key Decisions:**
- In `Game.update()` BEFORE the filter: collect `this._enemies.filter(f => f.isOffScreen() && !f.isCaptured())`, dispatch `enemyEvaded` for each: `{ enemyType: e.constructor.name }`
- `_handleEvade`: `if (pts > 0) this._score -= Math.floor(pts / 4)`  (negative enemies ignored)
- No animation for evaded fish (no known position)
- Deduction persisted to localStorage same as other changes

**Definition of Done:**
- [ ] `enemyEvaded` dispatched for each off-screen enemy in Game.update()
- [ ] Score deducts `Math.floor(pts/4)` for positive-value enemies
- [ ] Negative-value enemies (DiscardedBottle) evading causes no score change
- [ ] Tests: `_handleEvade` deducts correctly

---

## Out of Scope

- Time-limit as a global game countdown (no overall game timer added)
