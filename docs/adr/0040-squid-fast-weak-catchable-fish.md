# ADR-0040: Squid — Fast, Weak Catchable Fish with High Reward

**Date:** 2026-06-19
**Status:** Accepted

## Context

All existing deep-lane fish (SwordFish, Barracuda) combine high speed with significant fight
strength. The Squid introduces a different risk profile: it is the fastest fish in the game
(tying AnglerFlish at 5.6 px/tick) making it very hard to hook, but once on the hook it
barely resists — rewarding the player handsomely (250 points) if they can land it.

This inverts the usual "fast = dangerous fight" assumption and creates a new gameplay moment:
the challenge is entirely in the cast and hook placement, not in the reel-in phase.

## Requirement Interpretation

The user's request was written in Spanish; the phrases were resolved as follows:

| Phrase | Interpreted as | Rationale |
|--------|---------------|-----------|
| "es core debe ser 250" | `score: 250` | Literal — the user stated the score value directly. |
| "no tener casi fuerza" | `strength: 2` | Lowest meaningful non-zero value. `Hook.js:159`: `escapeProgress += strength * escapeRate * dtSec`. At strength 2 and escapeRate 1.0, the escape bar fills at 2 units/sec — effectively never reaches the 100-unit cap during a normal reel-in. |
| "ser muy rapido" / speed question answered "Match AnglerFlish (5.6)" | `speedMax: SQUID_DRIFT_SPEED = 5.6` | Ties AnglerFlish as the fastest swim speed in the game. Makes the squid hard to intercept with the hook. |
| Rarity/lane question answered "RARE, deep only" | `rarity: FISH_RARITY_RARE`, `lanes: [FISH_LANE_DEEP]` | RARE cadence (spawnFrequency 390) mirrors SwordFish and Barracuda. Deep lane only — stays out of the upper-water zone. |

## Decision

Add a new `CatchableFish` subclass `Squid` with the following parameters:

| Parameter | Value | Notes |
|-----------|-------|-------|
| `score` | `250` | High reward for a hard-to-hook target |
| `strength` | `2` | "casi sin fuerza" — nearly un-escapable once hooked |
| `escapeRate` | `1.0` | Combined with strength 2: minimal escape pressure |
| `lanes` | `[FISH_LANE_DEEP]` | Deep lane only |
| `rarity` | `FISH_RARITY_RARE` | Same cadence as SwordFish / Barracuda |
| `captureRotation` | `-15` | Elongated body — same hang angle as SwordFish/Barracuda |
| `struggleSpeed / RotationAmplitude / OffsetAmplitude` | `0.06 / 8 / 3` | Gentler than SwordFish (0.08/14/6) — matches the weak-fight feel |
| `displayH / displayW` | `58 / 240` | ~4.1:1 aspect ratio, matches frame geometry |
| `frameH / frameW` | `222 / 910` | Sprite is 2731x445, 3 cols x 2 rows (floored to avoid edge bleed) |
| `maxFrameX / maxFrameY` | `3 / 1` | Row 0 = swim animation (3 frames) |
| `dieFrameX / dieFrameY` | `0 / 1` | Row 1 = die/captured frame |
| `SQUID_DRIFT_SPEED` | `5.6 px/tick` | Ties AnglerFlish — current top speed |
| `speedMin` | `5.0 px/tick` | Narrow speed band; always fast |
| `spawnFrequency` | `390` | RARE tier, same as SwordFish/Barracuda |

### Class hierarchy

Extends plain `CatchableFish` (not `PremiumCatchableFish`). The premium subclass adds a
rim-glint sparkle effect intended for legendarily-rare reward fish. The Squid is RARE, not
LEGENDARY — no sparkle.

### Sprite orientation — left-facing (same as SwordFish)

The Squid spritesheet (`squid_sprite.png`, 2731x445) has the squid facing **LEFT**, identical
to SwordFish. The `draw()` method uses the same flip rule as SwordFish:

```js
// sprite assumed to face LEFT; flip when direction is 1 (going right)
const flipX = this._direction === 1 ? -1 : 1;
```

`Squid.js` is a near-verbatim copy of `SwordFish.js` — only the class name and the drift
speed constant differ. This is intentional: the duplicate-file pattern is how every other
species is structured in this codebase.

### CSS hiding

The `#squid_sprite` id was appended to the existing `display: none;` selector in `main.css`,
consistent with every other sprite in the game. The `<img>` tag remains in the DOM so
`EnemyFactory` can resolve it via `document.getElementById('squid_sprite')`.

## Consequences

- Players in the deep lane will occasionally encounter a very fast, easy-to-land squid.
  The challenge shifts entirely to cast accuracy: if you hook it, you collect 250 points
  almost automatically.
- `FISH_DEFINITIONS` now contains 22 entries (was 21). `score-system.test.js` count updated
  accordingly.
- A future enhancement could give the squid an ink-cloud escape mechanic (temporarily
  obscuring the hook position) — out of scope for this ADR.
