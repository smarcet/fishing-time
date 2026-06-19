# ADR-0039: Barracuda — Deep-Lane Trap Fish with Negative Score

**Date:** 2026-06-19
**Status:** Accepted

## Context

The game previously rewarded the player for every successful catch. Adding a "trap" species —
one that is *fightable* (a `CatchableFish`) but *penalises* a successful catch — introduces a
risk/decision layer: should the player reel in a strong fight knowing they will lose 100 points
if they land it, or let the line go slack?

The Barracuda fills this role. It is a sleek, fast-moving deep-lane predator that looks like a
rewarding target but subtracts 100 points on capture.

## Requirement Interpretation

The user's request contained three ambiguous phrases; these were resolved as follows:

| Phrase | Interpreted as | Rationale |
|--------|---------------|-----------|
| "release date del 2" | `escapeRate: 2` | No `releaseDate` field exists in the codebase. `escapeRate` is the only per-species numeric knob that carries a "2" equivalent — SwordFish (RARE, deep lane) uses `escapeRate: 2.0`. |
| "bastante fuerte" | `strength: 55` | Above SwordFish (50), below Shark (60, current maximum). Produces a noticeably harder fight without being the single hardest species. |
| "rotacion similar al sword fish" | `captureRotation: -15` | Copied exactly from the SwordFish entry in `FISH_DEFINITIONS` (`constants.js` line 586). |

## Decision

Add a new `CatchableFish` subclass `Barracuda` with the following parameters:

| Parameter | Value | Notes |
|-----------|-------|-------|
| `score` | `-100` | Negative — subtracts on capture |
| `strength` | `55` | "bastante fuerte"; above SwordFish |
| `escapeRate` | `2` | Mirrors SwordFish |
| `lanes` | `[FISH_LANE_DEEP]` | Deep lane only |
| `rarity` | `FISH_RARITY_RARE` | Occasional encounter; same cadence as SwordFish |
| `captureRotation` | `-15` | Swordfish-style hang angle |
| `struggleSpeed / RotationAmplitude / OffsetAmplitude` | `0.08 / 14 / 6` | Mirrors SwordFish |
| `displayH / displayW` | `90 / 360` | 4:1 aspect, medium size |
| `frameH / frameW` | `128 / 512` | Sprite is 2048x256, 4 cols x 2 rows |
| `BARRACUDA_DRIFT_SPEED` | `5.5 px/tick` | Faster than SwordFish (4.5), approaching AnglerFlish (5.6) |
| `spawnFrequency` | `390` | Matches SwordFish (RARE) |

### Class hierarchy

Extends plain `CatchableFish` (not `PremiumCatchableFish`). The premium subclass adds a
rim-glint sparkle effect (ADR-0034) intended for high-value reward fish; applying it to a
negative-score trap fish would send the wrong visual signal to players.

### Sprite orientation — right-facing flip

The Barracuda spritesheet (`barracuda_sprite.png`, 2048x256) has the fish facing **RIGHT**,
opposite to SwordFish (which faces left). The `draw()` method therefore inverts the flip
logic compared to SwordFish:

```js
// SwordFish (faces LEFT): flip when going right
const flipX = this._direction === 1 ? -1 : 1;

// Barracuda (faces RIGHT): flip when going left
const flipX = this._direction === 1 ? 1 : -1;
```

This matches the AnglerFlish / right-facing convention already established in the codebase.

### Score pipeline — negative score support

The existing score pipeline already supports negative values without modification:

- `ScoreSystem._handleCapture` applies `this._score += pts` unconditionally (pts = -100).
- The HUD renders negative totals in red (`ScoreSystem.js:128`).
- `_handleEscape` and `_handleEvade` are both guarded by `pts > 0`, so a Barracuda that
  escapes or evades produces **no** score change — correct behaviour (no perverse reward for
  losing the fight).
- The floating capture animation text uses `ANIM_COLOR_NEGATIVE` for `pts <= 0`, showing
  "-100" in red.

### CSS hiding

The `#barracuda_sprite` id was appended to the existing `display: none;` selector in
`main.css` (line 77), consistent with every other sprite in the game. The `<img>` tag exists
in the DOM so `EnemyFactory` can resolve it via `document.getElementById(def.domId)`.

## Consequences

- Players encountering a Barracuda face a genuine dilemma: the fight is strong and
  time-consuming, and landing it is worse than ignoring it.
- A future UI enhancement could add a visual "danger" indicator to distinguish trap fish from
  reward fish before the fight begins — that is out of scope for this ADR.
- `FISH_DEFINITIONS` now contains 21 entries (was 20). `score-system.test.js` count updated
  accordingly.
