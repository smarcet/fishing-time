# ADR 0017 - TimerSystem: Countdown Timer as a Decoupled GameObject

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed a visible countdown timer that ends the round and determines the outcome (win or lose) based on the player's score. The implementation had to satisfy four constraints simultaneously: (1) the timer must draw itself to the canvas, (2) it must receive real delta-time from the game loop, (3) the win/loss decision requires the current score, and (4) all three concerns (time, score, result rendering) must remain independently changeable.

## Decisions

### 1. `TimerSystem extends GameObject`

`TimerSystem` renders directly to the canvas and participates in the `update(dt)` / `draw()` cycle alongside every other entity in the game. Extending `GameObject` is therefore the natural fit: the base class supplies `this._ctx` and `this._size` (needed to center the clock horizontally and draw at the correct canvas depth), and the `update()` / `draw()` hooks integrate seamlessly into `Game`'s existing loop with zero extra plumbing.

The alternative -- a standalone class with `draw(ctx)` and `update(dt)` receiving parameters -- would work but would break consistency with every other entity in the codebase (`Player`, `Bubble`, `Hook`, `Enemy`, and their subclasses all extend `GameObject`). A timer that draws to the canvas is an active game-world entity by definition.

By contrast, `ScoreSystem` and `AudioSystem` are NOT `GameObject` subclasses because they are pure HUD/audio: they never draw to the canvas with `this._ctx`, so `GameObject`'s canvas-aware constructor would add no value.

### 2. Emit `EVENT_TIMER_TIMEUP` rather than deciding win/loss inside `TimerSystem`

`TimerSystem` knows only one thing: how much time remains. It does not know the current score, the required score, or what "winning" means for this game mode. Embedding that logic inside `TimerSystem` would couple the timer to scoring rules that belong to `Game`.

Dispatching `EVENT_TIMER_TIMEUP` on `document` mirrors the existing event-bus pattern used throughout the codebase (`EVENT_ENEMY_CAPTURED`, `EVENT_ENEMY_HOOKED`, `EVENT_REEL_POWER_CHANGED`, etc.). Any future listener -- analytics, achievements, a restart screen -- can react to the same event independently without touching `TimerSystem`. A `_fired` flag ensures the event dispatches exactly once even if `update(dt)` is called after `_timeMs` reaches zero.

### 3. `Game` owns win/loss resolution

`Game` already holds references to both `_scoreSystem` and `_timerSystem`. It is the natural aggregation point for end-of-game logic: it compares `_scoreSystem.getScore()` against `GAME_NEEDED_SCORE` (a game-balance constant in `constants.js`) and records the result in `_gameResult`. No coupling is introduced between `ScoreSystem` and `TimerSystem` -- they remain completely unaware of each other.

`GAME_NEEDED_SCORE` lives in `constants.js` alongside other tunable values (`HOOK_REEL_SPEED`, `BUBBLE_BATCH_SIZE`, etc.) so that designers can adjust the score threshold without touching game logic.

### 4. Game loop freezes on game-over; draw loop continues

When `_gameResult` is set, `Game.update()` returns early (after calling `this._timerSystem.update(dt)` so the timer's own state settles cleanly). Enemies stop moving, hooks stop being cast, and score events stop firing -- the world is frozen. The draw loop continues unconditionally so that the `_drawGameResult()` overlay remains visible.

This is the minimum change needed to make the game feel stopped. A full state machine (PLAYING / PAUSED / GAME_OVER states) would provide a cleaner restart path but adds complexity that is not required by the current feature set. The `Game.destroy()` method removes the `EVENT_TIMER_TIMEUP` listener so that re-instantiating `Game` (e.g., a future restart feature or test setup) does not accumulate stale listeners.

## Alternatives Considered

### `setInterval` or `Date.now()` inside `TimerSystem`

A self-contained interval timer is simple but runs independently of the game loop. If the tab is backgrounded or the frame rate drops, `setInterval` continues ticking at wall-clock speed while `requestAnimationFrame` pauses -- the timer could reach zero while the game visually lags behind. Using `dt` from `requestAnimationFrame` keeps the timer in lockstep with the render loop and benefits from the same tab-visibility pause behavior.

### Timer as a plain HUD overlay (not a `GameObject`)

A standalone class with `update(dt, game)` and `draw(ctx)` parameters would avoid `extends GameObject`. However, it would break the pattern that every drawable, updatable entity in this codebase extends `GameObject`. Passing `ctx` and `size` as parameters to every method duplicates what `GameObject` already provides via `this._ctx` and `this._size`. The constructor signature difference is minor; the consistency benefit is clear.

### `TimerSystem` decides win/loss directly

If `TimerSystem` held a reference to `ScoreSystem`, it could compare scores internally and call a callback or set a property on `Game`. This creates a direct dependency between `TimerSystem` and `ScoreSystem` -- two systems that otherwise have nothing to do with each other. The event-bus dispatch keeps them decoupled and matches the architectural convention already established by `ScoreSystem`, `AudioSystem`, and `ReelPowerBar`.
