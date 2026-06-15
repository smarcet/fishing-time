# ADR 0006 — Multi-Layer Parallax Background

**Date:** 2026-06-15
**Status:** Accepted

## Context

The game previously drew a single static PNG (`game_background_4.png`) as the background each frame. This produced a flat, lifeless scene. A parallax prototype already existed in `parallax.html` / `index2.js` that scrolled eight layered images at different speeds to create depth.

The goal was to port that prototype into the main game (`main.html` / `index.js`) with minimal structural change.

## Decisions

**1. Port the `Layer` class verbatim from the prototype, with one cleanup.**

The prototype's `Layer` class was copied into `index.js` just above `class Game`. The only change: the redundant `this.speed = PARALLAX_GAME_SPEED * this.speedModifier` assignment was removed from `update()` because `PARALLAX_GAME_SPEED` is a `const` (not a `let` as in the prototype), making the recomputation a no-op. The constructor already stores the correct value.

**2. DOM-preload pattern: 8 hidden `<img>` tags in `main.html`.**

The existing game relies on the browser pre-loading all sprites as hidden `<img>` elements in `main.html` before `index.js` references them via `document.getElementById()`. The 8 layer images follow the same pattern. The `#background` element was removed and replaced with:

| DOM id | File | Speed modifier |
|--------|------|---------------|
| `sky` | `layers/sky.png` | 0.0 (static) |
| `cloud` | `layers/cloud.png` | 0.1 (~0.5 px/tick) |
| `ocean` | `layers/ocean.png` | 0.2 (~1 px/tick) |
| `ocean1` | `layers/bg_ocean.png` | 0.0 (static) |
| `ocean2` | `layers/bg_ocean_2.png` | 0.0 (static) |
| `ground` | `layers/dec_ground.png` | 0.0 (static) |
| `ground2` | `layers/dec_ocean.png` | 0.0 (static) |
| `ground3` | `layers/ground.png` | 0.0 (static) |

**3. `PARALLAX_GAME_SPEED = 5` added to the constants block.**

Matches the `gameSpeed = 5` value from the prototype. Lives alongside the other game-speed constants at the top of `index.js`.

**4. `Layer` is NOT exported from `module.exports`.**

`Layer` is an internal rendering utility used only by `Game`. It has no unit-testable logic (all methods call the Canvas 2D API). Exporting it would pollute the public surface and create a maintenance burden with no benefit.

**5. Layers draw before all entities in `Game.draw()`.**

`this._layers.forEach(l => l.draw(this._ctx))` replaces the single `drawImage("background")` call and runs before `_player`, `_enemies`, and `_bubbles` are drawn. Draw order is unchanged for entities.

**6. Boat Y position adjusted from −30 to −10.**

The new parallax ocean layer renders waves that sit higher on screen than the old flat background image. With the boat at Y = −30, the hull appeared to float above the wave crests. Moving it to Y = −10 places the hull correctly at the waterline against the new background.

## Consequences

- Adding a new scrolling layer requires: one `<img>` tag in `main.html`, one entry in the `main.css` hidden-sprite selector, and one `new Layer(...)` entry in `Game`'s `_layers` array.
- Scrolling is always leftward (simulating forward motion). Speed is not coupled to player input.
- Static layers (speedModifier 0.0) draw their image at x = 0 every frame; the second copy lands off-screen at x = width and is invisible. No wrap logic fires.
- If the canvas is resized at runtime, layer dimensions become stale (they are captured once in the constructor). A resize would require re-creating the `_layers` array.
