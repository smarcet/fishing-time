# Parallax Background Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the static `game_background_4.png` background in the main game with the multi-layer parallax background from `parallax.html`, making clouds scroll slowly and ocean waves slightly faster while all other layers remain fixed — giving the game scene depth and life.

## Approach

**Chosen:** Port `Layer` class from `index2.js` into `index.js` and wire it into `Game`.
**Why:** The parallax prototype already has working, tested visuals in `parallax.html`/`index2.js`. Porting the 29-line `Layer` class and wiring its `update()`/`draw()` into `Game.update()` and `Game.draw()` is the minimal change; no new files, no external dependencies.

## Context for Implementer

The game uses the DOM-preload pattern: all images must be declared as hidden `<img>` elements in `main.html` before `index.js` references them via `document.getElementById()`. The hidden-sprite CSS rule in `main.css` lists every sprite ID explicitly — new IDs must be added there too. Layer images live in `images/backgrounds/game_background_4/layers/` and use the same IDs as `parallax.html` (`sky`, `cloud`, `ocean`, `ocean1`, `ocean2`, `ground`, `ground2`, `ground3`).

## Progress Tracking

- [x] Task 1: HTML + CSS — add layer image elements, remove static background
- [x] Task 2: JS — add Layer class and wire into Game

## Implementation Tasks

### Task 1: HTML + CSS — add layer image elements, remove static background

**Objective:** Prepare `main.html` with the 8 parallax layer `<img>` tags and update `main.css` so they are hidden from the DOM display. Remove the now-redundant `<img id="background">` element and its CSS entry.

**Files:**

- Modify: `main.html`
- Modify: `main.css`

**Key Decisions / Notes:**

- Add the 8 `<img>` tags in the same order as `parallax.html` (sky → cloud → ocean → ocean1 → ocean2 → ground → ground2 → ground3). Keeping the same IDs avoids ID renaming in the JS layer.
- Remove `<img src="images/backgrounds/game_background_4.png" id="background"/>` — it is replaced by the layers.
- In `main.css`, drop `#background` from the hidden-sprite selector and append the 8 new layer IDs (`#sky, #cloud, #ocean, #ocean1, #ocean2, #ground, #ground2, #ground3`).

**Definition of Done:**

- [ ] `main.html` contains exactly 8 new layer `<img>` elements and no `id="background"` element.
- [ ] `main.css` hidden-sprite selector includes all 8 new IDs and no longer lists `#background`.
- [ ] Verify: open game in browser — no "Failed to load resource" errors for any layer image in DevTools console.

### Task 2: JS — add Layer class and wire into Game

**Objective:** Add the `Layer` class (ported from `index2.js`) to `index.js`, create a `_layers` array in `Game`, tick layers in `Game.update()`, and replace the single static `drawImage` call in `Game.draw()` with the layered draw — putting the layers first so all game entities render on top.

**Files:**

- Modify: `index.js`

**Key Decisions / Notes:**

- Add `const PARALLAX_GAME_SPEED = 5;` to the constants block at the top of `index.js` (matches `gameSpeed = 5` from `index2.js`).
- Place the `Layer` class definition just above the `Game` class.
- Layer constructor signature: `(image, width, height, speedModifier)` — identical to `index2.js`.
- In `Game` constructor, after `super(ctx, size)`, add:
  ```js
  const w = this._size.getWidth();
  const h = this._size.getHeight();
  this._layers = [
    new Layer(document.getElementById('sky'),    w, h, 0.0),
    new Layer(document.getElementById('cloud'),  w, h, 0.1),
    new Layer(document.getElementById('ocean'),  w, h, 0.2),
    new Layer(document.getElementById('ocean1'), w, h, 0.0),
    new Layer(document.getElementById('ocean2'), w, h, 0.0),
    new Layer(document.getElementById('ground'), w, h, 0.0),
    new Layer(document.getElementById('ground2'),w, h, 0.0),
    new Layer(document.getElementById('ground3'),w, h, 0.0),
  ];
  ```
- In `Game.update()`, add `this._layers.forEach(l => l.update());` at the top of the method body.
- In `Game.draw()`, replace `ctx.drawImage(document.getElementById("background"), ...)` (line 910) with `this._layers.forEach(l => l.draw(this._ctx));`. Game entities (`_player`, `_enemies`, `_bubbles`) draw afterwards — no change needed to entity draw order.
- `Layer.update()` for static layers (speedModifier=0.0): speed is 0, `this.x` stays 0 forever. No wrap needed but the wrap guard `if (this.x <= -this.width) this.x = 0` is harmless.
- `Layer.draw()` draws the image twice: at `(this.x, 0)` and `(this.x + width, 0)`. For static layers, second copy is at `(width, 0)` — off-screen, harmless.
- `index.js` is CommonJS-dual (browser + Jest via `module.exports`). The `Layer` class does NOT need to be exported — it is only used by `Game` internally and has no unit-testable logic (pure canvas API calls). Do NOT add it to `module.exports`.

**Definition of Done:**

- [ ] `index.js` has a `Layer` class and a `PARALLAX_GAME_SPEED` constant.
- [ ] `Game` constructor initialises `this._layers` with all 8 layers.
- [ ] `Game.update()` ticks each layer.
- [ ] `Game.draw()` draws layers before entities (no static background `drawImage` remains referencing `#background`).
- [ ] `npm test` passes (60 tests, 0 failures) — no regressions in game logic.
- [ ] Verify: browser shows scrolling cloud and ocean layers while sky and seabed remain fixed; player, fish, hook, bubbles render on top of all background layers.

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | PASS   | 0            | All layers render; cloud scrolls; ocean scrolls faster; rope/hook draw in front; reel-in clean |

## E2E Test Scenarios

### TS-001: Parallax background renders on game load
**Priority:** Critical
**Preconditions:** Game served locally (`python3 -m http.server 8000`), opened at `http://localhost:8000/main.html`
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `http://localhost:8000/main.html` | Game canvas fills the viewport; sky, ocean, and ground layers are all visible; no console errors |
| 2 | Wait 3 seconds | Cloud layer visibly moves left across the scene; ocean layer moves left slightly faster; sky and seabed remain stationary |
| 3 | Press SPACE to cast hook | Player casts, rope and hook render in front of all background layers |
| 4 | Release SPACE | Hook reels in; background continues scrolling without artefacts |
