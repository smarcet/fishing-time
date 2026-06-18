# ADR 0025 - Fish Traffic Model: Lane Spawning, Rarity, and Configuration-Driven Population

**Date:** 2026-06-16
**Status:** Accepted (Decision 7 superseded by ADR-0027)

## Context

The game originally treated fish and capturable objects as a fixed population. `Game` created a static set of enemies at startup, `Enemy.update()` reversed direction at horizontal screen boundaries, and those entities remained in play indefinitely unless captured or escaped.

That model made the water feel predictable: the same enemies patrolled the same space, bounced at the edges, and rarely created the sense of fresh opportunities entering the playfield. Commercial arcade redemption fishing games use a traffic model instead. Fish enter from offscreen, cross the visible playfield, exit, despawn, and are replaced by new traffic.

The redesign also needed to include the full current roster, including species and objects not listed in the first request: `ButterflyFish`, `Wheel`, `Shoe`, and `FishBone`. The inert objects (`RedApple`, `DiscardedBottle`, `Wheel`, `Shoe`, and `FishBone`) remain trash/hazard catches: no resistance, automatic retrieval, and negative score.

## Decisions

### 1. Replace patrol/bounce with traffic lifecycle

Fish and objects no longer reverse at screen edges. `Enemy.update()` only applies the assigned horizontal velocity, and `isOffScreen()` reports true after a full horizontal exit regardless of escape state.

The lifecycle is now:

```
spawn offscreen -> cross playfield -> leave visible bounds -> despawn
```

Escaped hook fish keep their existing escape acceleration and score penalty behavior, but normal traffic exits do not count as evades.

### 2. Add a dedicated `FishSpawner`

`FishSpawner` owns lane timers, weighted species selection, offscreen placement, runtime speed assignment, species cooldowns, and initial pre-seeding. `Game` owns the live enemy list and asks the spawner for newly spawned enemies each update tick.

This keeps population logic out of `Game.js`, which already coordinates rendering, player input, collisions, bubbles, score, and timers.

### 3. Introduce horizontal lanes

The playfield is split into named horizontal lanes:

| Lane | Direction | Role |
|------|-----------|------|
| Surface | left to right | high-volume low-reward fish and floating trash |
| Upper | right to left | common fish and light hazards |
| Middle | left to right | mixed common/uncommon traffic |
| Deep | right to left | stronger mid/high-value species |
| Bottom | left to right | rare, high-reward, high-resistance species plus seabed hazards |

Alternating directions create visible cross-traffic without per-species movement rules. Lane y-ranges are fractional so the system adapts to the live canvas height; the spawner clamps large entities so they remain within the visible canvas when possible.

### 4. Use rarity tiers and weighted spawning

Each configured species has a rarity tier and spawn weight:

| Rarity | Intended behavior |
|--------|-------------------|
| Common | frequent, low reward or trash |
| Uncommon | regular, moderate reward/resistance |
| Rare | occasional, high reward/resistance |
| Epic | scarce, high reward |
| Legendary | very scarce, highest spectacle |

The spawner filters by lane eligibility, removes species still on cooldown, and then performs weighted random selection. This allows common traffic to stay busy while high-value deep/bottom species remain memorable.

### 5. Make `FISH_DEFINITIONS` the population source of truth

`src/constants.js` now contains the full traffic roster in `FISH_DEFINITIONS`. Each entry carries:

```js
{
  id,
  className,
  rarity,
  lanes,
  score,
  strength,
  escapeRate,
  speedMin,
  speedMax,
  spawnWeight,
  spawnFrequency,
  maxActive, // optional
}
```

`FISH_SCORE_MAP` is derived from this table so `ScoreSystem` keeps a single authoritative score lookup keyed by class name. `strength` and `escapeRate` are propagated into entity instances by `EnemyFactory.createEnemy()` via `instanceof CatchableFish` — no separate `FISH_SPECS` lookup table exists. `InertObject` entries omit `frameH`/`frameW`/`maxFrameX`/`maxFrameY`/`dieFrameX`/`dieFrameY` and use `maxFrames` instead; `EnemyFactory` distinguishes them by `Cls.prototype instanceof CatchableFish`.

### 6. Preserve habitat-specific species assignment

Species are assigned to lanes according to habitat and risk/reward:

- Surface/upper lanes carry high-volume targets and trash/hazards.
- Middle lanes mix common targets with moderate-value fish.
- Deep/bottom lanes carry stronger and rarer species such as `Crab`, `Octopus`, `SwordFish`, `Shark`, and `HammerHeadShark`.
- `Crab` is constrained to the bottom lane with an active cap so it behaves like an occasional seabed reward target instead of normal crowd traffic.

This gives the hook depth a clearer strategic meaning: deeper targets generally carry more reward and more resistance, but appear less frequently.

### 7. New species are added through configuration after factory support exists

> **Superseded by ADR-0027.** The `EnemyFactory` branch described here was eliminated when the factory was made fully data-driven. A single `FISH_DEFINITIONS` entry (now including render geometry) is sufficient — no separate factory code is required.

Once an enemy class and `EnemyFactory` branch exist, the traffic system needs only a new definition entry:

```js
{
  id: ENEMY_TYPE_NEW_FISH,
  className: FISH_CLASS_NEW_FISH,
  rarity: FISH_RARITY_RARE,
  lanes: [FISH_LANE_DEEP, FISH_LANE_BOTTOM],
  score: 300,
  strength: 45,
  escapeRate: 2.4,
  speedMin: 2.5,
  speedMax: 3.5,
  spawnWeight: 2,
  spawnFrequency: 420,
  maxActive: 1, // optional cap for rare showcase targets
}
```

`FishSpawner`, `Game`, `Hook`, and `ScoreSystem` do not need species-specific logic changes for traffic behavior, scoring, or fight strength after the factory can instantiate the type.

## Alternatives Considered

### Keep bounce patrols and add random respawn

This would preserve the old movement model while occasionally changing the roster. It was rejected because visible boundary reversals still make fish feel like permanent world entities instead of passing traffic.

### Global random spawn table without lanes

A single weighted table would be simpler, but it would scatter species vertically and weaken the risk/reward relationship between depth and value. It also makes habitat rules harder to inspect.

### Per-class spawn logic

Each fish class could own its own lanes, speeds, and spawn rates. This was rejected because adding species would require touching movement/spawn logic in multiple files and would duplicate the same weighted selection behavior.

### Configuration-backed lane traffic

This is the chosen model. It centralizes the population rules, gives the water a continuous arcade traffic flow, and keeps future species additions local to configuration plus factory support.

## Consequences

- The water feels busier because traffic is continuously entering and leaving the playfield.
- Fish no longer feel like permanent patrol entities.
- The full roster, including inert objects not in the initial list, participates in traffic.
- Normal traffic exits no longer produce evade penalties; only fish that escaped from the hook can trigger that penalty path.
- Spawn behavior is easier to tune through constants, but there is more configuration to maintain.
- The factory can no longer silently return `Octopus` for a configured but unhandled id; roster/factory drift is tested directly.
- New traffic constants are named in `src/constants.js` so spawn behavior is discoverable and avoids hidden magic values.
