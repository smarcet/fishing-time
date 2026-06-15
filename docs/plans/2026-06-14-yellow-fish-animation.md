# Yellow Fish Animation Fix Plan

Created: 2026-06-14
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: No
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom (user, ES):** "la animacion del pez amarillo … no se da vuelta automaticamente y la animacion no es smooth ademas a veces aparece por encima del agua."

Three distinct defects in the yellow fish (`fish1_sprite`):

1. **No auto-flip** — the fish never mirrors when it changes direction. After bouncing off the right wall it swims left but the sprite keeps facing right (swimming backwards).
2. **Not smooth** — the swim animation flickers (advances a sprite frame every single tick).
3. **Above the water** — fish sometimes spawn in the sky band, above the water surface line.

## Behavior Contract

| # | Currently (bug) | Expected (fix) |
|---|-----------------|----------------|
| 1 | `EnemyWithAnimation.draw()` (`index.js:242`) renders the frame with **no `_direction` flip**; a fish with `_direction === -1` still faces right. | When `_direction === -1`, `draw()` applies `ctx.scale(-1, 1)` so the sprite faces left (same pattern as `Octopus.draw()` `index.js:376`). When `_direction !== -1`, `scale(1, 1)`. |
| 2 | Fish are plain `EnemyWithAnimation` with `_staggerFrame = 1` (`index.js:176`) → `_frameX` advances **every tick** → rapid flicker. | Fish advance `_frameX` once per `ANIM_STAGGER_SLOW` (6) ticks (same cadence as octopus/bottle) → `_frameX` stays 0 for 5 updates, becomes 1 on the 6th. |
| 3 | Spawn `y = Math.random() * (H - 200) + 200` (`index.js:723`) → `y ∈ [200, H)`; the `[200, 300)` band is **above** the water surface (`y = 300`). | Spawn `y ∈ [WATER_SURFACE_Y, H − fishHeight]` so the whole fish is at/below the water line and fully on-canvas. |

## Investigation

**Water-surface line.** The codebase treats `y = 300` (canvas coords) as the water surface: octopus spawns at `Point(0, 300)` (`index.js:691`), trash spawns at `Point(0, 300)` (`index.js:747`), and bubbles pop when they rise to `y <= 300` (`index.js:790`). The background is stretched to fill the canvas (`index.js:813`), and its painted water line sits at ~30% height — matching `y = 300` on the ~1000px window this game targets. So entities are meant to live **below** `y = 300`.

**Root causes (all three traced to file:line):**

- **Bug 1 — `index.js:242-254`:** `EnemyWithAnimation.draw()` calls `drawImage(image, frameX*w, frameY*h, …)` with no save/scale/translate. `_direction` is correctly maintained by `Enemy.update()` (`index.js:134-141`: `-1` at right wall, `+1` at left wall) but `draw()` ignores it. `Octopus.draw()` already shows the correct flip (`flipX = _direction === -1 ? -1 : 1`, `index.js:376-382`).
- **Bug 2 — `index.js:176`:** the `EnemyWithAnimation` constructor default `_staggerFrame = 1`. `Trash` (`index.js:261`) and `Octopus` (`index.js:330`) override it to `ANIM_STAGGER_SLOW`; the fish (constructed inline as a plain `EnemyWithAnimation`, `index.js:724-735`) never do, so they animate at 1 tick/frame.
- **Bug 3 — `index.js:723`:** `Math.random() * (this._size.getHeight() - 200) + 200` has a minimum of `200 < 300 = WATER_SURFACE_Y`.

The sprite slicing itself is correct: `fish1_sprite.png` is 1000×246 = a 10×3 grid of 100×82 cells, exactly matching the display `Size(82, 100)` (`Size(h, w)`), with `maxFrameX = 10`. Only the top row animates (`maxFrameY` undefined → `_frameY` stays 0), which is correct — the bottom row is partially empty. **No slicing change is needed.**

## Design — fix at source via a `Fish` subclass (ADR-0002 convention)

The project's established pattern (ADR-0002) is one subclass per animated enemy that sets its own cadence and a direction-aware `draw()` — exactly what `Trash` and `Octopus` do. Following that convention (rather than special-casing the base class) keeps `EnemyWithAnimation` pristine and makes all three fixes unit-testable through an exported type.

**New constants (next to `index.js:8-22`):**

```js
const WATER_SURFACE_Y   = 300;  // px - y of the water surface; entities spawn at or below this line
const FISH_FRAME_WIDTH  = 100;  // px - fish spritesheet cell width (= render width)
const FISH_FRAME_HEIGHT = 82;   // px - fish spritesheet cell height (= render height)
```

**New `Fish extends EnemyWithAnimation` class:**

```js
class Fish extends EnemyWithAnimation {
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._staggerFrame = ANIM_STAGGER_SLOW;   // Bug 2: smooth cadence
  }

  // Bug 3: spawn fully below the water line and inside the canvas.
  static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
    const minY = WATER_SURFACE_Y;
    const maxY = canvasHeight - fishHeight;
    return minY + rng() * (maxY - minY);
  }

  draw() {                                     // Bug 1: Octopus-style horizontal flip
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === 'CAPTURED') {         // draw current frame at the hook (no NaN dieFrame, no flip)
      this._ctx.drawImage(this._image, this._frameX * w, 0, w, h,
        this._hook.getPosition().getX(), this._hook.getPosition().getY(), w, h);
      return;
    }

    if (this._game.isDebug()) { /* same debug readout as EnemyWithAnimation.draw() */ }

    const flipX = this._direction === -1 ? -1 : 1;
    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, this._frameX * w, this._frameY * h, w, h, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}
```

**Game constructor spawn (`index.js:721-736`)** — swap `new EnemyWithAnimation(...)` for `new Fish(...)` and use the helper for Y:

```js
for (let i = 0; i < 5; i++) {
  this._enemies.push(new Fish(
    this, ctx,
    new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
    new Point(0, Fish.randomSpawnY(this._size.getHeight(), FISH_FRAME_HEIGHT)),
    document.getElementById('fish1_sprite'),
    10
  ));
}
```

**Export `Fish`** in `module.exports` (`index.js:893`).

> **Incidental correctness note (in-scope, inside the new `draw()`):** today a captured plain-`EnemyWithAnimation` fish renders with `dieFrameX*w` where `dieFrameX` is `undefined` → `NaN` source coords. `Fish.draw()`'s CAPTURED branch draws the current frame instead — verified visually in the browser when catching a fish.

**Untouched:** `Enemy`, base `EnemyWithAnimation`, `Trash`, `Octopus`, `Hook`, `Player`, collision/catch flow. The three literal `300`s elsewhere (octopus/trash spawn, bubble pop) are left as-is — out of scope for this fix (mentioned, not refactored).

## Progress Tracking

- [x] **Task 1: Write Reproducing Test (RED).** New `__tests__/fish.test.js` (one unit test class, mirrors `__tests__/octopus.test.js`). Assertions encoding the Behavior Contract: (a) **stagger** — `_frameX` stays 0 for the first 5 updates, becomes 1 on the 6th; (b) **flip** — spy `ctx.scale`; a left-moving fish (`_direction === -1`) `draw()` records `scale(-1, 1)`, a right-moving fish records `scale(1, 1)`; (c) **spawn** — `Fish.randomSpawnY(H, FISH_FRAME_HEIGHT, () => 0) === WATER_SURFACE_Y` and `Fish.randomSpawnY(H, FISH_FRAME_HEIGHT, () => 0.999) <= H - FISH_FRAME_HEIGHT`; (d) `Fish instanceof EnemyWithAnimation`. Run → **must FAIL** (`Fish` undefined).
  - Files: `__tests__/fish.test.js`
  - Verify: `npm test` shows the new fish tests failing, all existing green.
- [x] **Task 2: Implement Fix at Root Cause (GREEN).** Add the 3 constants; add `Fish` class (stagger + `randomSpawnY` + flipped `draw()`); swap the Game fish-spawn loop to `new Fish(...)` + `Fish.randomSpawnY(...)`; export `Fish`.
  - Files: `index.js`
  - Verify: `npm test` — `__tests__/fish.test.js` green; octopus (10) + trash (13) + hook (16) unchanged and green.
- [x] **Task 3: Quality Gate.** Run the full suite (0 failures). Serve and browser-verify (Chrome DevTools MCP).
  - Files: none (runner only)
  - Verify: `npm test` all green + browser E2E (below).

## Definition of Done

- `__tests__/fish.test.js`: stagger cadence, direction-flip in `draw()`, spawn-below-water boundaries, and inheritance all pass; the one-character-bug check holds (stagger=1 → frameX=1 after tick 1 → the cadence assertion fails; old spawn min 200 < 300 → the spawn assertion fails).
- All existing tests pass unchanged (octopus, trash, hook). `Fish` added to `module.exports` is additive.
- Browser E2E confirms all three user-reported behaviors are fixed.

## Verification Scenario (browser — MANDATORY, UI change)

```bash
python3 -m http.server 8000   # then open http://localhost:8000/main.html
```

Using Chrome DevTools MCP:
1. **Smooth (Bug 2):** the yellow fish swim with a steady, non-flickering frame cadence (visibly slower than the old per-tick flicker).
2. **Auto-flip (Bug 1):** let a fish reach the right wall — it mirrors to face left while swimming left, and faces right while swimming right. No backwards swimming.
3. **Below water (Bug 3):** reload several times; all 5 fish appear within the water (below the wavy surface line), never in the sky band.
4. **No regression:** catch a fish on a cast — it is captured and reeled up correctly; octopus and bottle still animate; boat still moves with Left/Right.

## Risks

| Risk | Mitigation |
|------|------------|
| `scale(-1,1)` flips the sprite the *wrong* way (faces left when going right) | One-line sign flip on `flipX`; confirmed visually in Task 3. Mirrors the proven `Octopus.draw()` sign convention. |
| `ANIM_STAGGER_SLOW` too slow/fast for fish feel | Reuses the same constant octopus/bottle already use successfully; tunable without structural change. |
| Captured-fish render changes (NaN dieFrame → current frame) | Browser-verified in Task 3; strictly better than the prior NaN behavior; isolated to `Fish.draw()`'s CAPTURED branch. |
| `randomSpawnY` range collapses on a very short canvas (`H - 82 < 300`) | Not reachable — the game canvas is the full window height (≥ 600 in practice); no guard added (per "don't validate impossible inputs"). |

## Out of Scope

- Refactoring the three other literal `300`s (octopus/trash spawn, bubble pop) to `WATER_SURFACE_Y`.
- Changing fish drift speed, horizontal motion, or the swim spritesheet rows used.
- Any change to octopus, bottle, hook, player, collision, or score behavior.
