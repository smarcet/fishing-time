# AudioSystem Implementation Plan

Created: 2026-06-16
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Introduce a decoupled `AudioSystem` class that listens to game events and plays SFX, plus three new Hook events (`enemyHooked`, `rodCasted`, `reelRetrieving`) that drive audio playback, plus an ADR documenting the design decision.

## Approach

**Chosen:** Event-listener pattern mirroring `ScoreSystem` — `AudioSystem` self-registers on `document` and calls `new Audio(src).play()` per event; `Hook` dispatches one-shot events via guard flags.
**Why:** Keeps audio fully decoupled from gameplay logic (same pattern ScoreSystem already established) at the cost of one extra class instantiated in `Game`.

## Context for Implementer

All game event constants live in `src/constants.js` and are loaded globally both in the browser (via `<script>` tags) and in Jest (via `index.js` which calls `Object.assign(global, _c)`). New constants follow the same pattern. The `Hook.update()` state machine transitions strictly between `IDLE → CAST → RETRIEVING_EMPTY → IDLE` or `IDLE → CAST → HOOKED → IDLE`; all event dispatches are anchored to those transition points. SFX paths must be relative to `main.html` (i.e., `sfx/bite.mp3`, not absolute filesystem paths), since the game runs from a local HTTP server (`python3 -m http.server 8000`).

## File Structure

- `src/constants.js` (modify) — add 3 new event constants + export them
- `src/Hook.js` (modify) — add `_hookedEventFired` flag + dispatch 3 new events
- `src/AudioSystem.js` (create) — event-driven audio playback class
- `src/Game.js` (modify) — instantiate `AudioSystem` in constructor
- `main.html` (modify) — add `<script src="src/AudioSystem.js">` tag
- `index.js` (modify) — export `AudioSystem` for Jest
- `__tests__/audio-system.test.js` (create) — unit tests for AudioSystem
- `__tests__/hook.test.js` (modify) — add event-dispatch tests to existing file
- `docs/adr/0016-audio-system-decoupled-event-listener.md` (create) — ADR

## Progress Tracking

- [x] Task 1: Add 3 event constants to constants.js
- [x] Task 2: Dispatch 3 new events in Hook.js
- [x] Task 3: Create AudioSystem.js
- [x] Task 4: Wire AudioSystem into game (Game.js, main.html, index.js)
- [x] Task 5: Write tests (AudioSystem + Hook events)
- [x] Task 6: Write ADR 0016

## Implementation Tasks

### Task 1: Add 3 event constants to constants.js

**Objective:** Add `EVENT_ENEMY_HOOKED`, `EVENT_ROD_CASTED`, and `EVENT_REEL_RETRIEVING` string constants to `src/constants.js` alongside the three existing event constants, and include them in `module.exports`.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add after line 107 (`EVENT_ENEMY_EVADED`) in the existing `// Game event names` block: `src/constants.js:104-107`
- Add all three to the `module.exports` object at the bottom alongside `EVENT_ENEMY_CAPTURED`, `EVENT_ENEMY_ESCAPED`, `EVENT_ENEMY_EVADED`
- `Trivial:` ≤ 6 net new lines, no branch/loop/try, no new public symbol beyond constants; verified by `npm test` (all existing tests continue to pass)

**Definition of Done:**

- [ ] `EVENT_ENEMY_HOOKED = 'enemyHooked'`, `EVENT_ROD_CASTED = 'rodCasted'`, `EVENT_REEL_RETRIEVING = 'reelRetrieving'` exist in constants.js and are exported
- [ ] Verify: `npm test -- --silent` passes with 0 failures

---

### Task 2: Dispatch 3 new events in Hook.js

**Objective:** Add one-shot event dispatch for `EVENT_ENEMY_HOOKED`, `EVENT_ROD_CASTED`, and `EVENT_REEL_RETRIEVING` to `Hook`. Each event fires exactly once per lifecycle transition, guarded by a flag or by transition structure.

**Files:**

- Modify: `src/Hook.js`

**Key Decisions / Notes:**

- Add `this._hookedEventFired = false` in the constructor (line 44 area, next to `_escapeParticles`)
- **EVENT_ROD_CASTED**: dispatch in `update()` at the `HOOK_STATUS_IDLE && spacePressed` branch (line 126), immediately after `this._status = HOOK_STATUS_CAST`. Fires once because `spacePressed` is a rising-edge signal (`spaceHeld && !_prevSpaceHeld`).
- **EVENT_ENEMY_HOOKED**: dispatch in `update()` at the top of the `HOOK_STATUS_HOOKED` block, inside the `isCatchableFishHooked()` branch, guarded by `!this._hookedEventFired`. Set flag to `true` immediately. Reset flag to `false` in both `clearCaptured()` and `setCatch()`.
- **EVENT_REEL_RETRIEVING**: dispatch in two places:
  - In `update()` when `atBottom` causes `HOOK_STATUS_CAST → HOOK_STATUS_RETRIEVING_EMPTY` (line 137 area). Status change is one-shot (next tick the branch is no longer entered), so no flag needed.
  - In `setCatch()` at the end, after `entity.captured(this)`. Called once per catch.
- All dispatches follow existing pattern: `if (typeof document !== 'undefined') { document.dispatchEvent(new CustomEvent(...)); }`

**Definition of Done:**

- [ ] `EVENT_ROD_CASTED` fires exactly once per cast press (rising-edge only)
- [ ] `EVENT_ENEMY_HOOKED` fires exactly once per CatchableFish hookup and does not repeat while the fish remains hooked
- [ ] `EVENT_REEL_RETRIEVING` fires once when hook reaches max depth (RETRIEVING_EMPTY) and once when `setCatch()` is called
- [ ] Verify: `npm test -- --silent` passes with 0 failures

---

### Task 3: Create AudioSystem.js

**Objective:** Create `src/AudioSystem.js` — a class that self-registers event listeners on `document` and plays the mapped SFX file for each game event using `new Audio(src).play()`. Mirrors the `ScoreSystem` class structure (constructor/destroy pattern, `typeof document` guard).

**Files:**

- Create: `src/AudioSystem.js`

**Key Decisions / Notes:**

- Event-to-SFX map (all 4 entries are user-specified in the initial request):
  - `EVENT_ENEMY_CAPTURED → 'sfx/bite.mp3'`  ← from user's "Mapeo inicial de sonidos"
  - `EVENT_ENEMY_HOOKED → 'sfx/bite.mp3'`
  - `EVENT_ROD_CASTED → 'sfx/cast.mp3'`
  - `EVENT_REEL_RETRIEVING → 'sfx/fishing-reel.mp3'`
- SFX paths are relative to `main.html` (HTTP-served root), NOT absolute filesystem paths
- `_play(src)` method: `if (typeof Audio === 'undefined') return;` guard for Jest compat; wrap `audio.play()` in `.catch(() => {})` to swallow browser autoplay-policy rejections silently
- Each handler is stored as `this._handleX = () => this._play(src)` so `destroy()` can remove the exact same function reference (same pattern as `ScoreSystem._handleCapture`)
- `destroy()` removes all 4 listeners — for symmetry with `ScoreSystem`
- Export with `if (typeof module !== 'undefined' && module.exports) { module.exports = { AudioSystem }; }`
- Uses `'use strict'` at top (same as ScoreSystem)

**Definition of Done:**

- [ ] `new AudioSystem()` registers 4 listeners without errors (no document/Audio available in Jest → guards handle it)
- [ ] `_play()` creates `new Audio(src)` and calls `.play()` when `Audio` is available
- [ ] `destroy()` removes all listeners so subsequent events produce no audio calls
- [ ] Verify: `npm test -- --silent` passes with 0 failures

---

### Task 4: Wire AudioSystem into game

**Objective:** Load `AudioSystem` in the browser (script tag in `main.html`), instantiate it in `Game` constructor, and export it from `index.js` so Jest tests can import it.

**Files:**

- Modify: `main.html`
- Modify: `src/Game.js`
- Modify: `index.js`

**Key Decisions / Notes:**

- `main.html`: add `<script src="src/AudioSystem.js?v=1"></script>` immediately after `src/constants.js?v=1` (line 7), so `EVENT_*` globals are guaranteed to be defined when `AudioSystem.js` loads
- `Game.js`: add `this._audioSystem = new AudioSystem();` in the constructor after `this._scoreSystem = new ScoreSystem();` (line 46). No update/draw calls needed — AudioSystem is purely event-driven.
- `index.js`: add `const { AudioSystem } = require('./src/AudioSystem'); global.AudioSystem = AudioSystem;` following the existing pattern, and include `AudioSystem` in `module.exports`

**Definition of Done:**

- [ ] `main.html` loads `AudioSystem.js` after constants and before any class that uses it
- [ ] `Game` constructor creates `this._audioSystem` without errors
- [ ] `require('../index.js').AudioSystem` resolves in Jest tests
- [ ] `sfx/bite.mp3`, `sfx/cast.mp3`, and `sfx/fishing-reel.mp3` exist in the repository (confirmed present — verified separately)
- [ ] Verify: `npm test -- --silent` passes with 0 failures

---

### Task 5: Write tests

**Objective:** Add unit tests for `AudioSystem` event-to-SFX mapping and `destroy()` behavior (`__tests__/audio-system.test.js`), and add Hook event-dispatch tests to the existing `__tests__/hook.test.js`.

**Files:**

- Create: `__tests__/audio-system.test.js`
- Modify: `__tests__/hook.test.js`

**Key Decisions / Notes:**

- **AudioSystem tests** — mock `global.Audio` as `jest.fn(() => ({ play: jest.fn().mockResolvedValue(undefined) }))` in `beforeEach`. Tests call handler directly (e.g. `audioSystem._handleCapture({})`) to avoid DOM event coupling. Four mapping tests + one destroy test.
- **Hook event tests** — add a new `describe('Hook event dispatching', ...)` block at the bottom of `hook.test.js`. Use real `document.addEventListener`/`removeEventListener` with `jest.fn()` handlers. `castHook()` is already defined in `hook.test.js:98-103` (sets up rising-edge space press and calls `hook.update(16)`). Test:
  1. `EVENT_ROD_CASTED` fires once per `castHook()` call
  2. `EVENT_ENEMY_HOOKED` fires once and not again on a second `update()` tick with the same fish
  3. `EVENT_REEL_RETRIEVING` fires once in `setCatch()` (for both InertObject and CatchableFish) and once on CAST→RETRIEVING_EMPTY transition
- Always clean up listeners in `afterEach` or inline `removeEventListener` to avoid test interference
- No new test file for Hook — the existing `hook.test.js` is the unit test class for `Hook`

**Definition of Done:**

- [ ] AudioSystem: 5 tests pass — 4 mapping tests (captured/hooked/casted/reel) + 1 destroy test
- [ ] Hook: `EVENT_ROD_CASTED` fires exactly 1 time per cast
- [ ] Hook: `EVENT_ENEMY_HOOKED` fires exactly 1 time even after multiple `update()` ticks
- [ ] Hook: `EVENT_REEL_RETRIEVING` fires once on `setCatch()` and once on bottom-of-cast transition
- [ ] Verify: `npm test -- --silent` passes with 0 failures (no regressions)

---

### Task 6: Write ADR 0016

**Objective:** Create `docs/adr/0016-audio-system-decoupled-event-listener.md` documenting the decision to introduce `AudioSystem` as a standalone event-driven class rather than embedding SFX calls inside `Hook`, `Game`, or `ScoreSystem`.

**Files:**

- Create: `docs/adr/0016-audio-system-decoupled-event-listener.md`

**Key Decisions / Notes:**

- Follow the ADR format of existing ADRs 0001–0015: title, date, status, Context, Decisions (numbered subsections), Consequences
- `Trivial:` documentation-only; no production code change; verified by inspection

**Definition of Done:**

- [ ] ADR exists at the correct path and number (0016)
- [ ] ADR covers: why decoupled (single responsibility, no SFX in gameplay logic), why `document` events (already established by ScoreSystem), why `new Audio()` per event (simplest browser-native approach), alternatives considered (direct calls from Hook, Web Audio API)
- [ ] Verify: `npm test -- --silent` passes with 0 failures (no code change, test suite unaffected)
