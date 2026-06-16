# ADR 0016 - AudioSystem: Decoupled Event-Listener Audio Playback

**Date:** 2026-06-16
**Status:** Accepted

## Context

The game needed sound effects for three gameplay moments: casting the rod, a fish biting the hook, and the reel retracting. A naïve approach would be to call a play function directly from the spots in `Hook.js` where these transitions occur. However, `Hook` already dispatches `document` events for score tracking (via `ScoreSystem`), and coupling audio playback directly to gameplay logic would violate the single-responsibility principle and make the audio difficult to adjust, mute, or replace independently.

Three new events were introduced to capture the transitions: `EVENT_ROD_CASTED` (IDLE→CAST), `EVENT_ENEMY_HOOKED` (first tick a `CatchableFish` is hooked), and `EVENT_REEL_RETRIEVING` (CAST→RETRIEVING_EMPTY and when `setCatch()` is called).

## Decisions

### 1. `AudioSystem` is a standalone class that self-registers on `document`

`AudioSystem` follows the same pattern as `ScoreSystem` — it registers event listeners on `document` in its constructor and exposes a `destroy()` method that removes them. `Game` instantiates it alongside `ScoreSystem`. Neither `Hook` nor `Game` needs to know that audio exists; the coupling flows only from gameplay events outward to audio, never inward.

This keeps `Hook` responsible only for fishing mechanics, `ScoreSystem` responsible only for scoring, and `AudioSystem` responsible only for audio.

### 2. `document` custom events as the integration bus

`Hook` already dispatches `CustomEvent` objects on `document` for `EVENT_ENEMY_CAPTURED` and `EVENT_ENEMY_ESCAPED`, consumed by `ScoreSystem`. Extending that bus with three new events costs no architectural change. Any future system (achievements, analytics, UI feedback) can listen to the same events without touching `Hook`.

All dispatches include a `typeof document !== 'undefined'` guard so `Hook` continues to work in the Jest Node environment without modification.

### 3. `new Audio(src).play()` per event

Each SFX is played by constructing a new `Audio` instance and calling `.play()`. This is the simplest browser-native approach: no dependencies, no preloading step, and each call is independent so overlapping sounds play correctly. The `.play()` promise is silently swallowed via `.catch(() => {})` to handle the browser autoplay policy restriction without surfacing uncaught-promise errors in the console.

A `typeof Audio === 'undefined'` guard makes `_play()` a no-op in Jest, so no Audio mock is needed at the module level.

### 4. One-shot guard flag for `EVENT_ENEMY_HOOKED`

`EVENT_ENEMY_HOOKED` must fire exactly once per catch even though the `HOOK_STATUS_HOOKED` branch runs every update tick while a fish is on the line. A boolean flag `_hookedEventFired` on `Hook` is set to `true` on first dispatch and reset to `false` in both `clearCaptured()` and `setCatch()`. No flag is needed for `EVENT_ROD_CASTED` (the `spacePressed` rising-edge signal is already one-shot) or `EVENT_REEL_RETRIEVING` (the two dispatch sites — the CAST→RETRIEVING_EMPTY branch and `setCatch()` — each execute at most once per state transition).

## Alternatives Considered

### Direct SFX calls from Hook

Adding `new Audio('sfx/cast.mp3').play()` directly inside `Hook.update()` would work but couples audio playback to fishing mechanics. Muting, replacing, or removing sounds would require edits to `Hook`. Rejected in favour of the decoupled listener pattern.

### Web Audio API

`AudioContext` and `AudioBuffer` provide low-latency playback and fine-grained control (volume, panning, effects). For a casual 2D fishing game with three short SFX, the `Audio` element is sufficient and requires no setup code or buffer management. Web Audio API can be adopted later without changing the event dispatch contract — only `AudioSystem._play()` needs to change.

### Preloaded Audio pool

Preloading audio files into `Audio` objects at startup avoids the brief decode delay on first play. For these particular effects (cast, bite, reel) the delay is imperceptible, and a pool adds complexity. Deferred as a future optimisation if latency becomes audible.
