# ADR 0011 - ReelPowerBar: Custom-Event HUD Decoupling

**Date:** 2026-06-16
**Status:** Accepted

## Context

When a `CatchableFish` is hooked, the player must tap Space repeatedly to prevent the fish's escape progress from reaching its ceiling. Before this ADR, there was no visual feedback about how close the fish was to escaping. A `ReelPowerBar` HUD component was needed to display this state as a red-to-green horizontal bar.

The simplest implementation would have `ReelPowerBar` read `hook._escapeProgress` and `HOOK_STRUGGLE_MAX_ESCAPE` directly from a reference to `Hook`. That approach creates a tight dependency: `ReelPowerBar` must know the internal field names, the normalisation formula, and when the fight is active. Any refactor of `Hook`'s internal representation would force a matching change in the HUD. It also makes the HUD untestable without a full `Hook` mock.

`ScoreSystem` and `AudioSystem` already demonstrate a clean alternative: register `document` event listeners in the constructor, react to normalised payloads, and expose a `destroy()` method that removes them. The same pattern fits `ReelPowerBar` exactly.

## Decisions

### 1. Normalised `reelPowerChanged` event dispatched per-frame from `Hook`

`Hook.update()` dispatches a `reelPowerChanged` `CustomEvent` on `document` every tick while a `CatchableFish` is hooked and has not yet escaped. The payload is a single normalised float:

```js
{ power: 1 - Math.min(1, this._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE) }
```

`power = 1.0` means the fish is securely held (escape progress = 0); `power = 0.0` means the fish is about to escape (escape progress >= ceiling). The receiver never needs to know the raw integer values or the ceiling constant.

The dispatch is placed in an explicit `else if` branch after the escape-threshold block, making it structurally impossible to fire on the frame the fish actually escapes.

### 2. `ReelPowerBar` as a standalone class following the `ScoreSystem` pattern

`ReelPowerBar` does not extend `GameObject`. It has no `getPosition()`, `getSize()`, or collision surface. It only needs `update()` (no-op — all state is event-driven), `draw(ctx)`, and `destroy()`. This mirrors `ScoreSystem` and `AudioSystem`, which are the established pattern for HUD components in this codebase.

`Game` instantiates `ReelPowerBar` alongside `ScoreSystem`, calls `update()` and `draw()` each frame, and never inspects its state.

Bound handler references are stored as instance properties (`this._handlePowerChanged`, `this._handleHookIdle`) so `removeEventListener` in `destroy()` matches the exact function reference registered at construction — the same requirement as `AudioSystem`.

### 3. Visibility driven by `EVENT_HOOK_IDLE` rather than a `Hook` getter

`ReelPowerBar` becomes visible on the first `reelPowerChanged` event it receives and invisible when `hookIdle` fires. `EVENT_HOOK_IDLE` is already dispatched by `Hook` on every exit from the hooked state: fish capture, fish escape, and empty-reel return. This covers all hide cases without `ReelPowerBar` holding a reference to `Hook` or calling any getter on it.

Non-`CatchableFish` catches (e.g. `DiscardedBottle`) never trigger `reelPowerChanged`, so the bar stays hidden automatically during those reels.

## Consequences

- `Hook` can be refactored — internal field names, the escape formula, the ceiling constant — without touching `ReelPowerBar`, as long as the normalised `power` float in the event payload is preserved.
- Multiple HUD components can independently consume `reelPowerChanged` without coupling to each other or to `Hook`.
- `ReelPowerBar` is fully unit-testable with a plain listener-map mock; no `Hook` instance is required.
- One extra `dispatchEvent` call per frame fires during a fish fight. This is negligible compared to the canvas draw calls already happening every frame.

## Known Pre-Existing Violation

`EnemyWithAnimation.js` (line 83) reads `this._hook._escapeProgress` directly to compute a glow-colour intensity during the struggle animation. This is a pre-existing coupling that predates this ADR. A future migration could replace that access with a `reelPowerChanged` listener or a normalised public getter on `Hook`, but that refactor is out of scope for this plan.
