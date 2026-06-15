# Fix Horizontal and Vertical Scroll Bars Fix Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

> Investigating bug...

## Summary

**Symptom:** Horizontal and vertical scroll bars appear in the browser when the game runs.
**Trigger:** Any time `main.html` is loaded.
**Root Cause:** `main.css:7-13` — `#canvas1` uses `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)`. CSS `transform` shifts the painted element visually but does **not** move its layout box. The layout box's origin stays at `left: 50vw, top: 50vh` and its right/bottom edges extend to `1.5 × viewport` in both dimensions. Because `html` and `body` have no `overflow: hidden`, browsers create scroll bars to accommodate the overflowing layout box.

## Investigation

- `main.css`: `#canvas1 { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) }`.
- The CSS `transform` property moves the **paint** of the element, not its **layout box**. The layout box remains at `left = 50vw`, so its right edge is at `50vw + 100vw = 150vw`. Same for vertical.
- `html` and `body` have no `overflow` rule — they default to `overflow: visible`, which on the root element causes scroll bars when content overflows.
- The canvas is already sized to `window.innerWidth × window.innerHeight` in `src/main.js:4-5`, so centering via `transform` is redundant — the canvas already fills the viewport. The simplest fix is to suppress overflow on `html, body`.
- No recent changes to `main.css` are responsible; this was a latent issue since the first commit.

## Behavior Contract

**Given:** Browser loads `main.html` at any window size.
**When:** The page renders with `#canvas1` sized to the full viewport.
**Currently (bug):** Horizontal and vertical scroll bars appear because the canvas layout box overflows `1.5 × viewport` in both dimensions.
**Expected (fix):** No scroll bars. The viewport is fully covered by the canvas with no scrollable area.
**Anti-regression:** `test_css_body_has_overflow_hidden` (new); existing 79 Jest tests (game logic unchanged).

## Fix Approach

**Chosen:** Add `overflow: hidden` to `html, body` in `main.css`.
**Why:** Single targeted CSS rule that eliminates the scroll area without changing any game logic, canvas size, or visual layout. The canvas already fills the window — hiding overflow just discards the phantom layout-box overhang.

**Files:** `main.css`
**Strategy:** Add a `html, body { overflow: hidden; }` block to `main.css`. No JS or HTML changes needed.
**Tests:** `__tests__/css.test.js` (new file — reads `main.css` and asserts `overflow: hidden` is present on `html` or `body`).
**Defense-in-depth:** n/a — this is an isolated CSS-only fix with no cross-component propagation.

## Verification Scenario

### TS-001: Scroll Bars Eliminated on Game Load

**Preconditions:** HTTP server running on port 8081 (`yarn dev`). Browser opened at `http://localhost:8081/main.html`.

| Step | Action | Expected Result (after fix) |
|------|--------|-----------------------------|
| 1 | Load `http://localhost:8081/main.html` | Page renders — no horizontal or vertical scroll bars visible |
| 2 | Resize the browser window | Canvas resizes to fill window, still no scroll bars |

## Tasks

> Always 3 tasks below.

- [x] Task 1: Write Reproducing Test (RED)
- [x] Task 2: Implement Fix at Root Cause
- [x] Task 3: Quality Gate

### Task 1: Write Reproducing Test (RED)

**Objective:** Encode the Behavior Contract as a failing test BEFORE writing any fix code.

**Files:**

- Test: `__tests__/css.test.js` (new file)

**Key Decisions / Notes:**

- Entry point: reads `main.css` from disk via `fs.readFileSync` and asserts `overflow: hidden` is declared on `html` or `body`.
- Test name: `test_css_body_html_overflow_hidden_prevents_scrollbars`

**Definition of Done:**

- [ ] Test exists and is named `test_css_body_html_overflow_hidden_prevents_scrollbars`.
- [ ] Test fails because `main.css` currently has no `overflow: hidden` on `html` or `body`.
- [ ] Verify: `npm test -- --testPathPattern=css --no-coverage` (must FAIL)

### Task 2: Implement Fix at Root Cause

**Objective:** Add `overflow: hidden` to `html, body` in `main.css` so the reproducing test passes.

**Files:**

- Modify: `main.css`

**Key Decisions / Notes:**

- Add `html, body { overflow: hidden; }` at the top of `main.css`, immediately after the `* {}` reset block.
- No JS or HTML changes — purely CSS.

**Definition of Done:**

- [ ] Reproducing test passes.
- [ ] No scroll bars appear when `main.html` is loaded in a browser.
- [ ] Verify: `npm test -- --testPathPattern=css --no-coverage` (must PASS)

### Task 3: Quality Gate

**Objective:** Full suite green, lint clean, no regressions.

**Files:**

- No production files expected; update plan progress and status.

**Key Decisions / Notes:**

- No type checker or build step for this vanilla JS project.

**Definition of Done:**

- [ ] Full suite green (all 80 tests: 79 existing + 1 new CSS test).
- [ ] Verify: `npm test`
