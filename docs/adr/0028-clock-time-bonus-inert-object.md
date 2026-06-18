# ADR 0028 - Clock Inert Object: Time-Bonus via Custom DOM Event, Positive Score, Event-Driven Animation

**Date:** 2026-06-18
**Status:** Accepted

## Context

The game needed a new interactive surface object that provides a positive gameplay benefit when caught. Unlike the five existing inert objects (`DiscardedBottle`, `RedApple`, `Wheel`, `Shoe`, `FishBone`), which all penalise the player with a negative score (−5), a floating clock offers a meaningful reward: it adds 10 seconds back to the game timer, letting a skilled player extend their run. The source asset is a single 464×360 px PNG (`images/items/clock.png`).

Five design questions arose:

1. **Hierarchy** — should `Clock` extend `InertObject` or `CatchableFish`?
2. **Time-bonus delivery** — how should `TimerSystem` learn that time needs to be added?
3. **"+10s" animation** — which system should produce the floating time-bonus popup?
4. **Score value** — should an InertObject be allowed a positive score?
5. **Clamping** — what happens when the remaining time plus the bonus exceeds the initial limit?

## Decisions

### 1. `Clock` extends `InertObject`

`InertObject` overrides `getFightSpec()` → `null`, making capture trivial (no power-bar struggle). A drifting clock on the water surface is passive — the player simply reels it in; there is no fight. Using `InertObject` gives the full `EnemyWithAnimation` capture pipeline (glow, arc, shrink) for free and keeps the class consistent with the other surface objects.

`EnemyFactory` distinguishes `InertObject` entries from `CatchableFish` entries via `Cls.prototype instanceof CatchableFish`, so no `isTrash` flag is needed in the `FISH_DEFINITIONS` entry. `FISH_SCORE_MAP` includes all definitions regardless of hierarchy, so a `Clock` with `score: 50` correctly appears as `FISH_SCORE_MAP['Clock'] = 50`.

### 2. Time-bonus delivery via `EVENT_ENEMY_CAPTURED` → `EVENT_TIME_BONUS` custom events

Three delivery mechanisms were considered:

| Option | Approach | Rejected because |
|--------|----------|-----------------|
| A | `TimerSystem.addTime(seconds)` called directly from `Hook` or `ScoreSystem` | Couples the hook/score system to `TimerSystem`'s API; breaks the existing event-only coupling model |
| B | `EVENT_ENEMY_CAPTURED` listened to directly by `TimerSystem` | `TimerSystem` is the authority on time state — it should decide when time was actually added |
| C | `EVENT_ENEMY_CAPTURED` → `TimerSystem` → `EVENT_TIME_BONUS` → `ScoreSystem` | Preserves event-only coupling; `TimerSystem` remains the authority; animation fires after time is confirmed added |

**Option C was chosen.** `TimerSystem` subscribes to `EVENT_ENEMY_CAPTURED`, filters on `enemyType === FISH_CLASS_CLOCK` (`'Clock'` — the JS class name, matching `constructor.name` in the hook event), adds `CLOCK_TIME_BONUS_SECONDS * 1000` ms (clamped to `_initialMs`), resets `_fired = false` if the timer had already expired, then dispatches `EVENT_TIME_BONUS` with `{seconds: 10, x, y}`. `ScoreSystem` listens to `EVENT_TIME_BONUS` to produce the "+10s" gold animation.

`enemyType` in `EVENT_ENEMY_CAPTURED` is `this._catch.constructor.name` (the JS class name), not the `id` string from `FISH_DEFINITIONS`. Therefore `FISH_CLASS_CLOCK = 'Clock'` is the correct filter value.

### 3. "+10s" animation rendered by `ScoreSystem`

`ScoreSystem` already owns floating animation infrastructure (the `_animations` array, the update/draw loop, alpha decay, font growth). Reusing it for the time-bonus popup requires zero new rendering code — only a new `_handleTimeBonus` listener that pushes `{text: '+10s', color: '#ffd700', ...}` into `_animations`. Gold (`#ffd700`) is chosen to distinguish the time popup from the score popup (green `#00dd55`) at a glance.

**Intentional double-popup:** When a Clock is captured, `ScoreSystem._handleCapture` fires first (via `EVENT_ENEMY_CAPTURED`, pushing a green "+50") and then `ScoreSystem._handleTimeBonus` fires (via `EVENT_TIME_BONUS`, pushing a gold "+10s"). Both animations are visible simultaneously. This is by design — the player sees both rewards at once.

### 4. Score value: `Clock = +50` (positive InertObject)

All five prior inert objects score −5, signalling "undesirable debris". The Clock is deliberately different: it is a bonus item, not a hazard. A +50 score rewards catching it, consistent with its time-bonus value. The `FISH_SCORE_MAP` infrastructure already handles positive and negative values; no code change was required to support a positive-scoring InertObject.

`rarity: FISH_RARITY_UNCOMMON` with `spawnWeight: 3` and `spawnFrequency: 200` keeps the clock relatively rare — players should feel lucky when one appears.

### 5. Clamping via `Math.min(_initialMs, _timeMs + bonus)`

Adding time uncapped would let a player accumulate time past the original limit (e.g. catch three clocks to triple the session length). The design intent is "restore lost time, not grant extra time". Therefore:

```js
this._timeMs = Math.min(this._initialMs, this._timeMs + CLOCK_TIME_BONUS_SECONDS * 1000);
```

`_initialMs` is set once in the constructor and never changes, making it the permanent ceiling. If `_timeMs` is already at `_initialMs`, catching a Clock has no net time effect (though the +50 score and "+10s" popup still fire).

Edge case: if the timer has already reached 0 and dispatched `EVENT_TIMER_TIMEUP` (`_fired = true`), catching a Clock resets `_fired = false` and adds 10 seconds, re-activating the countdown. This allows a clock caught at the last frame to save a run.

### 6. Display size: 85×110 px (`displayH: 85, displayW: 110`)

Natural aspect ratio of the source: 464/360 ≈ 1.29:1. Display ratio: 110/85 ≈ 1.29:1 (preserved). This footprint is slightly larger than `Shoe` (55×84 px) and `FishBone` (40×100 px), making the clock visually distinct and easy to spot. A single-frame sprite uses the full `naturalWidth` / `naturalHeight` in `drawImage`, identical to `Shoe` and `RedApple`.

### 7. Lane assignment: `SURFACE`, `UPPER`, `MIDDLE`

Clocks appear in the top half of the water column — they are floating objects, not deep-sea items. The lane assignment mirrors `Shoe` (`SURFACE`, `UPPER`, `MIDDLE`), ensuring the clock is reachable without a deep cast.

## Consequences

- `Clock` spawns at a random x position along the water surface and drifts horizontally at `DRIFT_SPEED_SLOW` (0.6 px/tick) with the same bob/tilt animation as `Shoe`, `Wheel`, `RedApple`, and `FishBone`.
- Catching a Clock adds 10 seconds to the game timer (clamped to the original limit) AND awards +50 score; both animations appear simultaneously.
- `TimerSystem` now subscribes to `EVENT_ENEMY_CAPTURED` and must call `destroy()` on game teardown to prevent listener leaks.
- `ScoreSystem` now subscribes to `EVENT_TIME_BONUS` and its existing `destroy()` removes this listener.
- `images/items/clock.png` (464×360 px, single frame) requires no build step.
- `src/Clock.js` must be declared before `src/EnemyFactory.js` in `main.html` (satisfied by inserting it after `FishBone.js`).
- `FISH_CLASS_CLOCK = 'Clock'` must match the JS class name exactly, since `Hook.js` dispatches `enemyType: this._catch.constructor.name`.
